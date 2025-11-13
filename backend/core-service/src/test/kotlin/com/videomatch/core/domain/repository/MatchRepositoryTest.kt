package com.videomatch.core.domain.repository

import com.videomatch.core.domain.model.Match
import com.videomatch.core.domain.model.MatchResult
import com.videomatch.core.domain.model.MatchStatus
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
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
class MatchRepositoryTest {

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
    private lateinit var matchRepository: MatchRepository

    @AfterEach
    fun cleanup() = runBlocking {
        matchRepository.findAll().forEach { match ->
            matchRepository.delete(match.id)
        }
    }

    @Test
    fun `should save match`() = runBlocking {
        // Given
        val match = Match(
            userId = UUID.randomUUID(),
            imageHash = "abc123",
            status = MatchStatus.QUEUED,
            result = null,
            queuePosition = 5,
            priority = 3,
            createdAt = Instant.now()
        )

        // When
        val savedMatch = matchRepository.save(match)

        // Then
        assertNotNull(savedMatch)
        assertEquals(match.userId, savedMatch.userId)
        assertEquals(match.imageHash, savedMatch.imageHash)
        assertEquals(match.status, savedMatch.status)
    }

    @Test
    fun `should find match by id`() = runBlocking {
        // Given
        val match = Match(
            userId = UUID.randomUUID(),
            imageHash = "test123",
            status = MatchStatus.QUEUED,
            result = null,
            queuePosition = 1,
            priority = 5,
            createdAt = Instant.now()
        )
        val savedMatch = matchRepository.save(match)

        // When
        val foundMatch = matchRepository.findById(savedMatch.id)

        // Then
        assertNotNull(foundMatch)
        assertEquals(savedMatch.id, foundMatch.id)
        assertEquals(savedMatch.imageHash, foundMatch.imageHash)
    }

    @Test
    fun `should return null when match not found by id`() = runBlocking {
        // Given
        val nonExistentId = UUID.randomUUID()

        // When
        val foundMatch = matchRepository.findById(nonExistentId)

        // Then
        assertNull(foundMatch)
    }

    @Test
    fun `should find matches by user id`() = runBlocking {
        // Given
        val userId1 = UUID.randomUUID()
        val userId2 = UUID.randomUUID()

        val match1 = Match(
            userId = userId1,
            imageHash = "hash1",
            status = MatchStatus.COMPLETED,
            queuePosition = 0,
            priority = 5,
            createdAt = Instant.now()
        )
        val match2 = Match(
            userId = userId1,
            imageHash = "hash2",
            status = MatchStatus.QUEUED,
            queuePosition = 1,
            priority = 3,
            createdAt = Instant.now()
        )
        val match3 = Match(
            userId = userId2,
            imageHash = "hash3",
            status = MatchStatus.COMPLETED,
            queuePosition = 0,
            priority = 5,
            createdAt = Instant.now()
        )

        matchRepository.save(match1)
        matchRepository.save(match2)
        matchRepository.save(match3)

        // When
        val userMatches = matchRepository.findByUserId(userId1)

        // Then
        assertEquals(2, userMatches.size)
        assertTrue(userMatches.all { it.userId == userId1 })
    }

    @Test
    fun `should return empty list when no matches found by user id`() = runBlocking {
        // Given
        val userId = UUID.randomUUID()

        // When
        val matches = matchRepository.findByUserId(userId)

        // Then
        assertTrue(matches.isEmpty())
    }

    @Test
    fun `should find matches by status`() = runBlocking {
        // Given
        val match1 = Match(
            userId = UUID.randomUUID(),
            imageHash = "hash1",
            status = MatchStatus.QUEUED,
            queuePosition = 1,
            priority = 5,
            createdAt = Instant.now()
        )
        val match2 = Match(
            userId = UUID.randomUUID(),
            imageHash = "hash2",
            status = MatchStatus.QUEUED,
            queuePosition = 2,
            priority = 3,
            createdAt = Instant.now()
        )
        val match3 = Match(
            userId = UUID.randomUUID(),
            imageHash = "hash3",
            status = MatchStatus.PROCESSING,
            queuePosition = 0,
            priority = 10,
            createdAt = Instant.now()
        )

        matchRepository.save(match1)
        matchRepository.save(match2)
        matchRepository.save(match3)

        // When
        val queuedMatches = matchRepository.findByStatus(MatchStatus.QUEUED)

        // Then
        assertEquals(2, queuedMatches.size)
        assertTrue(queuedMatches.all { it.status == MatchStatus.QUEUED })
    }

    @Test
    fun `should update match status`() = runBlocking {
        // Given
        val match = Match(
            userId = UUID.randomUUID(),
            imageHash = "test123",
            status = MatchStatus.QUEUED,
            queuePosition = 5,
            priority = 3,
            createdAt = Instant.now()
        )
        val savedMatch = matchRepository.save(match)

        // When
        val result = matchRepository.updateStatus(savedMatch.id, MatchStatus.PROCESSING)

        // Then
        assertNotNull(result)
        assertEquals(MatchStatus.PROCESSING, result.status)
        assertEquals(savedMatch.id, result.id)
    }

    @Test
    fun `should return null when updating status of non-existent match`() = runBlocking {
        // Given
        val nonExistentId = UUID.randomUUID()

        // When
        val result = matchRepository.updateStatus(nonExistentId, MatchStatus.PROCESSING)

        // Then
        assertNull(result)
    }

    @Test
    fun `should update match result`() = runBlocking {
        // Given
        val match = Match(
            userId = UUID.randomUUID(),
            imageHash = "test123",
            status = MatchStatus.PROCESSING,
            result = null,
            queuePosition = 0,
            priority = 5,
            createdAt = Instant.now()
        )
        val savedMatch = matchRepository.save(match)

        val matchResult = MatchResult(
            matchedVideoId = UUID.randomUUID(),
            confidence = 0.95,
            frame = 150,
            timestamp = 5.0,
            verificationScores = mapOf("clip" to 0.92, "dino" to 0.88)
        )

        // When
        val result = matchRepository.updateResult(savedMatch.id, matchResult)

        // Then
        assertNotNull(result)
        assertNotNull(result.result)
        assertEquals(matchResult.matchedVideoId, result.result?.matchedVideoId)
        assertEquals(matchResult.confidence, result.result?.confidence)
    }

    @Test
    fun `should return null when updating result of non-existent match`() = runBlocking {
        // Given
        val nonExistentId = UUID.randomUUID()
        val matchResult = MatchResult(
            matchedVideoId = UUID.randomUUID(),
            confidence = 0.95,
            frame = 150,
            timestamp = 5.0,
            verificationScores = mapOf()
        )

        // When
        val result = matchRepository.updateResult(nonExistentId, matchResult)

        // Then
        assertNull(result)
    }

    @Test
    fun `should delete match`() = runBlocking {
        // Given
        val match = Match(
            userId = UUID.randomUUID(),
            imageHash = "test123",
            status = MatchStatus.COMPLETED,
            queuePosition = 0,
            priority = 5,
            createdAt = Instant.now()
        )
        val savedMatch = matchRepository.save(match)

        // When
        matchRepository.delete(savedMatch.id)

        // Then
        val foundMatch = matchRepository.findById(savedMatch.id)
        assertNull(foundMatch)
    }

    @Test
    fun `should handle all match statuses`() = runBlocking {
        // Given
        val queuedMatch = Match(
            userId = UUID.randomUUID(),
            imageHash = "queued",
            status = MatchStatus.QUEUED,
            queuePosition = 1,
            priority = 5,
            createdAt = Instant.now()
        )
        val processingMatch = Match(
            userId = UUID.randomUUID(),
            imageHash = "processing",
            status = MatchStatus.PROCESSING,
            queuePosition = 0,
            priority = 10,
            createdAt = Instant.now()
        )
        val completedMatch = Match(
            userId = UUID.randomUUID(),
            imageHash = "completed",
            status = MatchStatus.COMPLETED,
            queuePosition = 0,
            priority = 5,
            createdAt = Instant.now()
        )
        val failedMatch = Match(
            userId = UUID.randomUUID(),
            imageHash = "failed",
            status = MatchStatus.FAILED,
            queuePosition = 0,
            priority = 5,
            createdAt = Instant.now()
        )

        // When
        val saved1 = matchRepository.save(queuedMatch)
        val saved2 = matchRepository.save(processingMatch)
        val saved3 = matchRepository.save(completedMatch)
        val saved4 = matchRepository.save(failedMatch)

        // Then
        assertEquals(MatchStatus.QUEUED, saved1.status)
        assertEquals(MatchStatus.PROCESSING, saved2.status)
        assertEquals(MatchStatus.COMPLETED, saved3.status)
        assertEquals(MatchStatus.FAILED, saved4.status)
    }

    @Test
    fun `should find all matches`() = runBlocking {
        // Given
        val match1 = Match(
            userId = UUID.randomUUID(),
            imageHash = "hash1",
            status = MatchStatus.COMPLETED,
            queuePosition = 0,
            priority = 5,
            createdAt = Instant.now()
        )
        val match2 = Match(
            userId = UUID.randomUUID(),
            imageHash = "hash2",
            status = MatchStatus.QUEUED,
            queuePosition = 1,
            priority = 3,
            createdAt = Instant.now()
        )
        matchRepository.save(match1)
        matchRepository.save(match2)

        // When
        val allMatches = matchRepository.findAll()

        // Then
        assertEquals(2, allMatches.size)
    }

    @Test
    fun `should preserve match result verification scores`() = runBlocking {
        // Given
        val match = Match(
            userId = UUID.randomUUID(),
            imageHash = "test123",
            status = MatchStatus.PROCESSING,
            queuePosition = 0,
            priority = 5,
            createdAt = Instant.now()
        )
        val savedMatch = matchRepository.save(match)

        val verificationScores = mapOf(
            "clip" to 0.92,
            "dino" to 0.88,
            "sift" to 0.95,
            "color" to 0.85,
            "ocr" to 0.90
        )

        val matchResult = MatchResult(
            matchedVideoId = UUID.randomUUID(),
            confidence = 0.90,
            frame = 100,
            timestamp = 3.3,
            verificationScores = verificationScores
        )

        // When
        val result = matchRepository.updateResult(savedMatch.id, matchResult)

        // Then
        assertNotNull(result?.result)
        assertEquals(5, result?.result?.verificationScores?.size)
        assertEquals(0.92, result?.result?.verificationScores?.get("clip"))
        assertEquals(0.88, result?.result?.verificationScores?.get("dino"))
    }
}
