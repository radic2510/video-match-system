package com.videomatch.core.domain.repository

import com.videomatch.core.domain.model.Advertisement
import com.videomatch.core.domain.model.AdvertisementStatus
import com.videomatch.core.infrastructure.repository.AdvertisementRepositoryImpl
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import java.time.Instant
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(AdvertisementRepositoryImpl::class)
class AdvertisementRepositoryTest {

    companion object {
        @Container
        val postgres = PostgreSQLContainer<Nothing>("postgres:15-alpine").apply {
            withDatabaseName("videomatch_test")
            withUsername("test")
            withPassword("test")
        }

        @JvmStatic
        @DynamicPropertySource
        fun properties(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url", postgres::getJdbcUrl)
            registry.add("spring.datasource.username", postgres::getUsername)
            registry.add("spring.datasource.password", postgres::getPassword)
        }
    }

    @Autowired
    private lateinit var advertisementRepository: AdvertisementRepository

    @AfterEach
    fun cleanup() = runBlocking {
        advertisementRepository.findAll().forEach { ad ->
            advertisementRepository.delete(ad.id)
        }
    }

    @Test
    fun `should save advertisement`() = runBlocking {
        // Given
        val advertisement = Advertisement(
            title = "Summer Sale 2024",
            brandName = "Nike",
            videoPath = "/videos/nike-summer.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 1500,
            status = AdvertisementStatus.PROCESSING
        )

        // When
        val savedAd = advertisementRepository.save(advertisement)

        // Then
        assertNotNull(savedAd)
        assertEquals(advertisement.title, savedAd.title)
        assertEquals(advertisement.brandName, savedAd.brandName)
        assertEquals(advertisement.totalFrames, savedAd.totalFrames)
    }

    @Test
    fun `should find advertisement by id`() = runBlocking {
        // Given
        val advertisement = Advertisement(
            title = "Test Ad",
            brandName = "Test Brand",
            videoPath = "/videos/test.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 100,
            status = AdvertisementStatus.READY
        )
        val savedAd = advertisementRepository.save(advertisement)

        // When
        val foundAd = advertisementRepository.findById(savedAd.id)

        // Then
        assertNotNull(foundAd)
        assertEquals(savedAd.id, foundAd.id)
        assertEquals(savedAd.title, foundAd.title)
    }

    @Test
    fun `should return null when advertisement not found by id`() = runBlocking {
        // Given
        val nonExistentId = UUID.randomUUID()

        // When
        val foundAd = advertisementRepository.findById(nonExistentId)

        // Then
        assertNull(foundAd)
    }

    @Test
    fun `should find all advertisements`() = runBlocking {
        // Given
        val ad1 = Advertisement(
            title = "Ad 1",
            brandName = "Brand 1",
            videoPath = "/videos/ad1.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 100,
            status = AdvertisementStatus.READY
        )
        val ad2 = Advertisement(
            title = "Ad 2",
            brandName = "Brand 2",
            videoPath = "/videos/ad2.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 200,
            status = AdvertisementStatus.PROCESSING
        )
        advertisementRepository.save(ad1)
        advertisementRepository.save(ad2)

        // When
        val allAds = advertisementRepository.findAll()

        // Then
        assertEquals(2, allAds.size)
    }

    @Test
    fun `should find advertisements by brand name`() = runBlocking {
        // Given
        val ad1 = Advertisement(
            title = "Nike Ad 1",
            brandName = "Nike",
            videoPath = "/videos/nike1.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 100,
            status = AdvertisementStatus.READY
        )
        val ad2 = Advertisement(
            title = "Nike Ad 2",
            brandName = "Nike",
            videoPath = "/videos/nike2.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 150,
            status = AdvertisementStatus.READY
        )
        val ad3 = Advertisement(
            title = "Adidas Ad",
            brandName = "Adidas",
            videoPath = "/videos/adidas.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 200,
            status = AdvertisementStatus.READY
        )
        advertisementRepository.save(ad1)
        advertisementRepository.save(ad2)
        advertisementRepository.save(ad3)

        // When
        val nikeAds = advertisementRepository.findByBrandName("Nike")

        // Then
        assertEquals(2, nikeAds.size)
        assertTrue(nikeAds.all { it.brandName == "Nike" })
    }

    @Test
    fun `should return empty list when no advertisements found by brand name`() = runBlocking {
        // When
        val ads = advertisementRepository.findByBrandName("NonExistent")

        // Then
        assertTrue(ads.isEmpty())
    }

    @Test
    fun `should update advertisement`() = runBlocking {
        // Given
        val advertisement = Advertisement(
            title = "Original Title",
            brandName = "Test Brand",
            videoPath = "/videos/test.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 100,
            status = AdvertisementStatus.PROCESSING
        )
        val savedAd = advertisementRepository.save(advertisement)

        // When
        val updatedAd = savedAd.copy(
            title = "Updated Title",
            totalFrames = 150
        )
        val result = advertisementRepository.update(updatedAd)

        // Then
        assertNotNull(result)
        assertEquals("Updated Title", result.title)
        assertEquals(150, result.totalFrames)
        assertEquals(savedAd.id, result.id)
    }

    @Test
    fun `should update advertisement status`() = runBlocking {
        // Given
        val advertisement = Advertisement(
            title = "Test Ad",
            brandName = "Test Brand",
            videoPath = "/videos/test.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 100,
            status = AdvertisementStatus.PROCESSING
        )
        val savedAd = advertisementRepository.save(advertisement)

        // When
        val result = advertisementRepository.updateStatus(savedAd.id, AdvertisementStatus.READY)

        // Then
        assertNotNull(result)
        assertEquals(AdvertisementStatus.READY, result.status)
        assertEquals(savedAd.id, result.id)
    }

    @Test
    fun `should return null when updating status of non-existent advertisement`() = runBlocking {
        // Given
        val nonExistentId = UUID.randomUUID()

        // When
        val result = advertisementRepository.updateStatus(nonExistentId, AdvertisementStatus.READY)

        // Then
        assertNull(result)
    }

    @Test
    fun `should delete advertisement`() = runBlocking {
        // Given
        val advertisement = Advertisement(
            title = "Test Ad",
            brandName = "Test Brand",
            videoPath = "/videos/test.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 100,
            status = AdvertisementStatus.READY
        )
        val savedAd = advertisementRepository.save(advertisement)

        // When
        advertisementRepository.delete(savedAd.id)

        // Then
        val foundAd = advertisementRepository.findById(savedAd.id)
        assertNull(foundAd)
    }

    @Test
    fun `should handle advertisements with different statuses`() = runBlocking {
        // Given
        val processingAd = Advertisement(
            title = "Processing Ad",
            brandName = "Brand",
            videoPath = "/videos/processing.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 100,
            status = AdvertisementStatus.PROCESSING
        )
        val readyAd = Advertisement(
            title = "Ready Ad",
            brandName = "Brand",
            videoPath = "/videos/ready.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 100,
            status = AdvertisementStatus.READY
        )
        val failedAd = Advertisement(
            title = "Failed Ad",
            brandName = "Brand",
            videoPath = "/videos/failed.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 100,
            status = AdvertisementStatus.FAILED
        )

        // When
        val saved1 = advertisementRepository.save(processingAd)
        val saved2 = advertisementRepository.save(readyAd)
        val saved3 = advertisementRepository.save(failedAd)

        // Then
        assertEquals(AdvertisementStatus.PROCESSING, saved1.status)
        assertEquals(AdvertisementStatus.READY, saved2.status)
        assertEquals(AdvertisementStatus.FAILED, saved3.status)
    }

    @Test
    fun `should handle large totalFrames values`() = runBlocking {
        // Given
        val advertisement = Advertisement(
            title = "Long Video",
            brandName = "Brand",
            videoPath = "/videos/long.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 100000,
            status = AdvertisementStatus.READY
        )

        // When
        val savedAd = advertisementRepository.save(advertisement)

        // Then
        assertEquals(100000, savedAd.totalFrames)
    }
}
