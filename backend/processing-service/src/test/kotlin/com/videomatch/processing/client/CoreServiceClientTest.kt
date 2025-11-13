package com.videomatch.processing.client

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.videomatch.processing.dto.*
import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.web.reactive.function.client.WebClient
import java.time.Instant
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * Tests for CoreServiceClient
 * Uses MockWebServer to test HTTP interactions with Core Service
 */
class CoreServiceClientTest {

    private lateinit var mockWebServer: MockWebServer
    private lateinit var coreServiceClient: CoreServiceClient
    private lateinit var objectMapper: ObjectMapper

    @BeforeEach
    fun setup() {
        mockWebServer = MockWebServer()
        mockWebServer.start()

        val baseUrl = mockWebServer.url("/").toString().removeSuffix("/")
        val webClient = WebClient.builder().baseUrl(baseUrl).build()

        objectMapper = jacksonObjectMapper().apply {
            registerModule(JavaTimeModule())
        }

        coreServiceClient = CoreServiceClient(
            webClient = webClient,
            coreServiceUrl = baseUrl,
            matchesQueuePath = "/api/matches/queue",
            matchesStatusPath = "/api/matches/{id}/status",
            matchesResultPath = "/api/matches/{id}/result"
        )
    }

    @AfterEach
    fun tearDown() {
        mockWebServer.shutdown()
    }

    @Test
    fun `getQueuedMatches should return list of queued matches sorted by priority`() = runBlocking {
        // Given: Core Service returns queued matches
        val userId = UUID.randomUUID()
        val match1 = MatchDTO(
            id = UUID.randomUUID(),
            userId = userId,
            imageHash = "abc123def456",
            status = "QUEUED",
            result = null,
            queuePosition = 1,
            priority = 10,
            createdAt = Instant.parse("2025-01-15T10:00:00Z")
        )
        val match2 = MatchDTO(
            id = UUID.randomUUID(),
            userId = userId,
            imageHash = "xyz789uvw012",
            status = "QUEUED",
            result = null,
            queuePosition = 2,
            priority = 5,
            createdAt = Instant.parse("2025-01-15T10:01:00Z")
        )
        val queuedMatches = listOf(match1, match2)

        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .setBody(objectMapper.writeValueAsString(queuedMatches))
        )

        // When: Calling getQueuedMatches
        val result = coreServiceClient.getQueuedMatches()

        // Then: Should return list of matches
        assertNotNull(result)
        assertEquals(2, result.size)
        assertEquals(match1.id, result[0].id)
        assertEquals("QUEUED", result[0].status)
        assertEquals(10, result[0].priority)
        assertEquals(match2.id, result[1].id)

        // Verify request
        val recordedRequest = mockWebServer.takeRequest()
        assertEquals("/api/matches/queue", recordedRequest.path)
        assertEquals("GET", recordedRequest.method)
    }

    @Test
    fun `getQueuedMatches should return empty list when no matches queued`() = runBlocking {
        // Given: Core Service returns empty list
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .setBody("[]")
        )

        // When: Calling getQueuedMatches
        val result = coreServiceClient.getQueuedMatches()

        // Then: Should return empty list
        assertNotNull(result)
        assertTrue(result.isEmpty())
    }

    @Test
    fun `getQueuedMatches should return empty list on error`() = runBlocking {
        // Given: Core Service returns error
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(500)
                .setBody("Internal Server Error")
        )

        // When: Calling getQueuedMatches
        val result = coreServiceClient.getQueuedMatches()

        // Then: Should return empty list (graceful degradation)
        assertNotNull(result)
        assertTrue(result.isEmpty())
    }

    @Test
    fun `updateMatchStatus should successfully update status to PROCESSING`() = runBlocking {
        // Given: Core Service accepts status update
        val matchId = UUID.randomUUID()
        val userId = UUID.randomUUID()
        val updatedMatch = MatchDTO(
            id = matchId,
            userId = userId,
            imageHash = "abc123def456",
            status = "PROCESSING",
            result = null,
            queuePosition = 0,
            priority = 10,
            createdAt = Instant.parse("2025-01-15T10:00:00Z")
        )

        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .setBody(objectMapper.writeValueAsString(updatedMatch))
        )

        // When: Updating match status
        coreServiceClient.updateMatchStatus(matchId, "PROCESSING")

        // Verify request
        val recordedRequest = mockWebServer.takeRequest()
        assertEquals("/api/matches/$matchId/status", recordedRequest.path)
        assertEquals("PATCH", recordedRequest.method)

        // Verify request body
        val requestBody = recordedRequest.body.readUtf8()
        assertTrue(requestBody.contains("PROCESSING"))
    }

    @Test
    fun `updateMatchStatus should successfully update status to COMPLETED`() = runBlocking {
        // Given: Core Service accepts status update
        val matchId = UUID.randomUUID()
        val userId = UUID.randomUUID()
        val updatedMatch = MatchDTO(
            id = matchId,
            userId = userId,
            imageHash = "abc123def456",
            status = "COMPLETED",
            result = null,
            queuePosition = 0,
            priority = 10,
            createdAt = Instant.parse("2025-01-15T10:00:00Z")
        )

        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .setBody(objectMapper.writeValueAsString(updatedMatch))
        )

        // When: Updating match status
        coreServiceClient.updateMatchStatus(matchId, "COMPLETED")

        // Verify request was made
        val recordedRequest = mockWebServer.takeRequest()
        assertEquals("/api/matches/$matchId/status", recordedRequest.path)
    }

    @Test
    fun `updateMatchStatus should throw exception on error`() = runBlocking {
        // Given: Core Service returns error
        val matchId = UUID.randomUUID()

        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(404)
                .setBody("Match not found")
        )

        // When/Then: Should throw exception
        assertThrows<Exception> {
            coreServiceClient.updateMatchStatus(matchId, "PROCESSING")
        }
    }

    @Test
    fun `updateMatchResult should successfully update with match result`() = runBlocking {
        // Given: Core Service accepts result update
        val matchId = UUID.randomUUID()
        val userId = UUID.randomUUID()
        val videoId = UUID.randomUUID()

        val matchResult = MatchResultDTO(
            matchedVideoId = videoId,
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

        val updatedMatch = MatchDTO(
            id = matchId,
            userId = userId,
            imageHash = "abc123def456",
            status = "COMPLETED",
            result = matchResult,
            queuePosition = 0,
            priority = 10,
            createdAt = Instant.parse("2025-01-15T10:00:00Z")
        )

        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .setBody(objectMapper.writeValueAsString(updatedMatch))
        )

        // When: Updating match result
        val request = UpdateMatchResultRequest(
            matchedVideoId = videoId,
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
        coreServiceClient.updateMatchResult(matchId, request)

        // Verify request
        val recordedRequest = mockWebServer.takeRequest()
        assertEquals("/api/matches/$matchId/result", recordedRequest.path)
        assertEquals("PUT", recordedRequest.method)

        // Verify request body contains result data
        val requestBody = recordedRequest.body.readUtf8()
        assertTrue(requestBody.contains(videoId.toString()))
        assertTrue(requestBody.contains("0.94"))
    }

    @Test
    fun `updateMatchResult should throw exception on error`() = runBlocking {
        // Given: Core Service returns error
        val matchId = UUID.randomUUID()
        val videoId = UUID.randomUUID()

        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(500)
                .setBody("Internal Server Error")
        )

        // When/Then: Should throw exception
        val request = UpdateMatchResultRequest(
            matchedVideoId = videoId,
            confidence = 0.90,
            frame = 100,
            timestamp = 3.3,
            verificationScores = emptyMap()
        )

        assertThrows<Exception> {
            coreServiceClient.updateMatchResult(matchId, request)
        }
    }

    @Test
    fun `getQueuedMatches should handle network timeout gracefully`() = runBlocking {
        // Given: Server doesn't respond in time
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBodyDelay(10, java.util.concurrent.TimeUnit.SECONDS)
        )

        // When: Calling getQueuedMatches
        val result = coreServiceClient.getQueuedMatches()

        // Then: Should return empty list on timeout (graceful degradation)
        assertNotNull(result)
        assertTrue(result.isEmpty())
    }
}
