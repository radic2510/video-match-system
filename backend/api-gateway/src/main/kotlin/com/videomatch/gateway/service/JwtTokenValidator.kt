package com.videomatch.gateway.service

import com.videomatch.common.exception.UnauthorizedException
import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import mu.KotlinLogging
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.nio.charset.StandardCharsets
import java.util.*
import javax.crypto.SecretKey

private val logger = KotlinLogging.logger {}

/**
 * Service for validating JWT tokens
 * Uses the same secret key as the core service
 */
@Service
class JwtTokenValidator(
    @Value("\${jwt.secret:your-256-bit-secret-key-change-this-in-production-environment}") private val secret: String
) {

    private val key: SecretKey = Keys.hmacShaKeyFor(secret.toByteArray(StandardCharsets.UTF_8))

    /**
     * Validate JWT token and extract user ID
     * @param token JWT token string (without "Bearer " prefix)
     * @return User UUID if token is valid
     * @throws UnauthorizedException if token is invalid or expired
     */
    fun validateToken(token: String): UUID {
        try {
            val claims: Claims = Jwts.parser()
                .setSigningKey(key)
                .parseClaimsJws(token)
                .body

            // Extract user ID from subject
            val userId = UUID.fromString(claims.subject)

            // Check if token is expired
            if (claims.expiration.before(Date())) {
                throw UnauthorizedException("Token has expired")
            }

            logger.debug { "Token validated successfully for user: $userId" }
            return userId

        } catch (e: Exception) {
            logger.warn { "Token validation failed: ${e.message}" }
            throw UnauthorizedException("Invalid or expired token")
        }
    }
}
