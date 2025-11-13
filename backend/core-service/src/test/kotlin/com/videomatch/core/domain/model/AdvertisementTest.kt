package com.videomatch.core.domain.model

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.time.Instant
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class AdvertisementTest {

    @Test
    fun `should create advertisement with all fields`() {
        // Given
        val id = UUID.randomUUID()
        val title = "Summer Sale 2024"
        val brandName = "Nike"
        val videoPath = "/videos/nike-summer-2024.mp4"
        val uploadedAt = Instant.now()
        val totalFrames = 1500
        val status = AdvertisementStatus.READY

        // When
        val advertisement = Advertisement(
            id = id,
            title = title,
            brandName = brandName,
            videoPath = videoPath,
            uploadedAt = uploadedAt,
            totalFrames = totalFrames,
            status = status
        )

        // Then
        assertEquals(id, advertisement.id)
        assertEquals(title, advertisement.title)
        assertEquals(brandName, advertisement.brandName)
        assertEquals(videoPath, advertisement.videoPath)
        assertEquals(uploadedAt, advertisement.uploadedAt)
        assertEquals(totalFrames, advertisement.totalFrames)
        assertEquals(status, advertisement.status)
    }

    @Test
    fun `should create advertisement with default PROCESSING status`() {
        // When
        val advertisement = Advertisement(
            id = UUID.randomUUID(),
            title = "Test Ad",
            brandName = "Test Brand",
            videoPath = "/videos/test.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 100,
            status = AdvertisementStatus.PROCESSING
        )

        // Then
        assertEquals(AdvertisementStatus.PROCESSING, advertisement.status)
    }

    @Test
    fun `should support PROCESSING status`() {
        // When
        val advertisement = Advertisement(
            id = UUID.randomUUID(),
            title = "Test Ad",
            brandName = "Test Brand",
            videoPath = "/videos/test.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 100,
            status = AdvertisementStatus.PROCESSING
        )

        // Then
        assertEquals(AdvertisementStatus.PROCESSING, advertisement.status)
    }

    @Test
    fun `should support READY status`() {
        // When
        val advertisement = Advertisement(
            id = UUID.randomUUID(),
            title = "Test Ad",
            brandName = "Test Brand",
            videoPath = "/videos/test.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 100,
            status = AdvertisementStatus.READY
        )

        // Then
        assertEquals(AdvertisementStatus.READY, advertisement.status)
    }

    @Test
    fun `should support FAILED status`() {
        // When
        val advertisement = Advertisement(
            id = UUID.randomUUID(),
            title = "Test Ad",
            brandName = "Test Brand",
            videoPath = "/videos/test.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 100,
            status = AdvertisementStatus.FAILED
        )

        // Then
        assertEquals(AdvertisementStatus.FAILED, advertisement.status)
    }

    @Test
    fun `should be data class with copy functionality`() {
        // Given
        val advertisement = Advertisement(
            id = UUID.randomUUID(),
            title = "Original Title",
            brandName = "Original Brand",
            videoPath = "/videos/original.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 100,
            status = AdvertisementStatus.PROCESSING
        )

        // When
        val updatedAdvertisement = advertisement.copy(
            status = AdvertisementStatus.READY,
            totalFrames = 150
        )

        // Then
        assertEquals(AdvertisementStatus.READY, updatedAdvertisement.status)
        assertEquals(150, updatedAdvertisement.totalFrames)
        assertEquals(advertisement.id, updatedAdvertisement.id)
        assertEquals(advertisement.title, updatedAdvertisement.title)
    }

    @Test
    fun `should generate random UUID when id not provided`() {
        // When
        val advertisement = Advertisement(
            title = "Test Ad",
            brandName = "Test Brand",
            videoPath = "/videos/test.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 100,
            status = AdvertisementStatus.PROCESSING
        )

        // Then
        assertNotNull(advertisement.id)
    }

    @Test
    fun `should use current timestamp when uploadedAt not provided`() {
        // Given
        val beforeCreation = Instant.now()

        // When
        val advertisement = Advertisement(
            title = "Test Ad",
            brandName = "Test Brand",
            videoPath = "/videos/test.mp4",
            totalFrames = 100,
            status = AdvertisementStatus.PROCESSING
        )

        // Then
        val afterCreation = Instant.now()
        assertNotNull(advertisement.uploadedAt)
        assert(advertisement.uploadedAt >= beforeCreation && advertisement.uploadedAt <= afterCreation)
    }

    @Test
    fun `should accept valid title`() {
        // When
        val advertisement = Advertisement(
            title = "Valid Title",
            brandName = "Test Brand",
            videoPath = "/videos/test.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 100,
            status = AdvertisementStatus.PROCESSING
        )

        // Then
        assertEquals("Valid Title", advertisement.title)
    }

    @Test
    fun `should accept valid brandName`() {
        // When
        val advertisement = Advertisement(
            title = "Test Ad",
            brandName = "Valid Brand",
            videoPath = "/videos/test.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 100,
            status = AdvertisementStatus.PROCESSING
        )

        // Then
        assertEquals("Valid Brand", advertisement.brandName)
    }

    @Test
    fun `should accept positive totalFrames`() {
        // When
        val advertisement = Advertisement(
            title = "Test Ad",
            brandName = "Test Brand",
            videoPath = "/videos/test.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 1,
            status = AdvertisementStatus.PROCESSING
        )

        // Then
        assertEquals(1, advertisement.totalFrames)
    }

    @Test
    fun `should accept large totalFrames`() {
        // When
        val advertisement = Advertisement(
            title = "Test Ad",
            brandName = "Test Brand",
            videoPath = "/videos/test.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 10000,
            status = AdvertisementStatus.PROCESSING
        )

        // Then
        assertEquals(10000, advertisement.totalFrames)
    }
}
