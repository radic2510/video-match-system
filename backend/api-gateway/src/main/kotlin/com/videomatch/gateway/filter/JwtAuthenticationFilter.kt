package com.videomatch.gateway.filter

import com.videomatch.common.exception.UnauthorizedException
import com.videomatch.gateway.service.JwtTokenValidator
import mu.KotlinLogging
import org.springframework.cloud.gateway.filter.GatewayFilter
import org.springframework.cloud.gateway.filter.GatewayFilterChain
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component
import org.springframework.web.server.ServerWebExchange
import reactor.core.publisher.Mono

private val logger = KotlinLogging.logger {}

/**
 * JWT Authentication Filter for Spring Cloud Gateway
 * Validates JWT token and adds X-User-Id header to request
 */
@Component
class JwtAuthenticationFilter(
    private val jwtTokenValidator: JwtTokenValidator
) : GatewayFilter {

    override fun filter(exchange: ServerWebExchange, chain: GatewayFilterChain): Mono<Void> {
        val request = exchange.request

        // Extract Authorization header
        val authHeader = request.headers.getFirst(HttpHeaders.AUTHORIZATION)

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            logger.warn { "Missing or invalid Authorization header" }
            exchange.response.statusCode = HttpStatus.UNAUTHORIZED
            return exchange.response.setComplete()
        }

        // Extract token (remove "Bearer " prefix)
        val token = authHeader.substring(7)

        return try {
            // Validate token and get user ID
            val userId = jwtTokenValidator.validateToken(token)

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
            logger.warn { "Authentication failed: ${e.message}" }
            exchange.response.statusCode = HttpStatus.UNAUTHORIZED
            exchange.response.setComplete()
        } catch (e: Exception) {
            logger.error(e) { "Unexpected error during authentication" }
            exchange.response.statusCode = HttpStatus.INTERNAL_SERVER_ERROR
            exchange.response.setComplete()
        }
    }
}
