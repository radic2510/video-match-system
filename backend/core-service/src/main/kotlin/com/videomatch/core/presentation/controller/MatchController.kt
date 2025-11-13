package com.videomatch.core.presentation.controller

import com.videomatch.core.application.dto.CreateMatchRequest
import com.videomatch.core.application.dto.MatchDTO
import com.videomatch.core.application.dto.toDTO
import com.videomatch.core.application.service.MatchService
import com.videomatch.core.domain.model.MatchStatus
import jakarta.validation.Valid
import kotlinx.coroutines.runBlocking
import mu.KotlinLogging
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

private val logger = KotlinLogging.logger {}

/**
 * REST controller for image matching operations
 * Handles match creation, queue management, and result retrieval
 */
@RestController
@RequestMapping("/api/matches")
class MatchController(
    private val matchService: MatchService
) {

    /**
     * Create a new match request
     * Requires authentication - user ID from JWT token
     * For now, we simulate authentication using X-User-Id header
     */
    @PostMapping
    fun createMatch(
        @RequestHeader("X-User-Id", required = false) userId: String?,
        @Valid @RequestBody request: CreateMatchRequest
    ): ResponseEntity<MatchDTO> = runBlocking {
        // Check authentication
        if (userId == null) {
            return@runBlocking ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        }

        val userUUID = try {
            UUID.fromString(userId)
        } catch (e: IllegalArgumentException) {
            return@runBlocking ResponseEntity.status(HttpStatus.BAD_REQUEST).build()
        }

        logger.info { "Creating match for user: $userUUID" }

        val match = matchService.createMatch(
            userId = userUUID,
            imageHash = request.imageHash,
            priority = request.priority
        )

        logger.info { "Match created successfully: ${match.id}, queue position: ${match.queuePosition}" }
        ResponseEntity.status(HttpStatus.CREATED).body(match.toDTO())
    }

    /**
     * Get match result by ID
     * Requires authentication - user must own the match
     */
    @GetMapping("/{id}")
    fun getMatch(
        @RequestHeader("X-User-Id", required = false) userId: String?,
        @PathVariable id: UUID
    ): ResponseEntity<MatchDTO> = runBlocking {
        // Check authentication
        if (userId == null) {
            return@runBlocking ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        }

        val userUUID = try {
            UUID.fromString(userId)
        } catch (e: IllegalArgumentException) {
            return@runBlocking ResponseEntity.status(HttpStatus.BAD_REQUEST).build()
        }

        logger.debug { "Getting match: $id for user: $userUUID" }

        val match = matchService.getMatch(id)
            ?: return@runBlocking ResponseEntity.notFound().build()

        // Check if user owns this match
        if (match.userId != userUUID) {
            logger.warn { "User $userUUID attempted to access match $id owned by ${match.userId}" }
            return@runBlocking ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        }

        ResponseEntity.ok(match.toDTO())
    }

    /**
     * Get all matches for a specific user
     * Requires authentication - user must match the userId parameter
     */
    @GetMapping("/user/{userId}")
    fun getUserMatches(
        @RequestHeader("X-User-Id", required = false) requestUserId: String?,
        @PathVariable userId: UUID
    ): ResponseEntity<List<MatchDTO>> = runBlocking {
        // Check authentication
        if (requestUserId == null) {
            return@runBlocking ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        }

        val requestUserUUID = try {
            UUID.fromString(requestUserId)
        } catch (e: IllegalArgumentException) {
            return@runBlocking ResponseEntity.status(HttpStatus.BAD_REQUEST).build()
        }

        // Check if user is requesting their own matches
        if (requestUserUUID != userId) {
            logger.warn { "User $requestUserUUID attempted to access matches for user $userId" }
            return@runBlocking ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        }

        logger.debug { "Getting matches for user: $userId" }

        val matches = matchService.getUserMatches(userId)
        val dtos = matches.map { it.toDTO() }

        ResponseEntity.ok(dtos)
    }

    /**
     * Update match status
     * Internal use - for Processing Service
     * TODO: Add service-to-service authentication
     */
    @PatchMapping("/{id}/status")
    fun updateMatchStatus(
        @PathVariable id: UUID,
        @RequestBody statusUpdate: Map<String, String>
    ): ResponseEntity<MatchDTO> = runBlocking {
        logger.info { "Updating match status: $id" }

        // Parse status from request
        val statusStr = statusUpdate["status"]
            ?: throw IllegalArgumentException("Status is required")

        val status = try {
            MatchStatus.valueOf(statusStr)
        } catch (e: IllegalArgumentException) {
            throw IllegalArgumentException("Invalid status: $statusStr. Valid values: ${MatchStatus.values().joinToString()}")
        }

        val updatedMatch = matchService.updateMatchStatus(id, status)

        logger.info { "Match status updated successfully: $id -> $status" }
        ResponseEntity.ok(updatedMatch.toDTO())
    }
}
