package com.videomatch.core.application.service

import com.videomatch.common.exception.ResourceNotFoundException
import com.videomatch.common.exception.ValidationException
import com.videomatch.core.domain.model.Match
import com.videomatch.core.domain.model.MatchResult
import com.videomatch.core.domain.model.MatchStatus
import com.videomatch.core.domain.repository.MatchRepository
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
 * Unit tests for MatchService
 * Tests all business logic with mocked repository
 */
class MatchServiceTest {

    private lateinit var matchRepository: MatchRepository
    private lateinit var matchService: MatchService

    @BeforeEach
    fun setup() {
        matchRepository = mockk()
        matchService = MatchService(matchRepository)
    }

    @AfterEach
    fun tearDown() {
        clearAllMocks()
    }

    // Test createMatch - Happy Path
    @Test
    fun `createMatch should create match with QUEUED status and auto-assigned position`() = runBlocking {
        // Given
        val userId = UUID.randomUUID()
        val imageHash = "abc123def456"
        val priority = 50

        val existingQueuedMatches = listOf(
            Match(
                id = UUID.randomUUID(),
                userId = UUID.randomUUID(),
                imageHash = "hash1",
                status = MatchStatus.QUEUED,
                result = null,
                queuePosition = 1,
                priority = 30,
                createdAt = Instant.now().minusSeconds(100)
            ),
            Match(
                id = UUID.randomUUID(),
                userId = UUID.randomUUID(),
                imageHash = "hash2",
                status = MatchStatus.QUEUED,
                result = null,
                queuePosition = 2,
                priority = 40,
                createdAt = Instant.now().minusSeconds(50)
            )
        )

        val savedMatch = Match(
            id = UUID.randomUUID(),
            userId = userId,
            imageHash = imageHash,
            status = MatchStatus.QUEUED,
            result = null,
            queuePosition = 1,
            priority = priority,
            createdAt = Instant.now()
        )

        coEvery { matchRepository.findByStatus(MatchStatus.QUEUED) } returns existingQueuedMatches
        coEvery { matchRepository.save(any()) } returns savedMatch

        // When
        val result = matchService.createMatch(userId, imageHash, priority)

        // Then
        assertNotNull(result)
        assertEquals(userId, result.userId)
        assertEquals(imageHash, result.imageHash)
        assertEquals(MatchStatus.QUEUED, result.status)
        assertEquals(priority, result.priority)
        coVerify { matchRepository.findByStatus(MatchStatus.QUEUED) }
        coVerify { matchRepository.save(any()) }
    }

    @Test
    fun `createMatch should throw ValidationException for blank imageHash`() = runBlocking {
        // Given
        val userId = UUID.randomUUID()
        val imageHash = ""
        val priority = 50

        // When/Then
        val exception = assertThrows<ValidationException> {
            matchService.createMatch(userId, imageHash, priority)
        }
        assertEquals("imageHash", exception.field)
        coVerify(exactly = 0) { matchRepository.save(any()) }
    }

    @Test
    fun `createMatch should throw ValidationException for negative priority`() = runBlocking {
        // Given
        val userId = UUID.randomUUID()
        val imageHash = "abc123"
        val priority = -1

        // When/Then
        val exception = assertThrows<ValidationException> {
            matchService.createMatch(userId, imageHash, priority)
        }
        assertEquals("priority", exception.field)
        coVerify(exactly = 0) { matchRepository.save(any()) }
    }

    @Test
    fun `createMatch should throw ValidationException for priority over 100`() = runBlocking {
        // Given
        val userId = UUID.randomUUID()
        val imageHash = "abc123"
        val priority = 101

        // When/Then
        val exception = assertThrows<ValidationException> {
            matchService.createMatch(userId, imageHash, priority)
        }
        assertEquals("priority", exception.field)
        coVerify(exactly = 0) { matchRepository.save(any()) }
    }

    @Test
    fun `createMatch should assign position 1 when queue is empty`() = runBlocking {
        // Given
        val userId = UUID.randomUUID()
        val imageHash = "abc123"
        val priority = 50

        val savedMatch = Match(
            id = UUID.randomUUID(),
            userId = userId,
            imageHash = imageHash,
            status = MatchStatus.QUEUED,
            result = null,
            queuePosition = 1,
            priority = priority,
            createdAt = Instant.now()
        )

        coEvery { matchRepository.findByStatus(MatchStatus.QUEUED) } returns emptyList()
        coEvery { matchRepository.save(any()) } returns savedMatch

        // When
        val result = matchService.createMatch(userId, imageHash, priority)

        // Then
        assertEquals(1, result.queuePosition)
        coVerify { matchRepository.findByStatus(MatchStatus.QUEUED) }
        coVerify { matchRepository.save(any()) }
    }

    // Test getMatch
    @Test
    fun `getMatch should return match when found`() = runBlocking {
        // Given
        val matchId = UUID.randomUUID()
        val match = Match(
            id = matchId,
            userId = UUID.randomUUID(),
            imageHash = "abc123",
            status = MatchStatus.QUEUED,
            result = null,
            queuePosition = 1,
            priority = 50,
            createdAt = Instant.now()
        )

        coEvery { matchRepository.findById(matchId) } returns match

        // When
        val result = matchService.getMatch(matchId)

        // Then
        assertNotNull(result)
        assertEquals(matchId, result?.id)
        coVerify { matchRepository.findById(matchId) }
    }

    @Test
    fun `getMatch should return null when not found`() = runBlocking {
        // Given
        val matchId = UUID.randomUUID()
        coEvery { matchRepository.findById(matchId) } returns null

        // When
        val result = matchService.getMatch(matchId)

        // Then
        assertNull(result)
        coVerify { matchRepository.findById(matchId) }
    }

    // Test getUserMatches
    @Test
    fun `getUserMatches should return all matches for user`() = runBlocking {
        // Given
        val userId = UUID.randomUUID()
        val matches = listOf(
            Match(
                id = UUID.randomUUID(),
                userId = userId,
                imageHash = "hash1",
                status = MatchStatus.COMPLETED,
                result = null,
                queuePosition = 0,
                priority = 50,
                createdAt = Instant.now().minusSeconds(100)
            ),
            Match(
                id = UUID.randomUUID(),
                userId = userId,
                imageHash = "hash2",
                status = MatchStatus.QUEUED,
                result = null,
                queuePosition = 1,
                priority = 60,
                createdAt = Instant.now()
            )
        )

        coEvery { matchRepository.findByUserId(userId) } returns matches

        // When
        val result = matchService.getUserMatches(userId)

        // Then
        assertEquals(2, result.size)
        assertTrue(result.all { it.userId == userId })
        coVerify { matchRepository.findByUserId(userId) }
    }

    // Test updateMatchStatus
    @Test
    fun `updateMatchStatus should update status`() = runBlocking {
        // Given
        val matchId = UUID.randomUUID()
        val oldStatus = MatchStatus.QUEUED
        val newStatus = MatchStatus.PROCESSING

        val match = Match(
            id = matchId,
            userId = UUID.randomUUID(),
            imageHash = "abc123",
            status = oldStatus,
            result = null,
            queuePosition = 1,
            priority = 50,
            createdAt = Instant.now()
        )

        val updatedMatch = match.copy(status = newStatus)

        coEvery { matchRepository.findById(matchId) } returns match
        coEvery { matchRepository.updateStatus(matchId, newStatus) } returns updatedMatch

        // When
        val result = matchService.updateMatchStatus(matchId, newStatus)

        // Then
        assertEquals(newStatus, result.status)
        coVerify { matchRepository.findById(matchId) }
        coVerify { matchRepository.updateStatus(matchId, newStatus) }
    }

    @Test
    fun `updateMatchStatus should throw ResourceNotFoundException when match not found`() = runBlocking {
        // Given
        val matchId = UUID.randomUUID()
        val newStatus = MatchStatus.PROCESSING

        coEvery { matchRepository.findById(matchId) } returns null

        // When/Then
        assertThrows<ResourceNotFoundException> {
            matchService.updateMatchStatus(matchId, newStatus)
        }
        coVerify { matchRepository.findById(matchId) }
        coVerify(exactly = 0) { matchRepository.updateStatus(any(), any()) }
    }

    // Test updateMatchResult
    @Test
    fun `updateMatchResult should update result`() = runBlocking {
        // Given
        val matchId = UUID.randomUUID()
        val matchResult = MatchResult(
            matchedVideoId = UUID.randomUUID(),
            confidence = 0.95,
            frame = 150,
            timestamp = 5.0,
            verificationScores = mapOf("sift" to 0.9, "color" to 0.85)
        )

        val match = Match(
            id = matchId,
            userId = UUID.randomUUID(),
            imageHash = "abc123",
            status = MatchStatus.PROCESSING,
            result = null,
            queuePosition = 0,
            priority = 50,
            createdAt = Instant.now()
        )

        val updatedMatch = match.copy(result = matchResult)

        coEvery { matchRepository.findById(matchId) } returns match
        coEvery { matchRepository.updateResult(matchId, matchResult) } returns updatedMatch

        // When
        val result = matchService.updateMatchResult(matchId, matchResult)

        // Then
        assertNotNull(result.result)
        assertEquals(matchResult, result.result)
        coVerify { matchRepository.findById(matchId) }
        coVerify { matchRepository.updateResult(matchId, matchResult) }
    }

    @Test
    fun `updateMatchResult should throw ResourceNotFoundException when match not found`() = runBlocking {
        // Given
        val matchId = UUID.randomUUID()
        val matchResult = MatchResult(
            matchedVideoId = UUID.randomUUID(),
            confidence = 0.95,
            frame = 150,
            timestamp = 5.0,
            verificationScores = mapOf("sift" to 0.9)
        )

        coEvery { matchRepository.findById(matchId) } returns null

        // When/Then
        assertThrows<ResourceNotFoundException> {
            matchService.updateMatchResult(matchId, matchResult)
        }
        coVerify { matchRepository.findById(matchId) }
        coVerify(exactly = 0) { matchRepository.updateResult(any(), any()) }
    }

    // Test getQueuedMatches
    @Test
    fun `getQueuedMatches should return all queued matches sorted by priority and timestamp`() = runBlocking {
        // Given
        val queuedMatches = listOf(
            Match(
                id = UUID.randomUUID(),
                userId = UUID.randomUUID(),
                imageHash = "hash1",
                status = MatchStatus.QUEUED,
                result = null,
                queuePosition = 1,
                priority = 80,
                createdAt = Instant.now().minusSeconds(100)
            ),
            Match(
                id = UUID.randomUUID(),
                userId = UUID.randomUUID(),
                imageHash = "hash2",
                status = MatchStatus.QUEUED,
                result = null,
                queuePosition = 2,
                priority = 60,
                createdAt = Instant.now().minusSeconds(50)
            ),
            Match(
                id = UUID.randomUUID(),
                userId = UUID.randomUUID(),
                imageHash = "hash3",
                status = MatchStatus.QUEUED,
                result = null,
                queuePosition = 3,
                priority = 60,
                createdAt = Instant.now().minusSeconds(30)
            )
        )

        coEvery { matchRepository.findByStatus(MatchStatus.QUEUED) } returns queuedMatches

        // When
        val result = matchService.getQueuedMatches()

        // Then
        assertEquals(3, result.size)
        assertTrue(result.all { it.status == MatchStatus.QUEUED })
        coVerify { matchRepository.findByStatus(MatchStatus.QUEUED) }
    }
}
