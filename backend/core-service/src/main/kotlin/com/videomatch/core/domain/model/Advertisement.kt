package com.videomatch.core.domain.model

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

/**
 * Advertisement status enumeration
 */
enum class AdvertisementStatus {
    PROCESSING,
    READY,
    FAILED
}

/**
 * Advertisement entity representing a video advertisement
 */
@Entity
@Table(name = "videos")
data class Advertisement(
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    val id: UUID = UUID.randomUUID(),

    @Column(name = "campaign_name", nullable = false, length = 200)
    val title: String,

    @Column(name = "brand_name", nullable = false, length = 100)
    val brandName: String,

    @Column(name = "video_path", nullable = false)
    val videoPath: String,

    @Column(name = "created_at", nullable = false)
    val uploadedAt: Instant = Instant.now(),

    @Column(name = "frame_count")
    val totalFrames: Int?,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    val status: AdvertisementStatus = AdvertisementStatus.PROCESSING
) {
    init {
        require(title.isNotBlank()) { "Title must not be blank" }
        require(brandName.isNotBlank()) { "Brand name must not be blank" }
        totalFrames?.let {
            require(it > 0) { "Total frames must be greater than 0" }
        }
    }
}
