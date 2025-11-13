package com.videomatch.core.application.service

import com.videomatch.core.domain.model.User
import com.videomatch.core.domain.model.UserRole
import io.jsonwebtoken.ExpiredJwtException
import io.jsonwebtoken.MalformedJwtException
import io.jsonwebtoken.security.SignatureException
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.util.UUID

/**
 * Test suite for JwtTokenService
 */
class JwtTokenServiceTest {

    private lateinit var jwtTokenService: JwtTokenService
    private lateinit var testUser: User

    @BeforeEach
    fun setUp() {
        // Use a test secret key
        jwtTokenService = JwtTokenService(
            secretKey = "test-secret-key-must-be-at-least-256-bits-long-for-HS256-algorithm",
            expirationMs = 3600000 // 1 hour
        )

        // Create a test user
        testUser = User(
            id = UUID.randomUUID(),
            email = "test@example.com",
            name = "Test User",
            passwordHash = "hashed_password",
            role = UserRole.USER
        )
    }

    @Test
    fun `generateToken should create valid JWT token`() {
        // When
        val token = jwtTokenService.generateToken(testUser)

        // Then
        assertNotNull(token)
        assertTrue(token.isNotBlank())
        assertTrue(token.split(".").size == 3) // JWT has 3 parts: header.payload.signature
    }

    @Test
    fun `validateToken should return true for valid token`() {
        // Given
        val token = jwtTokenService.generateToken(testUser)

        // When
        val isValid = jwtTokenService.validateToken(token)

        // Then
        assertTrue(isValid)
    }

    @Test
    fun `validateToken should return false for invalid token`() {
        // Given
        val invalidToken = "invalid.token.here"

        // When
        val isValid = jwtTokenService.validateToken(invalidToken)

        // Then
        assertFalse(isValid)
    }

    @Test
    fun `validateToken should return false for malformed token`() {
        // Given
        val malformedToken = "not-a-jwt-token"

        // When
        val isValid = jwtTokenService.validateToken(malformedToken)

        // Then
        assertFalse(isValid)
    }

    @Test
    fun `validateToken should return false for tampered token`() {
        // Given
        val token = jwtTokenService.generateToken(testUser)
        val tamperedToken = token.substring(0, token.length - 10) + "tampered00"

        // When
        val isValid = jwtTokenService.validateToken(tamperedToken)

        // Then
        assertFalse(isValid)
    }

    @Test
    fun `getUserIdFromToken should extract correct user ID`() {
        // Given
        val token = jwtTokenService.generateToken(testUser)

        // When
        val userId = jwtTokenService.getUserIdFromToken(token)

        // Then
        assertEquals(testUser.id, userId)
    }

    @Test
    fun `getUserIdFromToken should extract correct email`() {
        // Given
        val token = jwtTokenService.generateToken(testUser)

        // When
        val email = jwtTokenService.getEmailFromToken(token)

        // Then
        assertEquals(testUser.email, email)
    }

    @Test
    fun `getUserIdFromToken should throw exception for invalid token`() {
        // Given
        val invalidToken = "invalid.token.here"

        // When/Then
        assertThrows<Exception> {
            jwtTokenService.getUserIdFromToken(invalidToken)
        }
    }

    @Test
    fun `token should contain subject claim with user ID`() {
        // Given
        val token = jwtTokenService.generateToken(testUser)

        // When
        val userId = jwtTokenService.getUserIdFromToken(token)

        // Then
        assertEquals(testUser.id, userId)
    }

    @Test
    fun `expired token should fail validation`() {
        // Given - service with very short expiration
        val shortLivedService = JwtTokenService(
            secretKey = "test-secret-key-must-be-at-least-256-bits-long-for-HS256-algorithm",
            expirationMs = -1 // Already expired
        )
        val expiredToken = shortLivedService.generateToken(testUser)

        // When/Then
        assertFalse(jwtTokenService.validateToken(expiredToken))
    }

    @Test
    fun `tokens for different users should be different`() {
        // Given
        val user1 = testUser
        val user2 = User(
            id = UUID.randomUUID(),
            email = "user2@example.com",
            name = "User Two",
            passwordHash = "hashed_password",
            role = UserRole.USER
        )

        // When
        val token1 = jwtTokenService.generateToken(user1)
        val token2 = jwtTokenService.generateToken(user2)

        // Then
        assertNotEquals(token1, token2)
    }

    @Test
    fun `getUserIdFromToken should return correct ID for multiple users`() {
        // Given
        val user1 = testUser
        val user2 = User(
            id = UUID.randomUUID(),
            email = "user2@example.com",
            name = "User Two",
            passwordHash = "hashed_password",
            role = UserRole.USER
        )

        val token1 = jwtTokenService.generateToken(user1)
        val token2 = jwtTokenService.generateToken(user2)

        // When
        val userId1 = jwtTokenService.getUserIdFromToken(token1)
        val userId2 = jwtTokenService.getUserIdFromToken(token2)

        // Then
        assertEquals(user1.id, userId1)
        assertEquals(user2.id, userId2)
        assertNotEquals(userId1, userId2)
    }
}
