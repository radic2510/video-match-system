package com.videomatch.processing.client

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.videomatch.processing.dto.*
import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.web.reactive.function.client.WebClient
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * Tests for MLServiceClient
 * Uses MockWebServer to test HTTP interactions
 */
class MLServiceClientTest {

    private lateinit var mockWebServer: MockWebServer
    private lateinit var mlServiceClient: MLServiceClient
    private lateinit var objectMapper: ObjectMapper

    @BeforeEach
    fun setup() {
        mockWebServer = MockWebServer()
        mockWebServer.start()

        val baseUrl = mockWebServer.url("/").toString().removeSuffix("/")
        val webClient = WebClient.builder().baseUrl(baseUrl).build()

        objectMapper = jacksonObjectMapper()
        mlServiceClient = MLServiceClient(
            webClient = webClient,
            mlServiceUrl = baseUrl,
            detectDisplayPath = "/api/v1/inference/detect-display",
            matchAdvertisementPath = "/api/v1/inference/match-advertisement",
            healthPath = "/health",
            timeoutSeconds = 5L,
            maxRetries = 3,
            retryDelayMs = 100L
        )
    }

    @AfterEach
    fun tearDown() {
        mockWebServer.shutdown()
    }

    @Test
    fun `matchAdvertisement should return successful match`() = runBlocking {
        // Given: ML Service returns successful match
        val videoId = UUID.randomUUID()
        val response = MLMatchResponse(
            matched = true,
            bestMatch = BestMatch(
                videoId = videoId,
                frameNumber = 234,
                confidence = 0.94,
                scores = VerificationScores(
                    embedding = 0.92,
                    sift = 0.95,
                    color = 0.88,
                    text = 0.91
                )
            ),
            alternativeCandidates = emptyList(),
            processingStages = ProcessingStages(
                displayDetection = 45,
                perspectiveCorrection = 30,
                qualityAssessment = 10,
                qualityEnhancement = null,
                embeddingExtraction = 35,
                vectorSearch = 50,
                verification = 100
            ),
            totalInferenceTimeMs = 270
        )

        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .setBody(objectMapper.writeValueAsString(response))
        )

        // When: Calling matchAdvertisement
        val imageData = "test-image-data".toByteArray()
        val result = mlServiceClient.matchAdvertisement(imageData, topK = 30)

        // Then: Result should match expected response
        assertNotNull(result)
        assertTrue(result.matched)
        assertNotNull(result.bestMatch)
        assertEquals(videoId, result.bestMatch?.videoId)
        assertEquals(234, result.bestMatch?.frameNumber)
        assertEquals(0.94, result.bestMatch?.confidence)
        assertEquals(270, result.totalInferenceTimeMs)

        // Verify request
        val recordedRequest = mockWebServer.takeRequest()
        assertEquals("/api/v1/inference/match-advertisement", recordedRequest.path)
        assertEquals("POST", recordedRequest.method)
        assertTrue(recordedRequest.body.size > 0) // Should contain multipart data
    }

    @Test
    fun `matchAdvertisement should return no match found`() = runBlocking {
        // Given: ML Service returns no match
        val response = MLMatchResponse(
            matched = false,
            bestMatch = null,
            alternativeCandidates = emptyList(),
            processingStages = null,
            totalInferenceTimeMs = 250
        )

        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .setBody(objectMapper.writeValueAsString(response))
        )

        // When: Calling matchAdvertisement
        val imageData = "test-image-data".toByteArray()
        val result = mlServiceClient.matchAdvertisement(imageData)

        // Then: Result should indicate no match
        assertNotNull(result)
        assertFalse(result.matched)
        assertEquals(null, result.bestMatch)
    }

    @Test
    fun `matchAdvertisement should throw exception on ML error`() = runBlocking {
        // Given: ML Service returns error
        val errorResponse = MLErrorResponse(
            error = MLError(
                code = "DISPLAY_NOT_DETECTED",
                message = "No display detected in the image",
                details = mapOf("confidenceThreshold" to 0.7),
                recoverable = false,
                timestamp = "2025-01-15T10:00:00Z"
            )
        )

        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(500)
                .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .setBody(objectMapper.writeValueAsString(errorResponse))
        )

        // When/Then: Should throw exception
        val imageData = "test-image-data".toByteArray()
        assertThrows<Exception> {
            mlServiceClient.matchAdvertisement(imageData)
        }
    }

    @Test
    fun `matchAdvertisementWithRetry should retry on temporary failure`() = runBlocking {
        // Given: First request fails, second succeeds
        val videoId = UUID.randomUUID()
        val successResponse = MLMatchResponse(
            matched = true,
            bestMatch = BestMatch(
                videoId = videoId,
                frameNumber = 100,
                confidence = 0.85,
                scores = VerificationScores(
                    embedding = 0.85,
                    sift = null,
                    color = null,
                    text = null
                )
            ),
            alternativeCandidates = null,
            processingStages = null,
            totalInferenceTimeMs = 200
        )

        // First request fails with 503
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(503)
                .setBody("Service temporarily unavailable")
        )

        // Second request succeeds
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .setBody(objectMapper.writeValueAsString(successResponse))
        )

        // When: Calling matchAdvertisementWithRetry
        val imageData = "test-image-data".toByteArray()
        val result = mlServiceClient.matchAdvertisementWithRetry(imageData)

        // Then: Should succeed after retry
        assertNotNull(result)
        assertTrue(result.matched)
        assertEquals(videoId, result.bestMatch?.videoId)

        // Verify two requests were made
        assertEquals(2, mockWebServer.requestCount)
    }

    @Test
    fun `checkHealth should return healthy status`() = runBlocking {
        // Given: ML Service is healthy
        val healthResponse = MLHealthResponse(
            status = "healthy",
            models = mapOf(
                "yolov8" to "loaded",
                "clip" to "loaded",
                "dino" to "loaded"
            ),
            gpu = GPUStatus(
                available = true,
                deviceName = "NVIDIA RTX 3080",
                memoryUsed = 3000,
                memoryTotal = 10240,
                utilization = 45
            ),
            cache = CacheStatus(
                memoryEntries = 5000,
                diskSizeGB = 15.5,
                hitRate = 0.85
            )
        )

        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .setBody(objectMapper.writeValueAsString(healthResponse))
        )

        // When: Checking health
        val result = mlServiceClient.checkHealth()

        // Then: Should return healthy status
        assertNotNull(result)
        assertEquals("healthy", result.status)
        assertNotNull(result.gpu)
        assertTrue(result.gpu!!.available)
        assertEquals(45, result.gpu!!.utilization)

        // Verify request
        val recordedRequest = mockWebServer.takeRequest()
        assertEquals("/health", recordedRequest.path)
        assertEquals("GET", recordedRequest.method)
    }

    @Test
    fun `checkHealth should return unhealthy status when service is down`() = runBlocking {
        // Given: ML Service returns unhealthy status
        val healthResponse = MLHealthResponse(
            status = "unhealthy",
            models = mapOf(
                "yolov8" to "failed"
            ),
            gpu = null,
            cache = null
        )

        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(503)
                .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .setBody(objectMapper.writeValueAsString(healthResponse))
        )

        // When: Checking health
        val result = mlServiceClient.checkHealth()

        // Then: Should return unhealthy status
        assertNotNull(result)
        assertEquals("unhealthy", result.status)
    }

    @Test
    fun `matchAdvertisement should handle network timeout`() = runBlocking {
        // Given: Server doesn't respond in time
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBodyDelay(10, java.util.concurrent.TimeUnit.SECONDS) // Longer than timeout
        )

        // When/Then: Should throw timeout exception
        val imageData = "test-image-data".toByteArray()
        assertThrows<Exception> {
            mlServiceClient.matchAdvertisement(imageData)
        }
    }
}
