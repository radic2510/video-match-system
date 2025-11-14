package com.videomatch.core.application.dto

import com.videomatch.core.domain.model.*
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import java.time.Instant
import java.util.UUID

/**
 * Unit tests for DTOs and mapper functions
 * Tests serialization, deserialization, and mapping between domain models and DTOs
 */
class DTOsTest {

    // Test UserDTO mapping
    @Test
    fun `User should map to UserDTO correctly`() {
        // Given
        val user = User(
            id = UUID.randomUUID(),
            email = "test@example.com",
            name = "Test User",
            passwordHash = "hashed_password",
            role = UserRole.USER,
            createdAt = Instant.now()
        )

        // When
        val dto = user.toDTO()

        // Then
        assertEquals(user.id, dto.id)
        assertEquals(user.email, dto.email)
        assertEquals(user.name, dto.name)
        assertEquals(user.role.name, dto.role)
        assertEquals(user.createdAt, dto.createdAt)
        // Password hash should not be included in DTO
    }

    @Test
    fun `UserDTO should not contain password hash`() {
        // Given
        val user = User(
            id = UUID.randomUUID(),
            email = "test@example.com",
            name = "Test User",
            passwordHash = "secret_hash",
            role = UserRole.ADMIN,
            createdAt = Instant.now()
        )

        // When
        val dto = user.toDTO()

        // Then
        // Verify DTO class doesn't have passwordHash field
        assertFalse(dto::class.java.declaredFields.any { it.name == "passwordHash" })
    }

    // Test RegisterUserRequest
    @Test
    fun `RegisterUserRequest should have required fields`() {
        // Given/When
        val request = RegisterUserRequest(
            email = "test@example.com",
            password = "ValidPass123",
            name = "Test User"
        )

        // Then
        assertEquals("test@example.com", request.email)
        assertEquals("ValidPass123", request.password)
        assertEquals("Test User", request.name)
    }

    // Test LoginRequest and LoginResponse
    @Test
    fun `LoginRequest should have email and password`() {
        // Given/When
        val request = LoginRequest(
            email = "test@example.com",
            password = "ValidPass123"
        )

        // Then
        assertEquals("test@example.com", request.email)
        assertEquals("ValidPass123", request.password)
    }

    @Test
    fun `LoginResponse should contain user and token`() {
        // Given
        val user = User(
            id = UUID.randomUUID(),
            email = "test@example.com",
            name = "Test User",
            passwordHash = "hashed",
            role = UserRole.USER,
            createdAt = Instant.now()
        )
        val token = "jwt_token_here"

        // When
        val response = LoginResponse(
            user = user.toDTO(),
            token = token
        )

        // Then
        assertEquals(user.id, response.user.id)
        assertEquals(token, response.token)
    }

    // Test AdvertisementDTO mapping
    @Test
    fun `Advertisement should map to AdvertisementDTO correctly`() {
        // Given
        val advertisement = Advertisement(
            id = UUID.randomUUID(),
            title = "Summer Sale",
            brandName = "Nike",
            videoPath = "/videos/nike.mp4",
            uploadedAt = Instant.now(),
            totalFrames = 300,
            status = AdvertisementStatus.READY
        )

        // When
        val dto = advertisement.toDTO()

        // Then
        assertEquals(advertisement.id, dto.id)
        assertEquals(advertisement.title, dto.title)
        assertEquals(advertisement.brandName, dto.brandName)
        assertEquals(advertisement.videoPath, dto.videoPath)
        assertEquals(advertisement.uploadedAt, dto.uploadedAt)
        assertEquals(advertisement.totalFrames, dto.totalFrames)
        assertEquals(advertisement.status.name, dto.status)
    }

    // Test CreateAdvertisementRequest
    @Test
    fun `CreateAdvertisementRequest should have required fields`() {
        // Given/When
        val request = CreateAdvertisementRequest(
            title = "Summer Sale",
            brandName = "Nike",
            videoPath = "/videos/nike.mp4",
            totalFrames = 300
        )

        // Then
        assertEquals("Summer Sale", request.title)
        assertEquals("Nike", request.brandName)
        assertEquals("/videos/nike.mp4", request.videoPath)
        assertEquals(300, request.totalFrames)
    }

    // Test MatchDTO mapping
    @Test
    fun `Match should map to MatchDTO correctly without result`() {
        // Given
        val match = Match(
            id = UUID.randomUUID(),
            userId = UUID.randomUUID(),
            imageHash = "abc123",
            status = MatchStatus.QUEUED,
            result = null,
            queuePosition = 1,
            priority = 50.0,
            createdAt = Instant.now()
        )

        // When
        val dto = match.toDTO()

        // Then
        assertEquals(match.id, dto.id)
        assertEquals(match.userId, dto.userId)
        assertEquals(match.imageHash, dto.imageHash)
        assertEquals(match.status.name, dto.status)
        assertNull(dto.result)
        assertEquals(match.queuePosition, dto.queuePosition)
        assertEquals(match.priority, dto.priority)
        assertEquals(match.createdAt, dto.createdAt)
    }

    @Test
    fun `Match should map to MatchDTO correctly with result`() {
        // Given
        val matchResult = MatchResult(
            matchedVideoId = UUID.randomUUID(),
            confidence = 0.95,
            frame = 150,
            timestamp = 5.0,
            verificationScores = mapOf("sift" to 0.9, "color" to 0.85)
        )

        val match = Match(
            id = UUID.randomUUID(),
            userId = UUID.randomUUID(),
            imageHash = "abc123",
            status = MatchStatus.COMPLETED,
            result = matchResult,
            queuePosition = 0,
            priority = 50.0,
            createdAt = Instant.now()
        )

        // When
        val dto = match.toDTO()

        // Then
        assertNotNull(dto.result)
        assertEquals(matchResult.matchedVideoId, dto.result?.matchedVideoId)
        assertEquals(matchResult.confidence, dto.result?.confidence)
        assertEquals(matchResult.frame, dto.result?.frame)
        assertEquals(matchResult.timestamp, dto.result?.timestamp)
        assertEquals(matchResult.verificationScores, dto.result?.verificationScores)
    }

    // Test MatchResult mapping
    @Test
    fun `MatchResult should map to MatchResultDTO correctly`() {
        // Given
        val matchResult = MatchResult(
            matchedVideoId = UUID.randomUUID(),
            confidence = 0.95,
            frame = 150,
            timestamp = 5.0,
            verificationScores = mapOf("sift" to 0.9, "color" to 0.85, "ocr" to 0.8)
        )

        // When
        val dto = matchResult.toDTO()

        // Then
        assertEquals(matchResult.matchedVideoId, dto.matchedVideoId)
        assertEquals(matchResult.confidence, dto.confidence)
        assertEquals(matchResult.frame, dto.frame)
        assertEquals(matchResult.timestamp, dto.timestamp)
        assertEquals(matchResult.verificationScores, dto.verificationScores)
    }

    // Test CreateMatchRequest
    @Test
    fun `CreateMatchRequest should have required fields`() {
        // Given/When
        val request = CreateMatchRequest(
            imageHash = "abc123def456",
            priority = 50.0
        )

        // Then
        assertEquals("abc123def456", request.imageHash)
        assertEquals(50.0, request.priority)
    }

    @Test
    fun `CreateMatchRequest should use default priority if not specified`() {
        // Given/When
        val request = CreateMatchRequest(
            imageHash = "abc123def456"
        )

        // Then
        assertEquals("abc123def456", request.imageHash)
        assertEquals(50.0, request.priority) // Default priority
    }

    // Test DTO immutability and data classes
    @Test
    fun `DTOs should be immutable data classes`() {
        // Given
        val userId = UUID.randomUUID()
        val userDTO = UserDTO(
            id = userId,
            email = "test@example.com",
            name = "Test User",
            role = "USER",
            createdAt = Instant.now()
        )

        // When - create a copy with different email
        val copiedDTO = userDTO.copy(email = "new@example.com")

        // Then
        assertEquals(userId, copiedDTO.id)
        assertEquals("new@example.com", copiedDTO.email)
        assertEquals("Test User", copiedDTO.name)
        // Original should remain unchanged
        assertEquals("test@example.com", userDTO.email)
    }
}
