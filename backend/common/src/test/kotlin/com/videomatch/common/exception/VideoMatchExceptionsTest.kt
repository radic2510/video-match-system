package com.videomatch.common.exception

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class VideoMatchExceptionsTest {

    @Test
    fun `should create VideoMatchException with message`() {
        // Given
        val message = "Test error message"

        // When
        val exception = VideoMatchException(message)

        // Then
        assertEquals(message, exception.message)
        assertTrue(exception is RuntimeException)
    }

    @Test
    fun `should create VideoMatchException with message and cause`() {
        // Given
        val message = "Test error message"
        val cause = IllegalArgumentException("Root cause")

        // When
        val exception = VideoMatchException(message, cause)

        // Then
        assertEquals(message, exception.message)
        assertEquals(cause, exception.cause)
    }

    @Test
    fun `should create ResourceNotFoundException with resource type and id`() {
        // Given
        val resourceType = "User"
        val resourceId = "123e4567-e89b-12d3-a456-426614174000"

        // When
        val exception = ResourceNotFoundException(resourceType, resourceId)

        // Then
        assertNotNull(exception.message)
        assertTrue(exception.message!!.contains(resourceType))
        assertTrue(exception.message!!.contains(resourceId))
        assertTrue(exception is VideoMatchException)
    }

    @Test
    fun `should create ValidationException with field and message`() {
        // Given
        val field = "email"
        val message = "Invalid email format"

        // When
        val exception = ValidationException(field, message)

        // Then
        assertNotNull(exception.message)
        assertTrue(exception.message!!.contains(field))
        assertTrue(exception.message!!.contains(message))
        assertEquals(field, exception.field)
        assertTrue(exception is VideoMatchException)
    }

    @Test
    fun `should create ValidationException with multiple errors`() {
        // Given
        val errors = mapOf(
            "email" to "Invalid email format",
            "password" to "Password too short"
        )

        // When
        val exception = ValidationException(errors)

        // Then
        assertNotNull(exception.message)
        assertEquals(errors, exception.errors)
        assertTrue(exception is VideoMatchException)
    }

    @Test
    fun `should create InsufficientGPUMemoryException with required and available memory`() {
        // Given
        val requiredMB = 1024L
        val availableMB = 512L

        // When
        val exception = InsufficientGPUMemoryException(requiredMB, availableMB)

        // Then
        assertNotNull(exception.message)
        assertTrue(exception.message!!.contains(requiredMB.toString()))
        assertTrue(exception.message!!.contains(availableMB.toString()))
        assertEquals(requiredMB, exception.requiredMemoryMB)
        assertEquals(availableMB, exception.availableMemoryMB)
        assertTrue(exception is VideoMatchException)
    }

    @Test
    fun `should create UnauthorizedException with message`() {
        // Given
        val message = "Invalid credentials"

        // When
        val exception = UnauthorizedException(message)

        // Then
        assertEquals(message, exception.message)
        assertTrue(exception is VideoMatchException)
    }

    @Test
    fun `should create MLServiceException with message and cause`() {
        // Given
        val message = "Model inference failed"
        val cause = RuntimeException("GPU timeout")

        // When
        val exception = MLServiceException(message, cause)

        // Then
        assertEquals(message, exception.message)
        assertEquals(cause, exception.cause)
        assertTrue(exception is VideoMatchException)
    }

    @Test
    fun `should throw ValidationException when validating`() {
        // When/Then
        assertThrows<ValidationException> {
            throw ValidationException("email", "Invalid format")
        }
    }

    @Test
    fun `should throw ResourceNotFoundException when validating`() {
        // When/Then
        assertThrows<ResourceNotFoundException> {
            throw ResourceNotFoundException("User", "unknown-id")
        }
    }
}
