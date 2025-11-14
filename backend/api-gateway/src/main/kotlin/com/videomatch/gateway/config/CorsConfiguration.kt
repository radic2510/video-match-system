package com.videomatch.gateway.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.cors.reactive.CorsWebFilter
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource

/**
 * CORS Configuration for Spring Cloud Gateway
 * Allows frontend (localhost:3000) to access backend APIs
 */
@Configuration
class CorsConfiguration {

    @Bean
    fun corsWebFilter(): CorsWebFilter {
        val corsConfig = org.springframework.web.cors.CorsConfiguration()

        // Allow frontend origins
        corsConfig.allowedOrigins = listOf(
            "http://localhost:3000",
            "http://localhost:3001"
        )

        // Allow necessary HTTP methods
        corsConfig.allowedMethods = listOf(
            "GET",
            "POST",
            "PUT",
            "DELETE",
            "OPTIONS",
            "PATCH"
        )

        // Allow necessary headers
        corsConfig.allowedHeaders = listOf(
            "Authorization",
            "Content-Type",
            "X-User-Id",
            "Accept",
            "Origin",
            "X-Requested-With"
        )

        // Allow credentials (cookies, authorization headers)
        corsConfig.allowCredentials = true

        // Cache preflight response for 1 hour
        corsConfig.maxAge = 3600L

        // Expose headers to frontend
        corsConfig.exposedHeaders = listOf(
            "X-User-Id"
        )

        val source = UrlBasedCorsConfigurationSource()
        source.registerCorsConfiguration("/**", corsConfig)

        return CorsWebFilter(source)
    }
}
