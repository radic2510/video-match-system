package com.videomatch.core.application.service

import com.videomatch.common.exception.ResourceNotFoundException
import com.videomatch.common.exception.ValidationException
import com.videomatch.core.domain.model.Match
import com.videomatch.core.domain.model.MatchResult
import com.videomatch.core.domain.model.MatchStatus
import com.videomatch.core.domain.repository.MatchRepository
import org.springframework.stereotype.Service
import java.util.UUID

/**
 * Service for managing image matching operations
 * Handles match creation, queue management, and result updates
 */
@Service
class MatchService(
    private val matchRepository: MatchRepository
) {

    /**
     * Create a new match request
     * @param userId User ID submitting the match request
     * @param imageHash Hash of the uploaded image
     * @param priority Priority level (0-100)
     * @return Created match entity with QUEUED status
     * @throws ValidationException if validation fails
     */
    suspend fun createMatch(userId: UUID, imageHash: String, priority: Int): Match {
        // Validate image hash
        if (imageHash.isBlank()) {
            throw ValidationException("imageHash", "Image hash must not be blank")
        }

        // Validate priority (0-100)
        if (priority !in 0..100) {
            throw ValidationException("priority", "Priority must be between 0 and 100")
        }

        // Get current queue to calculate position
        val queuedMatches = matchRepository.findByStatus(MatchStatus.QUEUED)

        // Calculate queue position based on priority and timestamp
        // Higher priority gets lower position (processed first)
        // For same priority, older requests get lower position
        val position = calculateQueuePosition(queuedMatches, priority)

        // Create match entity with QUEUED status
        val match = Match(
            userId = userId,
            imageHash = imageHash,
            status = MatchStatus.QUEUED,
            result = null,
            queuePosition = position,
            priority = priority
        )

        // Save and return
        return matchRepository.save(match)
    }

    /**
     * Calculate queue position based on priority and existing queue
     * Higher priority gets lower position number (processed first)
     */
    private fun calculateQueuePosition(queuedMatches: List<Match>, priority: Int): Int {
        if (queuedMatches.isEmpty()) {
            return 1
        }

        // Sort by priority (descending) then by createdAt (ascending)
        val sortedQueue = queuedMatches.sortedWith(
            compareByDescending<Match> { it.priority }
                .thenBy { it.createdAt }
        )

        // Find position where this match should be inserted
        var position = 1
        for (match in sortedQueue) {
            if (priority > match.priority) {
                break
            }
            position++
        }

        return position
    }

    /**
     * Get match by ID
     * @param id Match UUID
     * @return Match entity if found, null otherwise
     */
    suspend fun getMatch(id: UUID): Match? {
        return matchRepository.findById(id)
    }

    /**
     * Get all matches for a specific user
     * @param userId User UUID
     * @return List of matches for the user
     */
    suspend fun getUserMatches(userId: UUID): List<Match> {
        return matchRepository.findByUserId(userId)
    }

    /**
     * Update match status
     * @param id Match UUID
     * @param status New status
     * @return Updated match entity
     * @throws ResourceNotFoundException if match not found
     */
    suspend fun updateMatchStatus(id: UUID, status: MatchStatus): Match {
        // Check if match exists
        matchRepository.findById(id)
            ?: throw ResourceNotFoundException("Match", id.toString())

        // Update status
        return matchRepository.updateStatus(id, status)
            ?: throw ResourceNotFoundException("Match", id.toString())
    }

    /**
     * Update match result with ML processing output
     * @param id Match UUID
     * @param result Match result with confidence and verification scores
     * @return Updated match entity
     * @throws ResourceNotFoundException if match not found
     */
    suspend fun updateMatchResult(id: UUID, result: MatchResult): Match {
        // Check if match exists
        matchRepository.findById(id)
            ?: throw ResourceNotFoundException("Match", id.toString())

        // Update result
        return matchRepository.updateResult(id, result)
            ?: throw ResourceNotFoundException("Match", id.toString())
    }

    /**
     * Get all queued matches sorted by priority
     * Used by processing service to get next matches to process
     * @return List of queued matches sorted by priority (descending) and timestamp (ascending)
     */
    suspend fun getQueuedMatches(): List<Match> {
        val queuedMatches = matchRepository.findByStatus(MatchStatus.QUEUED)

        // Sort by priority (descending) then by createdAt (ascending)
        return queuedMatches.sortedWith(
            compareByDescending<Match> { it.priority }
                .thenBy { it.createdAt }
        )
    }
}
