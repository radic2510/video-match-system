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
import org.springframework.web.multipart.MultipartFile
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardCopyOption
import java.security.MessageDigest
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
    @PostMapping(consumes = ["multipart/form-data"])
    fun createMatch(
        @RequestHeader("X-User-Id", required = false) userId: String?,
        @RequestParam("image") imageFile: MultipartFile,
        @RequestParam("priority", required = false, defaultValue = "normal") priorityStr: String
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

        // Validate image file
        if (imageFile.isEmpty) {
            logger.warn { "Empty image file submitted by user: $userUUID" }
            return@runBlocking ResponseEntity.status(HttpStatus.BAD_REQUEST).build()
        }

        // Convert priority string to numeric value
        val priority = convertPriorityToNumeric(priorityStr)

        logger.info { "Creating match for user: $userUUID with image: ${imageFile.originalFilename}, priority: $priorityStr ($priority)" }

        try {
            // Save image file to disk
            val uploadDir = Paths.get(System.getProperty("user.home"), ".videomatch", "uploads")
            Files.createDirectories(uploadDir)

            // Generate unique filename using hash
            val imageHash = calculateImageHash(imageFile.bytes)
            val fileExtension = imageFile.originalFilename?.substringAfterLast('.', "") ?: "jpg"
            val fileName = "${imageHash}.${fileExtension}"
            val filePath = uploadDir.resolve(fileName)

            // Save file
            Files.copy(imageFile.inputStream, filePath, StandardCopyOption.REPLACE_EXISTING)
            logger.debug { "Saved image to: $filePath" }

            // Create match with image hash
            val match = matchService.createMatch(
                userId = userUUID,
                imageHash = imageHash,
                priority = priority
            )

            logger.info { "Match created successfully: ${match.id}, queue position: ${match.queuePosition}" }
            ResponseEntity.status(HttpStatus.CREATED).body(match.toDTO())
        } catch (e: Exception) {
            logger.error(e) { "Error creating match for user: $userUUID" }
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()
        }
    }

    /**
     * Calculate SHA-256 hash of image bytes for unique identification
     */
    private fun calculateImageHash(bytes: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest(bytes)
        return hashBytes.joinToString("") { "%02x".format(it) }
    }

    /**
     * Convert priority string (from frontend) to numeric value
     * Supports: "normal" (50), "high" (75), or direct numeric values
     */
    private fun convertPriorityToNumeric(priorityStr: String): Double {
        return when (priorityStr.lowercase()) {
            "normal" -> 50.0
            "high" -> 75.0
            "low" -> 25.0
            else -> {
                // Try to parse as numeric value
                try {
                    val numericValue = priorityStr.toDouble()
                    // Validate range
                    if (numericValue < 0.0 || numericValue > 100.0) {
                        logger.warn { "Priority value out of range: $numericValue, using default 50.0" }
                        50.0
                    } else {
                        numericValue
                    }
                } catch (e: NumberFormatException) {
                    logger.warn { "Invalid priority value: $priorityStr, using default 50.0" }
                    50.0
                }
            }
        }
    }

    /**
     * Get all matches for the authenticated user
     * Convenience endpoint that doesn't require userId in path
     */
    @GetMapping
    fun getMyMatches(
        @RequestHeader("X-User-Id", required = false) userId: String?
    ): ResponseEntity<List<MatchDTO>> = runBlocking {
        // Check authentication
        if (userId == null) {
            return@runBlocking ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        }

        val userUUID = try {
            UUID.fromString(userId)
        } catch (e: IllegalArgumentException) {
            return@runBlocking ResponseEntity.status(HttpStatus.BAD_REQUEST).build()
        }

        logger.debug { "Getting all matches for user: $userUUID" }

        val matches = matchService.getUserMatches(userUUID)
        val dtos = matches.map { it.toDTO() }

        ResponseEntity.ok(dtos)
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
     * Get all queued matches sorted by priority
     * Internal use - for Processing Service
     * TODO: Add service-to-service authentication
     */
    @GetMapping("/queue")
    fun getQueuedMatches(): ResponseEntity<List<MatchDTO>> = runBlocking {
        logger.debug { "Fetching queued matches" }

        val queuedMatches = matchService.getQueuedMatches()
        val dtos = queuedMatches.map { it.toDTO() }

        logger.info { "Returning ${dtos.size} queued matches" }
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

    /**
     * Update match result with ML processing output
     * Internal use - for Processing Service
     * TODO: Add service-to-service authentication
     */
    @PutMapping("/{id}/result")
    fun updateMatchResult(
        @PathVariable id: UUID,
        @RequestBody resultUpdate: Map<String, Any>
    ): ResponseEntity<MatchDTO> = runBlocking {
        logger.info { "Updating match result: $id" }

        // Parse result from request
        val matchedVideoId = UUID.fromString(resultUpdate["matchedVideoId"] as String)
        val confidence = (resultUpdate["confidence"] as Number).toDouble()
        val frame = (resultUpdate["frame"] as Number).toInt()
        val timestamp = (resultUpdate["timestamp"] as Number).toDouble()

        @Suppress("UNCHECKED_CAST")
        val verificationScores = (resultUpdate["verificationScores"] as? Map<String, Any>)
            ?.mapValues { (it.value as Number).toDouble() }
            ?: emptyMap()

        val result = com.videomatch.core.domain.model.MatchResult(
            matchedVideoId = matchedVideoId,
            confidence = confidence,
            frame = frame,
            timestamp = timestamp,
            verificationScores = verificationScores
        )

        val updatedMatch = matchService.updateMatchResult(id, result)

        logger.info { "Match result updated successfully: $id -> videoId=$matchedVideoId, confidence=$confidence" }
        ResponseEntity.ok(updatedMatch.toDTO())
    }
}
