package com.videomatch.common.exception

/**
 * Base exception class for Video Match System
 */
open class VideoMatchException(
    message: String,
    cause: Throwable? = null
) : RuntimeException(message, cause)

/**
 * Exception thrown when a requested resource is not found
 */
class ResourceNotFoundException(
    val resourceType: String,
    val resourceId: String
) : VideoMatchException("$resourceType not found with id: $resourceId")

/**
 * Exception thrown when input validation fails
 */
class ValidationException : VideoMatchException {
    val field: String?
    val errors: Map<String, String>?

    constructor(field: String, message: String) : super("Validation failed for field '$field': $message") {
        this.field = field
        this.errors = null
    }

    constructor(errors: Map<String, String>) : super("Validation failed: ${errors.entries.joinToString(", ") { "${it.key}: ${it.value}" }}") {
        this.field = null
        this.errors = errors
    }
}

/**
 * Exception thrown when insufficient GPU memory is available
 */
class InsufficientGPUMemoryException(
    val requiredMemoryMB: Long,
    val availableMemoryMB: Long
) : VideoMatchException("Insufficient GPU memory: required ${requiredMemoryMB}MB, available ${availableMemoryMB}MB")

/**
 * Exception thrown when authentication fails
 */
class UnauthorizedException(
    message: String = "Unauthorized access"
) : VideoMatchException(message)

/**
 * Exception thrown when ML service operations fail
 */
class MLServiceException(
    message: String,
    cause: Throwable? = null
) : VideoMatchException(message, cause)
