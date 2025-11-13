package com.videomatch.processing.processor

import com.videomatch.processing.client.CoreServiceClient
import com.videomatch.processing.client.MLServiceClient
import com.videomatch.processing.dto.UpdateMatchResultRequest
import com.videomatch.processing.monitor.ResourceMonitor
import kotlinx.coroutines.*
import mu.KotlinLogging
import org.springframework.beans.factory.annotation.Value
import org.springframework.scheduling.annotation.EnableScheduling
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service

private val logger = KotlinLogging.logger {}

/**
 * Queue processor that polls for queued matches and processes them
 * Uses scheduling to check queue periodically
 * Respects resource limits to prevent system overload
 */
@Service
@EnableScheduling
class QueueProcessor(
    private val coreServiceClient: CoreServiceClient,
    private val mlServiceClient: MLServiceClient,
    private val resourceMonitor: ResourceMonitor,
    @Value("\${queue-processor.concurrent-processing:3}") private val maxConcurrent: Int
) {

    /**
     * Process queue on a fixed interval
     * Configured via queue-processor.interval-ms (default: 5000ms)
     */
    @Scheduled(fixedDelayString = "\${queue-processor.interval-ms:5000}")
    fun processQueue() = runBlocking {
        logger.debug { "Checking queue for matches to process" }

        // Check if system is overloaded
        if (resourceMonitor.isOverloaded()) {
            logger.warn { "System overloaded, skipping queue processing" }
            return@runBlocking
        }

        // Get queued matches from core service
        val queuedMatches = coreServiceClient.getQueuedMatches()

        if (queuedMatches.isEmpty()) {
            logger.debug { "No matches in queue" }
            return@runBlocking
        }

        logger.info { "Found ${queuedMatches.size} matches in queue, processing top $maxConcurrent" }

        // Take only max concurrent matches
        val matchesToProcess = queuedMatches.take(maxConcurrent)

        // Process matches concurrently
        coroutineScope {
            matchesToProcess.map { match ->
                async {
                    processMatch(match.id, match.imageHash)
                }
            }.awaitAll()
        }

        logger.info { "Finished processing ${matchesToProcess.size} matches" }
    }

    /**
     * Process a single match
     * Updates status to PROCESSING, calls ML service, updates result
     */
    private suspend fun processMatch(matchId: java.util.UUID, imageHash: String) {
        try {
            logger.info { "Processing match: $matchId" }

            // Update status to PROCESSING
            coreServiceClient.updateMatchStatus(matchId, "PROCESSING")

            // Call ML service to match advertisement
            // For now, we use a dummy image - in production this would load from storage
            val imageBytes = "dummy-image-for-$imageHash".toByteArray()
            val mlResponse = mlServiceClient.matchAdvertisement(imageBytes, topK = 30)

            if (mlResponse.matched && mlResponse.bestMatch != null) {
                // Match found - update with result
                val bestMatch = mlResponse.bestMatch!!

                // Calculate timestamp from frame number (assuming 30 fps)
                val timestamp = bestMatch.frameNumber / 30.0

                // Build verification scores map
                val verificationScores = mutableMapOf<String, Double>()
                bestMatch.scores.embedding?.let { verificationScores["embedding"] = it }
                bestMatch.scores.sift?.let { verificationScores["sift"] = it }
                bestMatch.scores.color?.let { verificationScores["color"] = it }
                bestMatch.scores.text?.let { verificationScores["text"] = it }

                val result = UpdateMatchResultRequest(
                    matchedVideoId = bestMatch.videoId,
                    confidence = bestMatch.confidence,
                    frame = bestMatch.frameNumber,
                    timestamp = timestamp,
                    verificationScores = verificationScores
                )

                coreServiceClient.updateMatchResult(matchId, result)
                logger.info {
                    "Match $matchId completed successfully: " +
                    "videoId=${bestMatch.videoId}, confidence=${bestMatch.confidence}"
                }
            } else {
                // No match found - update status to COMPLETED without result
                coreServiceClient.updateMatchStatus(matchId, "COMPLETED")
                logger.info { "Match $matchId completed: no advertisement found" }
            }

        } catch (e: Exception) {
            logger.error(e) { "Failed to process match: $matchId" }

            // Update status to FAILED
            try {
                coreServiceClient.updateMatchStatus(matchId, "FAILED")
            } catch (updateError: Exception) {
                logger.error(updateError) { "Failed to update match status to FAILED for $matchId" }
            }
        }
    }
}
