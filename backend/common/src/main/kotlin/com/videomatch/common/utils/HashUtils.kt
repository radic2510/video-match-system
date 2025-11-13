package com.videomatch.common.utils

import org.apache.commons.codec.digest.DigestUtils
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import java.util.UUID

/**
 * Utility functions for hashing and password management
 */
object HashUtils {
    private val passwordEncoder = BCryptPasswordEncoder()

    /**
     * Generate SHA-256 hash from string
     */
    fun sha256(input: String): String {
        return DigestUtils.sha256Hex(input)
    }

    /**
     * Generate MD5 hash from string
     * Note: MD5 is not cryptographically secure, use only for file identifiers
     */
    fun md5(input: String): String {
        return DigestUtils.md5Hex(input)
    }

    /**
     * Hash password using BCrypt
     */
    fun hashPassword(password: String): String {
        return passwordEncoder.encode(password)
    }

    /**
     * Verify password against BCrypt hash
     */
    fun verifyPassword(password: String, hashedPassword: String): Boolean {
        return passwordEncoder.matches(password, hashedPassword)
    }

    /**
     * Generate deterministic UUID from string using MD5
     */
    fun uuidFromString(input: String): UUID {
        return UUID.nameUUIDFromBytes(input.toByteArray())
    }
}
