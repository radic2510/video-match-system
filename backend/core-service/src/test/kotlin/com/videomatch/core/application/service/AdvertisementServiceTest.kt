package com.videomatch.core.application.service

import com.videomatch.common.exception.ResourceNotFoundException
import com.videomatch.common.exception.ValidationException
import com.videomatch.core.domain.model.Advertisement
import com.videomatch.core.domain.model.AdvertisementStatus
import com.videomatch.core.domain.repository.AdvertisementRepository
import io.mockk.*
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.time.Instant
import java.util.UUID

/**
 * Unit tests for AdvertisementService
 * Tests all business logic with mocked repository
 */
class AdvertisementServiceTest {

    private lateinit var advertisementRepository: AdvertisementRepository
    private lateinit var advertisementService: AdvertisementService

    @BeforeEach
    fun setup() {
        advertisementRepository = mockk()
        advertisementService = AdvertisementService(advertisementRepository)
    }

    @AfterEach
    fun tearDown() {
        clearAllMocks()
    }

    // Test createAdvertisement - Happy Path
    @Test
    fun `createAdvertisement should create advertisement with PROCESSING status`() = runBlocking {
        // Given
        val title = "Summer Sale Campaign"
        val brandName = "Nike"
        val videoPath = "/videos/nike-summer-2024.mp4"
        val totalFrames = 300

        val savedAd = Advertisement(
            id = UUID.randomUUID(),
            title = title,
            brandName = brandName,
            videoPath = videoPath,
            uploadedAt = Instant.now(),
            totalFrames = totalFrames,
            status = AdvertisementStatus.PROCESSING
        )

        coEvery { advertisementRepository.save(any()) } returns savedAd

        // When
        val result = advertisementService.createAdvertisement(title, brandName, videoPath, totalFrames)

        // Then
        assertNotNull(result)
        assertEquals(title, result.title)
        assertEquals(brandName, result.brandName)
        assertEquals(videoPath, result.videoPath)
        assertEquals(AdvertisementStatus.PROCESSING, result.status)
        coVerify { advertisementRepository.save(any()) }
    }

    @Test
    fun `createAdvertisement should throw ValidationException for blank title`() = runBlocking {
        // Given
        val title = ""
        val brandName = "Nike"
        val videoPath = "/videos/nike-summer-2024.mp4"
        val totalFrames = 300

        // When/Then
        val exception = assertThrows<ValidationException> {
            advertisementService.createAdvertisement(title, brandName, videoPath, totalFrames)
        }
        assertEquals("title", exception.field)
        coVerify(exactly = 0) { advertisementRepository.save(any()) }
    }

    @Test
    fun `createAdvertisement should throw ValidationException for blank brandName`() = runBlocking {
        // Given
        val title = "Summer Sale Campaign"
        val brandName = "   "
        val videoPath = "/videos/nike-summer-2024.mp4"
        val totalFrames = 300

        // When/Then
        val exception = assertThrows<ValidationException> {
            advertisementService.createAdvertisement(title, brandName, videoPath, totalFrames)
        }
        assertEquals("brandName", exception.field)
        coVerify(exactly = 0) { advertisementRepository.save(any()) }
    }

    @Test
    fun `createAdvertisement should throw ValidationException for blank videoPath`() = runBlocking {
        // Given
        val title = "Summer Sale Campaign"
        val brandName = "Nike"
        val videoPath = ""
        val totalFrames = 300

        // When/Then
        val exception = assertThrows<ValidationException> {
            advertisementService.createAdvertisement(title, brandName, videoPath, totalFrames)
        }
        assertEquals("videoPath", exception.field)
        coVerify(exactly = 0) { advertisementRepository.save(any()) }
    }

    @Test
    fun `createAdvertisement should throw ValidationException for non-positive totalFrames`() = runBlocking {
        // Given
        val title = "Summer Sale Campaign"
        val brandName = "Nike"
        val videoPath = "/videos/nike-summer-2024.mp4"
        val totalFrames = 0

        // When/Then
        val exception = assertThrows<ValidationException> {
            advertisementService.createAdvertisement(title, brandName, videoPath, totalFrames)
        }
        assertEquals("totalFrames", exception.field)
        coVerify(exactly = 0) { advertisementRepository.save(any()) }
    }

    // Test getAdvertisement
    @Test
    fun `getAdvertisement should return advertisement when found`() = runBlocking {
        // Given
        val adId = UUID.randomUUID()
        val advertisement = Advertisement(
            id = adId,
            title = "Summer Sale",
            brandName = "Nike",
            videoPath = "/videos/nike.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 300,
            status = AdvertisementStatus.READY
        )

        coEvery { advertisementRepository.findById(adId) } returns advertisement

        // When
        val result = advertisementService.getAdvertisement(adId)

        // Then
        assertNotNull(result)
        assertEquals(adId, result?.id)
        coVerify { advertisementRepository.findById(adId) }
    }

    @Test
    fun `getAdvertisement should return null when not found`() = runBlocking {
        // Given
        val adId = UUID.randomUUID()
        coEvery { advertisementRepository.findById(adId) } returns null

        // When
        val result = advertisementService.getAdvertisement(adId)

        // Then
        assertNull(result)
        coVerify { advertisementRepository.findById(adId) }
    }

    // Test listAdvertisements
    @Test
    fun `listAdvertisements should return all advertisements when brandName is null`() = runBlocking {
        // Given
        val ads = listOf(
            Advertisement(
                id = UUID.randomUUID(),
                title = "Ad 1",
                brandName = "Nike",
                videoPath = "/videos/ad1.mp4",
                uploadedAt = Instant.now(),
                totalFrames = 300,
                status = AdvertisementStatus.READY
            ),
            Advertisement(
                id = UUID.randomUUID(),
                title = "Ad 2",
                brandName = "Adidas",
                videoPath = "/videos/ad2.mp4",
                uploadedAt = Instant.now(),
                totalFrames = 250,
                status = AdvertisementStatus.PROCESSING
            )
        )

        coEvery { advertisementRepository.findAll() } returns ads

        // When
        val result = advertisementService.listAdvertisements(null)

        // Then
        assertEquals(2, result.size)
        coVerify { advertisementRepository.findAll() }
        coVerify(exactly = 0) { advertisementRepository.findByBrandName(any()) }
    }

    @Test
    fun `listAdvertisements should return filtered advertisements when brandName is provided`() = runBlocking {
        // Given
        val brandName = "Nike"
        val nikeAds = listOf(
            Advertisement(
                id = UUID.randomUUID(),
                title = "Nike Ad 1",
                brandName = brandName,
                videoPath = "/videos/nike1.mp4",
                uploadedAt = Instant.now(),
                totalFrames = 300,
                status = AdvertisementStatus.READY
            ),
            Advertisement(
                id = UUID.randomUUID(),
                title = "Nike Ad 2",
                brandName = brandName,
                videoPath = "/videos/nike2.mp4",
                uploadedAt = Instant.now(),
                totalFrames = 400,
                status = AdvertisementStatus.READY
            )
        )

        coEvery { advertisementRepository.findByBrandName(brandName) } returns nikeAds

        // When
        val result = advertisementService.listAdvertisements(brandName)

        // Then
        assertEquals(2, result.size)
        assertTrue(result.all { it.brandName == brandName })
        coVerify { advertisementRepository.findByBrandName(brandName) }
        coVerify(exactly = 0) { advertisementRepository.findAll() }
    }

    // Test updateStatus
    @Test
    fun `updateStatus should update advertisement status`() = runBlocking {
        // Given
        val adId = UUID.randomUUID()
        val oldStatus = AdvertisementStatus.PROCESSING
        val newStatus = AdvertisementStatus.READY

        val advertisement = Advertisement(
            id = adId,
            title = "Summer Sale",
            brandName = "Nike",
            videoPath = "/videos/nike.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 300,
            status = oldStatus
        )

        val updatedAdvertisement = advertisement.copy(status = newStatus)

        coEvery { advertisementRepository.findById(adId) } returns advertisement
        coEvery { advertisementRepository.updateStatus(adId, newStatus) } returns updatedAdvertisement

        // When
        val result = advertisementService.updateStatus(adId, newStatus)

        // Then
        assertNotNull(result)
        assertEquals(newStatus, result.status)
        coVerify { advertisementRepository.findById(adId) }
        coVerify { advertisementRepository.updateStatus(adId, newStatus) }
    }

    @Test
    fun `updateStatus should throw ResourceNotFoundException when advertisement not found`() = runBlocking {
        // Given
        val adId = UUID.randomUUID()
        val newStatus = AdvertisementStatus.READY

        coEvery { advertisementRepository.findById(adId) } returns null

        // When/Then
        assertThrows<ResourceNotFoundException> {
            advertisementService.updateStatus(adId, newStatus)
        }
        coVerify { advertisementRepository.findById(adId) }
        coVerify(exactly = 0) { advertisementRepository.updateStatus(any(), any()) }
    }

    // Test deleteAdvertisement
    @Test
    fun `deleteAdvertisement should delete existing advertisement and return true`() = runBlocking {
        // Given
        val adId = UUID.randomUUID()
        val advertisement = Advertisement(
            id = adId,
            title = "Summer Sale",
            brandName = "Nike",
            videoPath = "/videos/nike.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 300,
            status = AdvertisementStatus.READY
        )

        coEvery { advertisementRepository.findById(adId) } returns advertisement
        coEvery { advertisementRepository.delete(adId) } just Runs

        // When
        val result = advertisementService.deleteAdvertisement(adId)

        // Then
        assertTrue(result)
        coVerify { advertisementRepository.findById(adId) }
        coVerify { advertisementRepository.delete(adId) }
    }

    @Test
    fun `deleteAdvertisement should return false when advertisement not found`() = runBlocking {
        // Given
        val adId = UUID.randomUUID()
        coEvery { advertisementRepository.findById(adId) } returns null

        // When
        val result = advertisementService.deleteAdvertisement(adId)

        // Then
        assertFalse(result)
        coVerify { advertisementRepository.findById(adId) }
        coVerify(exactly = 0) { advertisementRepository.delete(any()) }
    }
}
