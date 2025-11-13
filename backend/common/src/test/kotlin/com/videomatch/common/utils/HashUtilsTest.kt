package com.videomatch.common.utils

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class HashUtilsTest {

    @Test
    fun `should generate SHA-256 hash from string`() {
        // Given
        val input = "test-password-123"

        // When
        val hash = HashUtils.sha256(input)

        // Then
        assertNotNull(hash)
        assertEquals(64, hash.length) // SHA-256 produces 64 hex characters
        assertTrue(hash.matches(Regex("[0-9a-f]{64}"))) // Only hex characters
    }

    @Test
    fun `should generate same hash for same input`() {
        // Given
        val input = "consistent-data"

        // When
        val hash1 = HashUtils.sha256(input)
        val hash2 = HashUtils.sha256(input)

        // Then
        assertEquals(hash1, hash2)
    }

    @Test
    fun `should generate different hashes for different inputs`() {
        // Given
        val input1 = "password1"
        val input2 = "password2"

        // When
        val hash1 = HashUtils.sha256(input1)
        val hash2 = HashUtils.sha256(input2)

        // Then
        assertNotEquals(hash1, hash2)
    }

    @Test
    fun `should hash password with bcrypt`() {
        // Given
        val password = "my-secure-password"

        // When
        val hashedPassword = HashUtils.hashPassword(password)

        // Then
        assertNotNull(hashedPassword)
        assertTrue(hashedPassword.startsWith("$2a$") || hashedPassword.startsWith("$2b$"))
        assertTrue(hashedPassword.length >= 60) // BCrypt hashes are at least 60 characters
    }

    @Test
    fun `should generate different bcrypt hashes for same password due to salt`() {
        // Given
        val password = "test-password"

        // When
        val hash1 = HashUtils.hashPassword(password)
        val hash2 = HashUtils.hashPassword(password)

        // Then
        assertNotEquals(hash1, hash2) // Different salts
    }

    @Test
    fun `should verify correct password`() {
        // Given
        val password = "correct-password"
        val hashedPassword = HashUtils.hashPassword(password)

        // When
        val isValid = HashUtils.verifyPassword(password, hashedPassword)

        // Then
        assertTrue(isValid)
    }

    @Test
    fun `should reject incorrect password`() {
        // Given
        val password = "correct-password"
        val wrongPassword = "wrong-password"
        val hashedPassword = HashUtils.hashPassword(password)

        // When
        val isValid = HashUtils.verifyPassword(wrongPassword, hashedPassword)

        // Then
        assertTrue(!isValid)
    }

    @Test
    fun `should generate MD5 hash for file identifier`() {
        // Given
        val input = "file-content-12345"

        // When
        val hash = HashUtils.md5(input)

        // Then
        assertNotNull(hash)
        assertEquals(32, hash.length) // MD5 produces 32 hex characters
        assertTrue(hash.matches(Regex("[0-9a-f]{32}")))
    }

    @Test
    fun `should generate UUID from string deterministically`() {
        // Given
        val input = "stable-identifier"

        // When
        val uuid1 = HashUtils.uuidFromString(input)
        val uuid2 = HashUtils.uuidFromString(input)

        // Then
        assertEquals(uuid1, uuid2)
    }
}
