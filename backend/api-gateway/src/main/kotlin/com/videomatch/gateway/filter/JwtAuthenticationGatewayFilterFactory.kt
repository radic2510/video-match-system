package com.videomatch.gateway.filter

import com.videomatch.common.exception.UnauthorizedException
import com.videomatch.gateway.service.JwtTokenValidator
import mu.KotlinLogging
import org.springframework.cloud.gateway.filter.GatewayFilter
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component

private val logger = KotlinLogging.logger {}

/**
 * JWT Authentication Gateway Filter Factory for Spring Cloud Gateway
 * Validates JWT token and adds X-User-Id header to request
 */
@Component
class JwtAuthenticationGatewayFilterFactory(
    private val jwtTokenValidator: JwtTokenValidator
) : AbstractGatewayFilterFactory<Any>(Any::class.java) {

    override fun apply(config: Any?): GatewayFilter {
        return GatewayFilter { exchange, chain ->
            val request = exchange.request

            // Extract Authorization header
            val authHeader = request.headers.getFirst(HttpHeaders.AUTHORIZATION)

            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                logger.warn { "Missing or invalid Authorization header for ${request.path}" }
                exchange.response.statusCode = HttpStatus.UNAUTHORIZED
                return@GatewayFilter exchange.response.setComplete()
            }

            // Extract token (remove "Bearer " prefix)
            val token = authHeader.substring(7)

            try {
                // Validate token and get user ID
                val userId = jwtTokenValidator.validateToken(token)

                logger.debug { "Authentication successful for user: $userId" }

                // Add X-User-Id header to request
                val modifiedRequest = request.mutate()
                    .header("X-User-Id", userId.toString())
                    .build()

                val modifiedExchange = exchange.mutate()
                    .request(modifiedRequest)
                    .build()

                // Continue filter chain with modified exchange
                chain.filter(modifiedExchange)

            } catch (e: UnauthorizedException) {
                logger.warn { "Authentication failed for ${request.path}: ${e.message}" }
                exchange.response.statusCode = HttpStatus.UNAUTHORIZED
                exchange.response.setComplete()
            } catch (e: Exception) {
                logger.error(e) { "Unexpected error during authentication for ${request.path}" }
                exchange.response.statusCode = HttpStatus.INTERNAL_SERVER_ERROR
                exchange.response.setComplete()
            }
        }
    }
}
