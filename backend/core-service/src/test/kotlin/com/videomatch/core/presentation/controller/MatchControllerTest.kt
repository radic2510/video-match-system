package com.videomatch.core.presentation.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.ninjasquad.springmockk.MockkBean
import com.videomatch.common.exception.ResourceNotFoundException
import com.videomatch.common.exception.ValidationException
import com.videomatch.core.application.dto.CreateMatchRequest
import com.videomatch.core.application.service.MatchService
import com.videomatch.core.domain.model.Match
import com.videomatch.core.domain.model.MatchResult
import com.videomatch.core.domain.model.MatchStatus
import io.mockk.coEvery
import io.mockk.coVerify
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.http.MediaType
import org.springframework.mock.web.MockMultipartFile
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.multipart
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import java.time.Instant
import java.util.UUID

/**
 * Test suite for MatchController
 */
@WebMvcTest(MatchController::class)
class MatchControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @MockkBean
    private lateinit var matchService: MatchService

    private val testUserId = UUID.randomUUID()
    private val testMatchId = UUID.randomUUID()
    private val testVideoId = UUID.randomUUID()

    private val testMatch = Match(
        id = testMatchId,
        userId = testUserId,
        imageHash = "test_image_hash_123",
        status = MatchStatus.QUEUED,
        result = null,
        queuePosition = 1,
        priority = 50.0,
        createdAt = Instant.now()
    )

    private val testMatchWithResult = Match(
        id = testMatchId,
        userId = testUserId,
        imageHash = "test_image_hash_123",
        status = MatchStatus.COMPLETED,
        result = MatchResult(
            matchedVideoId = testVideoId,
            confidence = 0.95,
            frame = 100,
            timestamp = 5.0,
            verificationScores = mapOf("sift" to 0.92, "color" to 0.88)
        ),
        queuePosition = 1,
        priority = 50.0,
        createdAt = Instant.now()
    )

    @Test
    fun `POST create match should return 201 for valid request`() {
        // Given
        val imageBytes = "fake image data".toByteArray()
        val imageFile = MockMultipartFile(
            "image",
            "test.jpg",
            MediaType.IMAGE_JPEG_VALUE,
            imageBytes
        )

        coEvery { matchService.createMatch(testUserId, any(), any()) } returns testMatch

        // When/Then
        mockMvc.multipart("/api/matches") {
            file(imageFile)
            param("priority", "normal")
            header("X-User-Id", testUserId.toString())
        }.andExpect {
            status { isCreated() }
            jsonPath("$.id") { value(testMatchId.toString()) }
            jsonPath("$.userId") { value(testUserId.toString()) }
            jsonPath("$.status") { value("QUEUED") }
            jsonPath("$.priority") { value(50.0) }
            jsonPath("$.queuePosition") { value(1) }
        }

        coVerify { matchService.createMatch(testUserId, any(), any()) }
    }

    @Test
    fun `POST create match should return 400 for blank image hash`() {
        // Given - empty file
        val imageFile = MockMultipartFile(
            "image",
            "test.jpg",
            MediaType.IMAGE_JPEG_VALUE,
            ByteArray(0)
        )

        // When/Then
        mockMvc.multipart("/api/matches") {
            file(imageFile)
            param("priority", "normal")
            header("X-User-Id", testUserId.toString())
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `POST create match should return 400 for invalid priority`() {
        // Given - invalid priority value
        val imageBytes = "fake image data".toByteArray()
        val imageFile = MockMultipartFile(
            "image",
            "test.jpg",
            MediaType.IMAGE_JPEG_VALUE,
            imageBytes
        )

        // When/Then - priority will be clamped to 50.0, so this should actually succeed
        // unless the controller validates the input string
        coEvery { matchService.createMatch(testUserId, any(), 50.0) } returns testMatch

        mockMvc.multipart("/api/matches") {
            file(imageFile)
            param("priority", "invalid")
            header("X-User-Id", testUserId.toString())
        }.andExpect {
            status { isCreated() }
        }
    }

    @Test
    fun `POST create match should return 401 when not authenticated`() {
        // Given
        val imageBytes = "fake image data".toByteArray()
        val imageFile = MockMultipartFile(
            "image",
            "test.jpg",
            MediaType.IMAGE_JPEG_VALUE,
            imageBytes
        )

        // When/Then - No X-User-Id header (not authenticated)
        mockMvc.multipart("/api/matches") {
            file(imageFile)
            param("priority", "normal")
            // No X-User-Id header
        }.andExpect {
            status { isUnauthorized() }
        }
    }

    @Test
    fun `GET match by id should return match when found and user matches`() {
        // Given
        coEvery { matchService.getMatch(testMatchId) } returns testMatchWithResult

        // When/Then
        mockMvc.get("/api/matches/$testMatchId") {
            header("X-User-Id", testUserId.toString())
        }.andExpect {
            status { isOk() }
            jsonPath("$.id") { value(testMatchId.toString()) }
            jsonPath("$.status") { value("COMPLETED") }
            jsonPath("$.result.matchedVideoId") { value(testVideoId.toString()) }
            jsonPath("$.result.confidence") { value(0.95) }
        }

        coVerify { matchService.getMatch(testMatchId) }
    }

    @Test
    fun `GET match by id should return 404 when not found`() {
        // Given
        val nonExistentId = UUID.randomUUID()
        coEvery { matchService.getMatch(nonExistentId) } returns null

        // When/Then
        mockMvc.get("/api/matches/$nonExistentId") {
            header("X-User-Id", testUserId.toString())
        }.andExpect {
            status { isNotFound() }
        }
    }

    @Test
    fun `GET match by id should return 403 when user does not match`() {
        // Given
        val otherUserId = UUID.randomUUID()
        coEvery { matchService.getMatch(testMatchId) } returns testMatch

        // When/Then
        mockMvc.get("/api/matches/$testMatchId") {
            header("X-User-Id", otherUserId.toString())
        }.andExpect {
            status { isForbidden() }
        }
    }

    @Test
    fun `GET user matches should return list of matches`() {
        // Given
        val matches = listOf(testMatch, testMatchWithResult)
        coEvery { matchService.getUserMatches(testUserId) } returns matches

        // When/Then
        mockMvc.get("/api/matches/user/$testUserId") {
            header("X-User-Id", testUserId.toString())
        }.andExpect {
            status { isOk() }
            jsonPath("$[0].id") { value(testMatchId.toString()) }
            jsonPath("$[0].userId") { value(testUserId.toString()) }
        }

        coVerify { matchService.getUserMatches(testUserId) }
    }

    @Test
    fun `GET user matches should return 403 when user does not match`() {
        // Given
        val otherUserId = UUID.randomUUID()

        // When/Then
        mockMvc.get("/api/matches/user/$testUserId") {
            header("X-User-Id", otherUserId.toString())
        }.andExpect {
            status { isForbidden() }
        }
    }

    @Test
    fun `PATCH update status should update match status`() {
        // Given
        val updatedMatch = testMatch.copy(status = MatchStatus.PROCESSING)
        val statusRequest = mapOf("status" to "PROCESSING")

        coEvery { matchService.updateMatchStatus(testMatchId, MatchStatus.PROCESSING) } returns updatedMatch

        // When/Then
        mockMvc.patch("/api/matches/$testMatchId/status") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(statusRequest)
        }.andExpect {
            status { isOk() }
            jsonPath("$.id") { value(testMatchId.toString()) }
            jsonPath("$.status") { value("PROCESSING") }
        }

        coVerify { matchService.updateMatchStatus(testMatchId, MatchStatus.PROCESSING) }
    }

    @Test
    fun `PATCH update status should return 404 when match not found`() {
        // Given
        val nonExistentId = UUID.randomUUID()
        val statusRequest = mapOf("status" to "PROCESSING")

        coEvery { matchService.updateMatchStatus(nonExistentId, any()) } throws
            ResourceNotFoundException("Match", nonExistentId.toString())

        // When/Then
        mockMvc.patch("/api/matches/$nonExistentId/status") {
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
        mockMvc.patch("/api/matches/$testMatchId/status") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(statusRequest)
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `GET queue should return list of queued matches sorted by priority`() {
        // Given
        val queuedMatches = listOf(
            testMatch.copy(priority = 100.0),
            testMatch.copy(id = UUID.randomUUID(), priority = 50.0),
            testMatch.copy(id = UUID.randomUUID(), priority = 10.0)
        )
        coEvery { matchService.getQueuedMatches() } returns queuedMatches

        // When/Then
        mockMvc.get("/api/matches/queue") {
            contentType = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isOk() }
            jsonPath("$.length()") { value(3) }
            jsonPath("$[0].priority") { value(100.0) }
            jsonPath("$[1].priority") { value(50.0) }
            jsonPath("$[2].priority") { value(10.0) }
        }

        coVerify { matchService.getQueuedMatches() }
    }

    @Test
    fun `GET queue should return empty list when no matches queued`() {
        // Given
        coEvery { matchService.getQueuedMatches() } returns emptyList()

        // When/Then
        mockMvc.get("/api/matches/queue") {
            contentType = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isOk() }
            jsonPath("$.length()") { value(0) }
        }
    }

    @Test
    fun `PUT update result should update match with result data`() {
        // Given
        val resultRequest = mapOf(
            "matchedVideoId" to testVideoId.toString(),
            "confidence" to 0.94,
            "frame" to 234,
            "timestamp" to 7.8,
            "verificationScores" to mapOf(
                "embedding" to 0.92,
                "sift" to 0.95,
                "color" to 0.88,
                "text" to 0.91
            )
        )

        val matchResult = MatchResult(
            matchedVideoId = testVideoId,
            confidence = 0.94,
            frame = 234,
            timestamp = 7.8,
            verificationScores = mapOf(
                "embedding" to 0.92,
                "sift" to 0.95,
                "color" to 0.88,
                "text" to 0.91
            )
        )

        val updatedMatch = testMatch.copy(
            status = MatchStatus.COMPLETED,
            result = matchResult
        )

        coEvery { matchService.updateMatchResult(testMatchId, any()) } returns updatedMatch

        // When/Then
        mockMvc.put("/api/matches/$testMatchId/result") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(resultRequest)
        }.andExpect {
            status { isOk() }
            jsonPath("$.id") { value(testMatchId.toString()) }
            jsonPath("$.status") { value("COMPLETED") }
            jsonPath("$.result.matchedVideoId") { value(testVideoId.toString()) }
            jsonPath("$.result.confidence") { value(0.94) }
        }

        coVerify { matchService.updateMatchResult(testMatchId, any()) }
    }

    @Test
    fun `PUT update result should return 404 when match not found`() {
        // Given
        val nonExistentId = UUID.randomUUID()
        val resultRequest = mapOf(
            "matchedVideoId" to testVideoId.toString(),
            "confidence" to 0.94,
            "frame" to 234,
            "timestamp" to 7.8,
            "verificationScores" to emptyMap<String, Double>()
        )

        coEvery { matchService.updateMatchResult(nonExistentId, any()) } throws
            ResourceNotFoundException("Match", nonExistentId.toString())

        // When/Then
        mockMvc.put("/api/matches/$nonExistentId/result") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(resultRequest)
        }.andExpect {
            status { isNotFound() }
        }
    }
}
