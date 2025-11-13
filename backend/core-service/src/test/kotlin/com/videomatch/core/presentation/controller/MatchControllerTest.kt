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
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
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
        priority = 50,
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
        priority = 50,
        createdAt = Instant.now()
    )

    @Test
    fun `POST create match should return 201 for valid request`() {
        // Given
        val request = CreateMatchRequest(
            imageHash = "test_image_hash_123",
            priority = 50
        )

        coEvery { matchService.createMatch(testUserId, any(), any()) } returns testMatch

        // When/Then
        mockMvc.post("/api/matches") {
            header("X-User-Id", testUserId.toString()) // Simulate authenticated user
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.id") { value(testMatchId.toString()) }
            jsonPath("$.userId") { value(testUserId.toString()) }
            jsonPath("$.imageHash") { value("test_image_hash_123") }
            jsonPath("$.status") { value("QUEUED") }
            jsonPath("$.priority") { value(50) }
            jsonPath("$.queuePosition") { value(1) }
        }

        coVerify { matchService.createMatch(testUserId, "test_image_hash_123", 50) }
    }

    @Test
    fun `POST create match should return 400 for blank image hash`() {
        // Given
        val request = CreateMatchRequest(
            imageHash = "",
            priority = 50
        )

        coEvery { matchService.createMatch(any(), any(), any()) } throws
            ValidationException("imageHash", "Image hash must not be blank")

        // When/Then
        mockMvc.post("/api/matches") {
            header("X-User-Id", testUserId.toString())
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `POST create match should return 400 for invalid priority`() {
        // Given
        val request = CreateMatchRequest(
            imageHash = "test_image_hash_123",
            priority = 150
        )

        coEvery { matchService.createMatch(any(), any(), any()) } throws
            ValidationException("priority", "Priority must be between 0 and 100")

        // When/Then
        mockMvc.post("/api/matches") {
            header("X-User-Id", testUserId.toString())
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `POST create match should return 401 when not authenticated`() {
        // Given
        val request = CreateMatchRequest(
            imageHash = "test_image_hash_123",
            priority = 50
        )

        // When/Then - No X-User-Id header (not authenticated)
        mockMvc.post("/api/matches") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
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
}
