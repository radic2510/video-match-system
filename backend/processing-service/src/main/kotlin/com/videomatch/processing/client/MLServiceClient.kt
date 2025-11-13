package com.videomatch.processing.client

import com.videomatch.common.exception.MLServiceException
import com.videomatch.processing.dto.MLHealthResponse
import com.videomatch.processing.dto.MLMatchResponse
import kotlinx.coroutines.delay
import kotlinx.coroutines.reactive.awaitFirst
import mu.KotlinLogging
import org.springframework.beans.factory.annotation.Value
import org.springframework.core.io.ByteArrayResource
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.client.MultipartBodyBuilder
import org.springframework.stereotype.Component
import org.springframework.web.reactive.function.BodyInserters
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.reactive.function.client.WebClientResponseException
import org.springframework.web.reactive.function.client.awaitBody
import org.springframework.web.reactive.function.client.bodyToMono
import reactor.util.retry.Retry
import java.time.Duration

private val logger = KotlinLogging.logger {}

/**
 * Client for communicating with ML Service
 * Handles image upload and inference requests with retry logic
 */
@Component
class MLServiceClient(
    private val webClient: WebClient,
    @Value("\${ml-service.url}") private val mlServiceUrl: String,
    @Value("\${ml-service.api.detect-display}") private val detectDisplayPath: String,
    @Value("\${ml-service.api.match-advertisement}") private val matchAdvertisementPath: String,
    @Value("\${ml-service.api.health}") private val healthPath: String,
    @Value("\${ml-service.timeout-seconds}") private val timeoutSeconds: Long,
    @Value("\${ml-service.max-retries}") private val maxRetries: Int,
    @Value("\${ml-service.retry-delay-ms}") private val retryDelayMs: Long
) {

    /**
     * Match image against advertisement database
     * @param imageData Image bytes
     * @param topK Number of top candidates to return (default 30)
     * @return Match response with best match and alternatives
     * @throws MLServiceException on inference errors
     */
    suspend fun matchAdvertisement(imageData: ByteArray, topK: Int = 30): MLMatchResponse {
        logger.debug { "Sending match request to ML Service (topK=$topK, imageSize=${imageData.size} bytes)" }

        return try {
            val bodyBuilder = MultipartBodyBuilder()
            bodyBuilder.part("image", object : ByteArrayResource(imageData) {
                override fun getFilename(): String = "image.jpg"
            })
            bodyBuilder.part("topK", topK)

            val response = webClient.post()
                .uri(matchAdvertisementPath)
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(bodyBuilder.build()))
                .retrieve()
                .awaitBody<MLMatchResponse>()

            logger.info { "ML Service match result: matched=${response.matched}, inferenceTime=${response.totalInferenceTimeMs}ms" }
            response

        } catch (e: WebClientResponseException) {
            logger.error(e) { "ML Service request failed: ${e.statusCode} - ${e.responseBodyAsString}" }
            throw MLServiceException("ML Service request failed: ${e.message}", e)
        } catch (e: Exception) {
            logger.error(e) { "Unexpected error calling ML Service" }
            throw MLServiceException("Unexpected error calling ML Service: ${e.message}", e)
        }
    }

    /**
     * Match image against advertisement database with retry logic
     * Retries on temporary failures (5xx errors)
     */
    suspend fun matchAdvertisementWithRetry(imageData: ByteArray, topK: Int = 30): MLMatchResponse {
        var lastException: Exception? = null
        repeat(maxRetries) { attempt ->
            try {
                return matchAdvertisement(imageData, topK)
            } catch (e: MLServiceException) {
                lastException = e
                logger.warn { "ML Service request failed (attempt ${attempt + 1}/$maxRetries): ${e.message}" }

                // Check if the underlying cause is a 5xx error (recoverable)
                val cause = e.cause
                val isRecoverable = cause is WebClientResponseException && cause.statusCode.is5xxServerError

                if (isRecoverable && attempt < maxRetries - 1) {
                    logger.info { "Retrying in ${retryDelayMs}ms..." }
                    delay(retryDelayMs * (attempt + 1)) // Exponential backoff
                } else if (!isRecoverable) {
                    // Non-recoverable error, don't retry
                    throw e
                }
            } catch (e: Exception) {
                // Unexpected exception
                lastException = e
                logger.error(e) { "Unexpected error during ML Service request" }
                throw MLServiceException("Unexpected error calling ML Service", e)
            }
        }

        // All retries exhausted
        throw MLServiceException("ML Service request failed after $maxRetries retries", lastException)
    }

    /**
     * Check ML Service health status
     * @return Health response with model and GPU status
     */
    suspend fun checkHealth(): MLHealthResponse {
        logger.debug { "Checking ML Service health" }

        return try {
            val response = webClient.get()
                .uri(healthPath)
                .retrieve()
                .awaitBody<MLHealthResponse>()

            logger.debug { "ML Service health status: ${response.status}" }
            response

        } catch (e: WebClientResponseException) {
            logger.warn { "ML Service health check failed: ${e.statusCode}" }
            // Return unhealthy status instead of throwing
            MLHealthResponse(
                status = "unhealthy",
                models = null,
                gpu = null,
                cache = null
            )
        } catch (e: Exception) {
            logger.error(e) { "Failed to check ML Service health" }
            MLHealthResponse(
                status = "unhealthy",
                models = null,
                gpu = null,
                cache = null
            )
        }
    }
}
