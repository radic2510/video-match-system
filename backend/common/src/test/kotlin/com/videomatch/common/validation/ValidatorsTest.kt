package com.videomatch.common.validation

import com.videomatch.common.exception.ValidationException
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ValidatorsTest {

    @Test
    fun `should validate correct email format`() {
        // Given
        val validEmails = listOf(
            "user@example.com",
            "test.user@domain.co.uk",
            "user+tag@example.com",
            "123@test.com"
        )

        // When/Then
        validEmails.forEach { email ->
            assertTrue(Validators.isValidEmail(email), "Expected $email to be valid")
        }
    }

    @Test
    fun `should reject invalid email format`() {
        // Given
        val invalidEmails = listOf(
            "",
            "invalid",
            "invalid@",
            "@example.com",
            "user @example.com",
            "user@",
            "user@.com"
        )

        // When/Then
        invalidEmails.forEach { email ->
            assertFalse(Validators.isValidEmail(email), "Expected $email to be invalid")
        }
    }

    @Test
    fun `should validate strong password`() {
        // Given
        val strongPasswords = listOf(
            "Password123!",
            "MyP@ssw0rd",
            "SecureP@ss1"
        )

        // When/Then
        strongPasswords.forEach { password ->
            assertTrue(Validators.isValidPassword(password), "Expected $password to be strong")
        }
    }

    @Test
    fun `should reject weak password`() {
        // Given
        val weakPasswords = listOf(
            "",
            "short",
            "nouppercaseordigit1",
            "NOLOWERCASEORDIGIT1",
            "NoDigits",
            "12345678"
        )

        // When/Then
        weakPasswords.forEach { password ->
            assertFalse(Validators.isValidPassword(password), "Expected $password to be weak")
        }
    }

    @Test
    fun `should validate UUID format`() {
        // Given
        val validUUIDs = listOf(
            "550e8400-e29b-41d4-a716-446655440000",
            "123e4567-e89b-12d3-a456-426614174000"
        )

        // When/Then
        validUUIDs.forEach { uuid ->
            assertTrue(Validators.isValidUUID(uuid), "Expected $uuid to be valid")
        }
    }

    @Test
    fun `should reject invalid UUID format`() {
        // Given
        val invalidUUIDs = listOf(
            "",
            "invalid",
            "550e8400-e29b-41d4-a716",
            "not-a-uuid"
        )

        // When/Then
        invalidUUIDs.forEach { uuid ->
            assertFalse(Validators.isValidUUID(uuid), "Expected $uuid to be invalid")
        }
    }

    @Test
    fun `should validate non-empty string`() {
        // Given
        val validStrings = listOf("test", "  text  ", "123")

        // When/Then
        validStrings.forEach { str ->
            assertTrue(Validators.isNotBlank(str))
        }
    }

    @Test
    fun `should reject empty or blank strings`() {
        // Given
        val invalidStrings = listOf("", "   ", "\t", "\n")

        // When/Then
        invalidStrings.forEach { str ->
            assertFalse(Validators.isNotBlank(str))
        }
    }

    @Test
    fun `should validate email and throw exception if invalid`() {
        // Given
        val invalidEmail = "invalid-email"

        // When/Then
        assertThrows<ValidationException> {
            Validators.validateEmail(invalidEmail)
        }
    }

    @Test
    fun `should validate email and pass if valid`() {
        // Given
        val validEmail = "user@example.com"

        // When/Then (should not throw)
        Validators.validateEmail(validEmail)
    }

    @Test
    fun `should validate required field and throw if blank`() {
        // Given
        val blankValue = "   "
        val fieldName = "username"

        // When/Then
        assertThrows<ValidationException> {
            Validators.validateRequired(blankValue, fieldName)
        }
    }

    @Test
    fun `should validate required field and pass if not blank`() {
        // Given
        val value = "valid-value"
        val fieldName = "username"

        // When/Then (should not throw)
        Validators.validateRequired(value, fieldName)
    }

    @Test
    fun `should validate string length within range`() {
        // Given
        val value = "test"

        // When/Then
        assertTrue(Validators.isLengthInRange(value, 1, 10))
        assertFalse(Validators.isLengthInRange(value, 5, 10))
        assertFalse(Validators.isLengthInRange(value, 1, 3))
    }

    @Test
    fun `should validate positive number`() {
        // Given/When/Then
        assertTrue(Validators.isPositive(1L))
        assertTrue(Validators.isPositive(100L))
        assertFalse(Validators.isPositive(0L))
        assertFalse(Validators.isPositive(-1L))
    }

    @Test
    fun `should validate number in range`() {
        // Given/When/Then
        assertTrue(Validators.isInRange(5, 1, 10))
        assertTrue(Validators.isInRange(1, 1, 10))
        assertTrue(Validators.isInRange(10, 1, 10))
        assertFalse(Validators.isInRange(0, 1, 10))
        assertFalse(Validators.isInRange(11, 1, 10))
    }
}
