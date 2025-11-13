package com.videomatch.processing.client

import com.videomatch.processing.dto.MatchDTO
import com.videomatch.processing.dto.UpdateMatchResultRequest
import com.videomatch.processing.dto.UpdateMatchStatusRequest
import kotlinx.coroutines.reactive.awaitFirst
import mu.KotlinLogging
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.reactive.function.client.awaitBody
import java.util.UUID

private val logger = KotlinLogging.logger {}

/**
 * Client for communicating with Core Service
 * Handles fetching queued matches and updating their status/results
 */
@Component
class CoreServiceClient(
    private val webClient: WebClient,
    @Value("\${core-service.url}") private val coreServiceUrl: String,
    @Value("\${core-service.api.matches-queue}") private val matchesQueuePath: String,
    @Value("\${core-service.api.matches-status}") private val matchesStatusPath: String,
    @Value("\${core-service.api.matches-result}") private val matchesResultPath: String
) {

    /**
     * Get all queued matches from Core Service
     * @return List of matches in QUEUED status, sorted by priority
     */
    suspend fun getQueuedMatches(): List<MatchDTO> {
        logger.debug { "Fetching queued matches from Core Service" }

        return try {
            val response = webClient.get()
                .uri("$coreServiceUrl$matchesQueuePath")
                .retrieve()
                .awaitBody<List<MatchDTO>>()

            logger.info { "Fetched ${response.size} queued matches" }
            response
        } catch (e: Exception) {
            logger.error(e) { "Failed to fetch queued matches from Core Service" }
            emptyList()
        }
    }

    /**
     * Update match status
     * @param matchId Match UUID
     * @param status New status (PROCESSING, COMPLETED, FAILED)
     */
    suspend fun updateMatchStatus(matchId: UUID, status: String) {
        logger.debug { "Updating match $matchId status to $status" }

        try {
            val url = "$coreServiceUrl${matchesStatusPath.replace("{id}", matchId.toString())}"
            webClient.patch()
                .uri(url)
                .bodyValue(UpdateMatchStatusRequest(status))
                .retrieve()
                .awaitBody<MatchDTO>()

            logger.info { "Updated match $matchId status to $status" }
        } catch (e: Exception) {
            logger.error(e) { "Failed to update match $matchId status" }
            throw e
        }
    }

    /**
     * Update match result after ML processing
     * @param matchId Match UUID
     * @param result Match result with confidence and scores
     */
    suspend fun updateMatchResult(matchId: UUID, result: UpdateMatchResultRequest) {
        logger.debug { "Updating match $matchId result" }

        try {
            val url = "$coreServiceUrl${matchesResultPath.replace("{id}", matchId.toString())}"
            webClient.put()
                .uri(url)
                .bodyValue(result)
                .retrieve()
                .awaitBody<MatchDTO>()

            logger.info { "Updated match $matchId result: videoId=${result.matchedVideoId}, confidence=${result.confidence}" }
        } catch (e: Exception) {
            logger.error(e) { "Failed to update match $matchId result" }
            throw e
        }
    }
}
