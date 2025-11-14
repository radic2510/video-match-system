package com.videomatch.core.presentation.exception

import com.videomatch.common.exception.ResourceNotFoundException
import com.videomatch.common.exception.UnauthorizedException
import com.videomatch.common.exception.ValidationException
import mu.KotlinLogging
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import java.time.Instant

private val logger = KotlinLogging.logger {}

/**
 * Global exception handler for REST controllers
 * Converts exceptions to appropriate HTTP responses
 */
@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(ValidationException::class)
    fun handleValidationException(ex: ValidationException): ResponseEntity<ErrorResponse> {
        logger.warn { "Validation error: ${ex.message}" }
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(
                ErrorResponse(
                    timestamp = Instant.now(),
                    status = HttpStatus.BAD_REQUEST.value(),
                    error = "Validation Error",
                    message = ex.message ?: "Validation failed",
                    field = ex.field
                )
            )
    }

    @ExceptionHandler(ResourceNotFoundException::class)
    fun handleResourceNotFoundException(ex: ResourceNotFoundException): ResponseEntity<ErrorResponse> {
        logger.warn { "Resource not found: ${ex.message}" }
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(
                ErrorResponse(
                    timestamp = Instant.now(),
                    status = HttpStatus.NOT_FOUND.value(),
                    error = "Not Found",
                    message = ex.message ?: "Resource not found"
                )
            )
    }

    @ExceptionHandler(UnauthorizedException::class)
    fun handleUnauthorizedException(ex: UnauthorizedException): ResponseEntity<ErrorResponse> {
        logger.warn { "Unauthorized access: ${ex.message}" }
        return ResponseEntity
            .status(HttpStatus.UNAUTHORIZED)
            .body(
                ErrorResponse(
                    timestamp = Instant.now(),
                    status = HttpStatus.UNAUTHORIZED.value(),
                    error = "Unauthorized",
                    message = ex.message ?: "Unauthorized access"
                )
            )
    }

    @ExceptionHandler(IllegalArgumentException::class)
    fun handleIllegalArgumentException(ex: IllegalArgumentException): ResponseEntity<ErrorResponse> {
        logger.warn { "Invalid argument: ${ex.message}" }
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(
                ErrorResponse(
                    timestamp = Instant.now(),
                    status = HttpStatus.BAD_REQUEST.value(),
                    error = "Bad Request",
                    message = ex.message ?: "Invalid argument"
                )
            )
    }

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun handleHttpMessageNotReadableException(ex: HttpMessageNotReadableException): ResponseEntity<ErrorResponse> {
        logger.warn { "Invalid JSON format: ${ex.message}" }
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(
                ErrorResponse(
                    timestamp = Instant.now(),
                    status = HttpStatus.BAD_REQUEST.value(),
                    error = "Bad Request",
                    message = "Invalid JSON format or malformed request body"
                )
            )
    }

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleMethodArgumentNotValidException(ex: MethodArgumentNotValidException): ResponseEntity<ErrorResponse> {
        val fieldError = ex.bindingResult.fieldErrors.firstOrNull()
        val message = fieldError?.let { "${it.field}: ${it.defaultMessage}" }
            ?: "Validation failed"

        logger.warn { "Validation failed: $message" }
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(
                ErrorResponse(
                    timestamp = Instant.now(),
                    status = HttpStatus.BAD_REQUEST.value(),
                    error = "Validation Error",
                    message = message,
                    field = fieldError?.field
                )
            )
    }

    @ExceptionHandler(Exception::class)
    fun handleGenericException(ex: Exception): ResponseEntity<ErrorResponse> {
        logger.error(ex) { "Unexpected error: ${ex.message}" }
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(
                ErrorResponse(
                    timestamp = Instant.now(),
                    status = HttpStatus.INTERNAL_SERVER_ERROR.value(),
                    error = "Internal Server Error",
                    message = "An unexpected error occurred"
                )
            )
    }
}

/**
 * Standard error response format
 */
data class ErrorResponse(
    val timestamp: Instant,
    val status: Int,
    val error: String,
    val message: String,
    val field: String? = null
)
