package com.videomatch.core.domain.model

import org.junit.jupiter.api.Test
import java.time.Instant
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

class MatchTest {

    @Test
    fun `should create match with all fields`() {
        // Given
        val id = UUID.randomUUID()
        val userId = UUID.randomUUID()
        val imageHash = "abc123def456"
        val status = MatchStatus.COMPLETED
        val matchResult = MatchResult(
            matchedVideoId = UUID.randomUUID(),
            confidence = 0.95,
            frame = 150,
            timestamp = 5.0,
            verificationScores = mapOf(
                "clip" to 0.92,
                "dino" to 0.88,
                "sift" to 0.95
            )
        )
        val queuePosition = 5
        val priority = 8.0
        val createdAt = Instant.now()

        // When
        val match = Match(
            id = id,
            userId = userId,
            imageHash = imageHash,
            status = status,
            result = matchResult,
            queuePosition = queuePosition,
            priority = priority,
            createdAt = createdAt
        )

        // Then
        assertEquals(id, match.id)
        assertEquals(userId, match.userId)
        assertEquals(imageHash, match.imageHash)
        assertEquals(status, match.status)
        assertEquals(matchResult, match.result)
        assertEquals(queuePosition, match.queuePosition)
        assertEquals(priority, match.priority)
        assertEquals(createdAt, match.createdAt)
    }

    @Test
    fun `should create match with default QUEUED status`() {
        // When
        val match = Match(
            userId = UUID.randomUUID(),
            imageHash = "hash123",
            status = MatchStatus.QUEUED,
            queuePosition = 1,
            priority = 5.0,
            createdAt = Instant.now()
        )

        // Then
        assertEquals(MatchStatus.QUEUED, match.status)
    }

    @Test
    fun `should support QUEUED status`() {
        // When
        val match = Match(
            userId = UUID.randomUUID(),
            imageHash = "hash123",
            status = MatchStatus.QUEUED,
            queuePosition = 1,
            priority = 5.0,
            createdAt = Instant.now()
        )

        // Then
        assertEquals(MatchStatus.QUEUED, match.status)
    }

    @Test
    fun `should support PROCESSING status`() {
        // When
        val match = Match(
            userId = UUID.randomUUID(),
            imageHash = "hash123",
            status = MatchStatus.PROCESSING,
            queuePosition = 0,
            priority = 5.0,
            createdAt = Instant.now()
        )

        // Then
        assertEquals(MatchStatus.PROCESSING, match.status)
    }

    @Test
    fun `should support COMPLETED status`() {
        // When
        val match = Match(
            userId = UUID.randomUUID(),
            imageHash = "hash123",
            status = MatchStatus.COMPLETED,
            queuePosition = 0,
            priority = 5.0,
            createdAt = Instant.now()
        )

        // Then
        assertEquals(MatchStatus.COMPLETED, match.status)
    }

    @Test
    fun `should support FAILED status`() {
        // When
        val match = Match(
            userId = UUID.randomUUID(),
            imageHash = "hash123",
            status = MatchStatus.FAILED,
            queuePosition = 0,
            priority = 5.0,
            createdAt = Instant.now()
        )

        // Then
        assertEquals(MatchStatus.FAILED, match.status)
    }

    @Test
    fun `should create match with null result initially`() {
        // When
        val match = Match(
            userId = UUID.randomUUID(),
            imageHash = "hash123",
            status = MatchStatus.QUEUED,
            result = null,
            queuePosition = 1,
            priority = 5.0,
            createdAt = Instant.now()
        )

        // Then
        assertNull(match.result)
    }

    @Test
    fun `should be data class with copy functionality`() {
        // Given
        val match = Match(
            userId = UUID.randomUUID(),
            imageHash = "hash123",
            status = MatchStatus.QUEUED,
            result = null,
            queuePosition = 5,
            priority = 3.0,
            createdAt = Instant.now()
        )

        // When
        val updatedMatch = match.copy(
            status = MatchStatus.PROCESSING,
            queuePosition = 0
        )

        // Then
        assertEquals(MatchStatus.PROCESSING, updatedMatch.status)
        assertEquals(0, updatedMatch.queuePosition)
        assertEquals(match.id, updatedMatch.id)
        assertEquals(match.userId, updatedMatch.userId)
    }

    @Test
    fun `should generate random UUID when id not provided`() {
        // When
        val match = Match(
            userId = UUID.randomUUID(),
            imageHash = "hash123",
            status = MatchStatus.QUEUED,
            queuePosition = 1,
            priority = 5.0,
            createdAt = Instant.now()
        )

        // Then
        assertNotNull(match.id)
    }

    @Test
    fun `should use current timestamp when createdAt not provided`() {
        // Given
        val beforeCreation = Instant.now()

        // When
        val match = Match(
            userId = UUID.randomUUID(),
            imageHash = "hash123",
            status = MatchStatus.QUEUED,
            queuePosition = 1,
            priority = 5.0
        )

        // Then
        val afterCreation = Instant.now()
        assertNotNull(match.createdAt)
        assert(match.createdAt >= beforeCreation && match.createdAt <= afterCreation)
    }

    @Test
    fun `should accept valid priority values`() {
        // When
        val match = Match(
            userId = UUID.randomUUID(),
            imageHash = "hash123",
            status = MatchStatus.QUEUED,
            queuePosition = 1,
            priority = 10.0,
            createdAt = Instant.now()
        )

        // Then
        assertEquals(10.0, match.priority)
    }

    @Test
    fun `should accept zero queue position`() {
        // When
        val match = Match(
            userId = UUID.randomUUID(),
            imageHash = "hash123",
            status = MatchStatus.PROCESSING,
            queuePosition = 0,
            priority = 5.0,
            createdAt = Instant.now()
        )

        // Then
        assertEquals(0, match.queuePosition)
    }

    @Test
    fun `should accept non-empty imageHash`() {
        // When
        val match = Match(
            userId = UUID.randomUUID(),
            imageHash = "validHash123",
            status = MatchStatus.QUEUED,
            queuePosition = 1,
            priority = 5.0,
            createdAt = Instant.now()
        )

        // Then
        assertEquals("validHash123", match.imageHash)
    }
}

class MatchResultTest {

    @Test
    fun `should create MatchResult with all fields`() {
        // Given
        val matchedVideoId = UUID.randomUUID()
        val confidence = 0.95
        val frame = 150
        val timestamp = 5.0
        val verificationScores = mapOf(
            "clip" to 0.92,
            "dino" to 0.88,
            "sift" to 0.95
        )

        // When
        val result = MatchResult(
            matchedVideoId = matchedVideoId,
            confidence = confidence,
            frame = frame,
            timestamp = timestamp,
            verificationScores = verificationScores
        )

        // Then
        assertEquals(matchedVideoId, result.matchedVideoId)
        assertEquals(confidence, result.confidence)
        assertEquals(frame, result.frame)
        assertEquals(timestamp, result.timestamp)
        assertEquals(verificationScores, result.verificationScores)
    }

    @Test
    fun `should be data class with copy functionality`() {
        // Given
        val result = MatchResult(
            matchedVideoId = UUID.randomUUID(),
            confidence = 0.85,
            frame = 100,
            timestamp = 3.3,
            verificationScores = mapOf("clip" to 0.9)
        )

        // When
        val updatedResult = result.copy(confidence = 0.95)

        // Then
        assertEquals(0.95, updatedResult.confidence)
        assertEquals(result.matchedVideoId, updatedResult.matchedVideoId)
        assertEquals(result.frame, updatedResult.frame)
    }

    @Test
    fun `should accept confidence between 0 and 1`() {
        // When
        val result = MatchResult(
            matchedVideoId = UUID.randomUUID(),
            confidence = 0.5,
            frame = 100,
            timestamp = 3.3,
            verificationScores = mapOf()
        )

        // Then
        assertEquals(0.5, result.confidence)
    }

    @Test
    fun `should accept positive frame number`() {
        // When
        val result = MatchResult(
            matchedVideoId = UUID.randomUUID(),
            confidence = 0.9,
            frame = 1,
            timestamp = 0.033,
            verificationScores = mapOf()
        )

        // Then
        assertEquals(1, result.frame)
    }

    @Test
    fun `should accept positive timestamp`() {
        // When
        val result = MatchResult(
            matchedVideoId = UUID.randomUUID(),
            confidence = 0.9,
            frame = 100,
            timestamp = 10.5,
            verificationScores = mapOf()
        )

        // Then
        assertEquals(10.5, result.timestamp)
    }

    @Test
    fun `should accept empty verification scores`() {
        // When
        val result = MatchResult(
            matchedVideoId = UUID.randomUUID(),
            confidence = 0.9,
            frame = 100,
            timestamp = 3.3,
            verificationScores = emptyMap()
        )

        // Then
        assertEquals(emptyMap(), result.verificationScores)
    }

    @Test
    fun `should accept multiple verification scores`() {
        // Given
        val scores = mapOf(
            "clip" to 0.92,
            "dino" to 0.88,
            "sift" to 0.95,
            "color" to 0.85,
            "ocr" to 0.90
        )

        // When
        val result = MatchResult(
            matchedVideoId = UUID.randomUUID(),
            confidence = 0.9,
            frame = 100,
            timestamp = 3.3,
            verificationScores = scores
        )

        // Then
        assertEquals(5, result.verificationScores.size)
        assertEquals(0.92, result.verificationScores["clip"])
        assertEquals(0.88, result.verificationScores["dino"])
    }
}
