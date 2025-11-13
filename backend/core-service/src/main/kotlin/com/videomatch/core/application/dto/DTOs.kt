package com.videomatch.core.application.dto

import com.videomatch.core.domain.model.*
import java.time.Instant
import java.util.UUID

/**
 * User DTO for API responses
 * Does not include password hash for security
 */
data class UserDTO(
    val id: UUID,
    val email: String,
    val name: String,
    val role: String,
    val createdAt: Instant
)

/**
 * Request DTO for user registration
 */
data class RegisterUserRequest(
    val email: String,
    val password: String,
    val name: String
)

/**
 * Request DTO for user login
 */
data class LoginRequest(
    val email: String,
    val password: String
)

/**
 * Response DTO for successful login
 */
data class LoginResponse(
    val user: UserDTO,
    val token: String
)

/**
 * Advertisement DTO for API responses
 */
data class AdvertisementDTO(
    val id: UUID,
    val title: String,
    val brandName: String,
    val videoPath: String,
    val uploadedAt: Instant,
    val totalFrames: Int,
    val status: String
)

/**
 * Request DTO for creating advertisement
 */
data class CreateAdvertisementRequest(
    val title: String,
    val brandName: String,
    val videoPath: String,
    val totalFrames: Int
)

/**
 * Match DTO for API responses
 */
data class MatchDTO(
    val id: UUID,
    val userId: UUID,
    val imageHash: String,
    val status: String,
    val result: MatchResultDTO?,
    val queuePosition: Int,
    val priority: Int,
    val createdAt: Instant
)

/**
 * Match result DTO for API responses
 */
data class MatchResultDTO(
    val matchedVideoId: UUID,
    val confidence: Double,
    val frame: Int,
    val timestamp: Double,
    val verificationScores: Map<String, Double>
)

/**
 * Request DTO for creating match
 */
data class CreateMatchRequest(
    val imageHash: String,
    val priority: Int = 50
)

/**
 * Request DTO for updating user
 */
data class UserUpdateRequest(
    val email: String? = null,
    val name: String? = null,
    val password: String? = null
)

// Mapper extension functions

/**
 * Convert User entity to UserDTO
 */
fun User.toDTO(): UserDTO {
    return UserDTO(
        id = this.id,
        email = this.email,
        name = this.name,
        role = this.role.name,
        createdAt = this.createdAt
    )
}

/**
 * Convert Advertisement entity to AdvertisementDTO
 */
fun Advertisement.toDTO(): AdvertisementDTO {
    return AdvertisementDTO(
        id = this.id,
        title = this.title,
        brandName = this.brandName,
        videoPath = this.videoPath,
        uploadedAt = this.uploadedAt,
        totalFrames = this.totalFrames,
        status = this.status.name
    )
}

/**
 * Convert Match entity to MatchDTO
 */
fun Match.toDTO(): MatchDTO {
    return MatchDTO(
        id = this.id,
        userId = this.userId,
        imageHash = this.imageHash,
        status = this.status.name,
        result = this.result?.toDTO(),
        queuePosition = this.queuePosition,
        priority = this.priority,
        createdAt = this.createdAt
    )
}

/**
 * Convert MatchResult to MatchResultDTO
 */
fun MatchResult.toDTO(): MatchResultDTO {
    return MatchResultDTO(
        matchedVideoId = this.matchedVideoId,
        confidence = this.confidence,
        frame = this.frame,
        timestamp = this.timestamp,
        verificationScores = this.verificationScores
    )
}

/**
 * Convert MatchResultDTO to MatchResult
 */
fun MatchResultDTO.toEntity(): MatchResult {
    return MatchResult(
        matchedVideoId = this.matchedVideoId,
        confidence = this.confidence,
        frame = this.frame,
        timestamp = this.timestamp,
        verificationScores = this.verificationScores
    )
}
