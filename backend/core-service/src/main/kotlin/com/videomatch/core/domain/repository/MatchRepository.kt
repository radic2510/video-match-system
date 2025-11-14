package com.videomatch.core.domain.repository

import com.videomatch.core.domain.model.Match
import com.videomatch.core.domain.model.MatchResult
import com.videomatch.core.domain.model.MatchStatus
import java.util.UUID

/**
 * Repository interface for Match entity operations
 * Uses Kotlin coroutines for async operations
 */
interface MatchRepository {

    /**
     * Save a match to the database
     * @param match Match entity to save
     * @return Saved match entity
     */
    fun save(match: Match): Match

    /**
     * Find a match by ID
     * @param id Match ID
     * @return Match if found, null otherwise
     */
    fun findById(id: UUID): Match?

    /**
     * Find all matches for a specific user
     * @param userId User ID
     * @return List of matches for the user
     */
    fun findByUserId(userId: UUID): List<Match>

    /**
     * Find matches by status
     * @param status Match status to filter by
     * @return List of matches with the specified status
     */
    fun findByStatus(status: MatchStatus): List<Match>

    /**
     * Update match status
     * @param id Match ID
     * @param status New status
     * @return Updated match if found, null otherwise
     */
    fun updateStatus(id: UUID, status: MatchStatus): Match?

    /**
     * Update match result
     * @param id Match ID
     * @param result Match result with confidence and verification scores
     * @return Updated match if found, null otherwise
     */
    fun updateResult(id: UUID, result: MatchResult): Match?

    /**
     * Delete a match by ID
     * @param id Match ID
     */
    fun delete(id: UUID)

    /**
     * Find all matches
     * @return List of all matches
     */
    fun findAll(): List<Match>
}
