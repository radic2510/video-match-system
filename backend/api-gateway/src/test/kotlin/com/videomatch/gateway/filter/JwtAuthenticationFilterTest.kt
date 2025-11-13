package com.videomatch.gateway.filter

import com.videomatch.common.exception.UnauthorizedException
import com.videomatch.gateway.service.JwtTokenValidator
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.cloud.gateway.filter.GatewayFilterChain
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.mock.http.server.reactive.MockServerHttpRequest
import org.springframework.mock.web.server.MockServerWebExchange
import org.springframework.web.server.ServerWebExchange
import reactor.core.publisher.Mono
import reactor.test.StepVerifier
import java.util.UUID

/**
 * Tests for JwtAuthenticationFilter
 */
class JwtAuthenticationFilterTest {

    private lateinit var jwtAuthenticationFilter: JwtAuthenticationFilter
    private lateinit var jwtTokenValidator: JwtTokenValidator
    private lateinit var chain: GatewayFilterChain

    @BeforeEach
    fun setup() {
        jwtTokenValidator = mockk()
        jwtAuthenticationFilter = JwtAuthenticationFilter(jwtTokenValidator)
        chain = mockk()

        // Mock chain to return completed mono
        every { chain.filter(any()) } returns Mono.empty()
    }

    @Test
    fun `should allow request with valid JWT token`() {
        // Given: Valid JWT token
        val userId = UUID.randomUUID()
        val token = "valid.jwt.token"

        every { jwtTokenValidator.validateToken(token) } returns userId

        val request = MockServerHttpRequest
            .get("/api/matches")
            .header(HttpHeaders.AUTHORIZATION, "Bearer $token")
            .build()

        val exchange = MockServerWebExchange.from(request)

        // When: Filter is applied
        val result = jwtAuthenticationFilter.filter(exchange, chain)

        // Then: Should pass through and add X-User-Id header
        StepVerifier.create(result)
            .verifyComplete()

        // Verify token was validated
        verify { jwtTokenValidator.validateToken(token) }

        // Verify chain was called with modified exchange
        verify { chain.filter(any()) }
    }

    @Test
    fun `should reject request without Authorization header`() {
        // Given: Request without Authorization header
        val request = MockServerHttpRequest
            .get("/api/matches")
            .build()

        val exchange = MockServerWebExchange.from(request)

        // When: Filter is applied
        val result = jwtAuthenticationFilter.filter(exchange, chain)

        // Then: Should return 401 Unauthorized
        StepVerifier.create(result)
            .verifyComplete()

        // Response should be 401
        assert(exchange.response.statusCode == HttpStatus.UNAUTHORIZED)

        // Chain should not be called
        verify(exactly = 0) { chain.filter(any()) }
    }

    @Test
    fun `should reject request with invalid token format`() {
        // Given: Request with invalid Bearer token format
        val request = MockServerHttpRequest
            .get("/api/matches")
            .header(HttpHeaders.AUTHORIZATION, "InvalidFormat token")
            .build()

        val exchange = MockServerWebExchange.from(request)

        // When: Filter is applied
        val result = jwtAuthenticationFilter.filter(exchange, chain)

        // Then: Should return 401 Unauthorized
        StepVerifier.create(result)
            .verifyComplete()

        assert(exchange.response.statusCode == HttpStatus.UNAUTHORIZED)
        verify(exactly = 0) { chain.filter(any()) }
    }

    @Test
    fun `should reject request with expired token`() {
        // Given: Expired JWT token
        val token = "expired.jwt.token"

        every { jwtTokenValidator.validateToken(token) } throws
            UnauthorizedException("Token expired")

        val request = MockServerHttpRequest
            .get("/api/matches")
            .header(HttpHeaders.AUTHORIZATION, "Bearer $token")
            .build()

        val exchange = MockServerWebExchange.from(request)

        // When: Filter is applied
        val result = jwtAuthenticationFilter.filter(exchange, chain)

        // Then: Should return 401 Unauthorized
        StepVerifier.create(result)
            .verifyComplete()

        assert(exchange.response.statusCode == HttpStatus.UNAUTHORIZED)
        verify(exactly = 0) { chain.filter(any()) }
    }

    @Test
    fun `should extract token correctly from Bearer header`() {
        // Given: Valid token with Bearer prefix
        val userId = UUID.randomUUID()
        val token = "my.jwt.token"

        every { jwtTokenValidator.validateToken(token) } returns userId

        val request = MockServerHttpRequest
            .get("/api/matches")
            .header(HttpHeaders.AUTHORIZATION, "Bearer $token")
            .build()

        val exchange = MockServerWebExchange.from(request)

        // When: Filter is applied
        jwtAuthenticationFilter.filter(exchange, chain)

        // Then: Should extract token correctly (without "Bearer " prefix)
        verify { jwtTokenValidator.validateToken(token) }
    }
}
