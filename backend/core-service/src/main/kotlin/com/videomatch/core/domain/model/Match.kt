package com.videomatch.core.domain.model

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

/**
 * Match status enumeration
 */
enum class MatchStatus {
    QUEUED,
    PROCESSING,
    COMPLETED,
    FAILED
}

/**
 * Match result data class containing detailed matching information
 */
data class MatchResult(
    val matchedVideoId: UUID,
    val confidence: Double,
    val frame: Int,
    val timestamp: Double,
    val verificationScores: Map<String, Double>
) {
    init {
        require(confidence in 0.0..1.0) { "Confidence must be between 0.0 and 1.0" }
        require(frame >= 0) { "Frame must be non-negative" }
        require(timestamp >= 0.0) { "Timestamp must be non-negative" }
    }
}

/**
 * Match entity representing an image matching request and its result
 */
@Entity
@Table(name = "image_matches")
data class Match(
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    val id: UUID = UUID.randomUUID(),

    @Column(name = "user_id", nullable = false, columnDefinition = "uuid")
    val userId: UUID,

    @Column(name = "image_hash", nullable = false, length = 64)
    val imageHash: String,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    val status: MatchStatus = MatchStatus.QUEUED,

    @Column(name = "result", columnDefinition = "TEXT")
    @Convert(converter = com.videomatch.core.infrastructure.converter.MatchResultConverter::class)
    val result: MatchResult? = null,

    @Column(name = "queue_position", nullable = false)
    val queuePosition: Int,

    @Column(name = "priority", nullable = false)
    val priority: Int,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now()
) {
    init {
        require(imageHash.isNotBlank()) { "Image hash must not be blank" }
        require(queuePosition >= 0) { "Queue position must be non-negative" }
        require(priority >= 0) { "Priority must be non-negative" }
    }
}
