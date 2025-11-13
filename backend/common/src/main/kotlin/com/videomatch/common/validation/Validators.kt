package com.videomatch.common.validation

import com.videomatch.common.exception.ValidationException
import java.util.UUID

/**
 * Input validation utilities
 */
object Validators {
    private val emailRegex = Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}$")
    private val uuidRegex = Regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")

    /**
     * Check if email format is valid
     */
    fun isValidEmail(email: String): Boolean {
        return email.isNotBlank() && emailRegex.matches(email)
    }

    /**
     * Check if password is strong enough
     * Requirements: at least 8 characters, contains uppercase, lowercase, and digit
     */
    fun isValidPassword(password: String): Boolean {
        if (password.length < 8) return false
        val hasUppercase = password.any { it.isUpperCase() }
        val hasLowercase = password.any { it.isLowerCase() }
        val hasDigit = password.any { it.isDigit() }
        return hasUppercase && hasLowercase && hasDigit
    }

    /**
     * Check if string is a valid UUID
     */
    fun isValidUUID(uuid: String): Boolean {
        return try {
            UUID.fromString(uuid)
            true
        } catch (e: IllegalArgumentException) {
            false
        }
    }

    /**
     * Check if string is not blank
     */
    fun isNotBlank(value: String): Boolean {
        return value.isNotBlank()
    }

    /**
     * Check if string length is within range
     */
    fun isLengthInRange(value: String, min: Int, max: Int): Boolean {
        return value.length in min..max
    }

    /**
     * Check if number is positive
     */
    fun isPositive(value: Long): Boolean {
        return value > 0
    }

    /**
     * Check if number is within range
     */
    fun isInRange(value: Int, min: Int, max: Int): Boolean {
        return value in min..max
    }

    /**
     * Validate email and throw ValidationException if invalid
     */
    fun validateEmail(email: String) {
        if (!isValidEmail(email)) {
            throw ValidationException("email", "Invalid email format")
        }
    }

    /**
     * Validate required field and throw ValidationException if blank
     */
    fun validateRequired(value: String, fieldName: String) {
        if (!isNotBlank(value)) {
            throw ValidationException(fieldName, "Field is required")
        }
    }

    /**
     * Validate string length and throw ValidationException if out of range
     */
    fun validateLength(value: String, fieldName: String, min: Int, max: Int) {
        if (!isLengthInRange(value, min, max)) {
            throw ValidationException(fieldName, "Length must be between $min and $max characters")
        }
    }

    /**
     * Validate positive number and throw ValidationException if not positive
     */
    fun validatePositive(value: Long, fieldName: String) {
        if (!isPositive(value)) {
            throw ValidationException(fieldName, "Value must be positive")
        }
    }
}
