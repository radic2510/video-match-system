package com.videomatch.core.application.service

import com.videomatch.core.domain.model.User
import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.SignatureAlgorithm
import io.jsonwebtoken.security.Keys
import mu.KotlinLogging
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.nio.charset.StandardCharsets
import java.util.*
import javax.crypto.SecretKey

private val logger = KotlinLogging.logger {}

/**
 * Service for JWT token generation and validation
 * Handles creation and verification of JWT tokens for user authentication
 */
@Service
class JwtTokenService(
    @Value("\${jwt.secret}") private val secretKey: String,
    @Value("\${jwt.expiration}") private val expirationMs: Long
) {

    private val key: SecretKey by lazy {
        // Ensure the key is at least 256 bits (32 bytes) for HS256
        val keyBytes = secretKey.toByteArray(StandardCharsets.UTF_8)
        if (keyBytes.size < 32) {
            throw IllegalArgumentException("JWT secret key must be at least 256 bits (32 characters)")
        }
        Keys.hmacShaKeyFor(keyBytes)
    }

    /**
     * Generate JWT token for a user
     * @param user User entity
     * @return JWT token string
     */
    fun generateToken(user: User): String {
        val now = Date()
        val expiryDate = Date(now.time + expirationMs)

        return Jwts.builder()
            .setSubject(user.id.toString())
            .claim("email", user.email)
            .claim("name", user.name)
            .claim("role", user.role.name)
            .setIssuedAt(now)
            .setExpiration(expiryDate)
            .signWith(key, SignatureAlgorithm.HS256)
            .compact()
    }

    /**
     * Validate JWT token
     * @param token JWT token string
     * @return true if token is valid, false otherwise
     */
    fun validateToken(token: String): Boolean {
        return try {
            Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
            true
        } catch (ex: Exception) {
            logger.debug { "Invalid JWT token: ${ex.message}" }
            false
        }
    }

    /**
     * Extract user ID from JWT token
     * @param token JWT token string
     * @return User UUID
     * @throws Exception if token is invalid
     */
    fun getUserIdFromToken(token: String): UUID {
        val claims = getClaims(token)
        return UUID.fromString(claims.subject)
    }

    /**
     * Extract email from JWT token
     * @param token JWT token string
     * @return User email
     * @throws Exception if token is invalid
     */
    fun getEmailFromToken(token: String): String {
        val claims = getClaims(token)
        return claims["email"] as String
    }

    /**
     * Extract user name from JWT token
     * @param token JWT token string
     * @return User name
     * @throws Exception if token is invalid
     */
    fun getNameFromToken(token: String): String {
        val claims = getClaims(token)
        return claims["name"] as String
    }

    /**
     * Extract user role from JWT token
     * @param token JWT token string
     * @return User role
     * @throws Exception if token is invalid
     */
    fun getRoleFromToken(token: String): String {
        val claims = getClaims(token)
        return claims["role"] as String
    }

    /**
     * Get all claims from JWT token
     * @param token JWT token string
     * @return Claims object
     * @throws Exception if token is invalid
     */
    private fun getClaims(token: String): Claims {
        return Jwts.parserBuilder()
            .setSigningKey(key)
            .build()
            .parseClaimsJws(token)
            .body
    }
}
