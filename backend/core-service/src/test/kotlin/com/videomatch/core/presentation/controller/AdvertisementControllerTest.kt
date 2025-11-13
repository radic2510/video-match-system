package com.videomatch.core.presentation.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.ninjasquad.springmockk.MockkBean
import com.videomatch.common.exception.ResourceNotFoundException
import com.videomatch.common.exception.ValidationException
import com.videomatch.core.application.dto.CreateAdvertisementRequest
import com.videomatch.core.application.service.AdvertisementService
import com.videomatch.core.domain.model.Advertisement
import com.videomatch.core.domain.model.AdvertisementStatus
import io.mockk.coEvery
import io.mockk.coVerify
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import java.time.Instant
import java.util.UUID

/**
 * Test suite for AdvertisementController
 */
@WebMvcTest(AdvertisementController::class)
class AdvertisementControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @MockkBean
    private lateinit var advertisementService: AdvertisementService

    private val testAdId = UUID.randomUUID()
    private val testAdvertisement = Advertisement(
        id = testAdId,
        title = "Test Ad",
        brandName = "Test Brand",
        videoPath = "/path/to/video.mp4",
        uploadedAt = Instant.now(),
        totalFrames = 1000,
        status = AdvertisementStatus.PROCESSING
    )

    @Test
    fun `POST create advertisement should return 201 for valid request`() {
        // Given
        val request = CreateAdvertisementRequest(
            title = "Test Ad",
            brandName = "Test Brand",
            videoPath = "/path/to/video.mp4",
            totalFrames = 1000
        )

        coEvery { advertisementService.createAdvertisement(any(), any(), any(), any()) } returns testAdvertisement

        // When/Then
        mockMvc.post("/api/advertisements") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.id") { value(testAdId.toString()) }
            jsonPath("$.title") { value("Test Ad") }
            jsonPath("$.brandName") { value("Test Brand") }
            jsonPath("$.status") { value("PROCESSING") }
        }

        coVerify { advertisementService.createAdvertisement("Test Ad", "Test Brand", "/path/to/video.mp4", 1000) }
    }

    @Test
    fun `POST create advertisement should return 400 for blank title`() {
        // Given
        val request = CreateAdvertisementRequest(
            title = "",
            brandName = "Test Brand",
            videoPath = "/path/to/video.mp4",
            totalFrames = 1000
        )

        coEvery { advertisementService.createAdvertisement(any(), any(), any(), any()) } throws
            ValidationException("title", "Title must not be blank")

        // When/Then
        mockMvc.post("/api/advertisements") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `POST create advertisement should return 400 for invalid total frames`() {
        // Given
        val request = CreateAdvertisementRequest(
            title = "Test Ad",
            brandName = "Test Brand",
            videoPath = "/path/to/video.mp4",
            totalFrames = -1
        )

        coEvery { advertisementService.createAdvertisement(any(), any(), any(), any()) } throws
            ValidationException("totalFrames", "Total frames must be greater than 0")

        // When/Then
        mockMvc.post("/api/advertisements") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `GET advertisement by id should return advertisement when found`() {
        // Given
        coEvery { advertisementService.getAdvertisement(testAdId) } returns testAdvertisement

        // When/Then
        mockMvc.get("/api/advertisements/$testAdId").andExpect {
            status { isOk() }
            jsonPath("$.id") { value(testAdId.toString()) }
            jsonPath("$.title") { value("Test Ad") }
            jsonPath("$.brandName") { value("Test Brand") }
        }

        coVerify { advertisementService.getAdvertisement(testAdId) }
    }

    @Test
    fun `GET advertisement by id should return 404 when not found`() {
        // Given
        val nonExistentId = UUID.randomUUID()
        coEvery { advertisementService.getAdvertisement(nonExistentId) } returns null

        // When/Then
        mockMvc.get("/api/advertisements/$nonExistentId").andExpect {
            status { isNotFound() }
        }
    }

    @Test
    fun `GET all advertisements should return list`() {
        // Given
        val advertisements = listOf(testAdvertisement)
        coEvery { advertisementService.listAdvertisements(null) } returns advertisements

        // When/Then
        mockMvc.get("/api/advertisements").andExpect {
            status { isOk() }
            jsonPath("$[0].id") { value(testAdId.toString()) }
            jsonPath("$[0].title") { value("Test Ad") }
        }

        coVerify { advertisementService.listAdvertisements(null) }
    }

    @Test
    fun `GET advertisements with brand filter should return filtered list`() {
        // Given
        val advertisements = listOf(testAdvertisement)
        coEvery { advertisementService.listAdvertisements("Test Brand") } returns advertisements

        // When/Then
        mockMvc.get("/api/advertisements?brandName=Test Brand").andExpect {
            status { isOk() }
            jsonPath("$[0].id") { value(testAdId.toString()) }
            jsonPath("$[0].brandName") { value("Test Brand") }
        }

        coVerify { advertisementService.listAdvertisements("Test Brand") }
    }

    @Test
    fun `PATCH update status should update advertisement status`() {
        // Given
        val updatedAd = testAdvertisement.copy(status = AdvertisementStatus.READY)
        val statusRequest = mapOf("status" to "READY")

        coEvery { advertisementService.updateStatus(testAdId, AdvertisementStatus.READY) } returns updatedAd

        // When/Then
        mockMvc.patch("/api/advertisements/$testAdId/status") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(statusRequest)
        }.andExpect {
            status { isOk() }
            jsonPath("$.id") { value(testAdId.toString()) }
            jsonPath("$.status") { value("READY") }
        }

        coVerify { advertisementService.updateStatus(testAdId, AdvertisementStatus.READY) }
    }

    @Test
    fun `PATCH update status should return 404 when advertisement not found`() {
        // Given
        val nonExistentId = UUID.randomUUID()
        val statusRequest = mapOf("status" to "READY")

        coEvery { advertisementService.updateStatus(nonExistentId, any()) } throws
            ResourceNotFoundException("Advertisement", nonExistentId.toString())

        // When/Then
        mockMvc.patch("/api/advertisements/$nonExistentId/status") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(statusRequest)
        }.andExpect {
            status { isNotFound() }
        }
    }

    @Test
    fun `PATCH update status should return 400 for invalid status`() {
        // Given
        val statusRequest = mapOf("status" to "INVALID_STATUS")

        // When/Then
        mockMvc.patch("/api/advertisements/$testAdId/status") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(statusRequest)
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `DELETE advertisement should return 204 when successful`() {
        // Given
        coEvery { advertisementService.deleteAdvertisement(testAdId) } returns true

        // When/Then
        mockMvc.delete("/api/advertisements/$testAdId").andExpect {
            status { isNoContent() }
        }

        coVerify { advertisementService.deleteAdvertisement(testAdId) }
    }

    @Test
    fun `DELETE advertisement should return 404 when advertisement not found`() {
        // Given
        val nonExistentId = UUID.randomUUID()
        coEvery { advertisementService.deleteAdvertisement(nonExistentId) } returns false

        // When/Then
        mockMvc.delete("/api/advertisements/$nonExistentId").andExpect {
            status { isNotFound() }
        }
    }
}
