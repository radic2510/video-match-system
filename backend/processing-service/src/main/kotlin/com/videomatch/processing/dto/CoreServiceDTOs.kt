package com.videomatch.processing.dto

import java.time.Instant
import java.util.UUID

/**
 * Core Service API DTOs
 * Mirrors core-service DTOs for communication
 */

/**
 * Match DTO from Core Service
 */
data class MatchDTO(
    val id: UUID,
    val userId: UUID,
    val imageHash: String,
    val status: String,
    val result: MatchResultDTO?,
    val queuePosition: Int,
    val priority: Double,
    val createdAt: Instant
)

/**
 * Match result DTO
 */
data class MatchResultDTO(
    val matchedVideoId: UUID,
    val confidence: Double,
    val frame: Int,
    val timestamp: Double,
    val verificationScores: Map<String, Double>
)

/**
 * Request to update match status
 */
data class UpdateMatchStatusRequest(
    val status: String
)

/**
 * Request to update match result
 */
data class UpdateMatchResultRequest(
    val matchedVideoId: UUID,
    val confidence: Double,
    val frame: Int,
    val timestamp: Double,
    val verificationScores: Map<String, Double>
)
