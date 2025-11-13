package com.videomatch.processing.dto

import java.util.UUID

/**
 * ML Service API Response DTOs
 * Based on shared/contracts/ml-service-api.yaml
 */

/**
 * Response from ML Service match-advertisement endpoint
 */
data class MLMatchResponse(
    val matched: Boolean,
    val bestMatch: BestMatch?,
    val alternativeCandidates: List<AlternativeCandidate>?,
    val processingStages: ProcessingStages?,
    val totalInferenceTimeMs: Int
)

/**
 * Best match result from ML Service
 */
data class BestMatch(
    val videoId: UUID,
    val frameNumber: Int,
    val confidence: Double,
    val scores: VerificationScores
)

/**
 * Verification scores from different methods
 */
data class VerificationScores(
    val embedding: Double,
    val sift: Double?,
    val color: Double?,
    val text: Double?
)

/**
 * Alternative candidate match
 */
data class AlternativeCandidate(
    val videoId: UUID,
    val frameNumber: Int,
    val confidence: Double
)

/**
 * Processing stages timing information
 */
data class ProcessingStages(
    val displayDetection: Int?,
    val perspectiveCorrection: Int?,
    val qualityAssessment: Int?,
    val qualityEnhancement: Int?,
    val embeddingExtraction: Int?,
    val vectorSearch: Int?,
    val verification: Int?
)

/**
 * ML Service error response
 */
data class MLErrorResponse(
    val error: MLError
)

/**
 * ML error details
 */
data class MLError(
    val code: String,
    val message: String,
    val details: Map<String, Any>?,
    val recoverable: Boolean,
    val timestamp: String
)

/**
 * ML Service health response
 */
data class MLHealthResponse(
    val status: String,
    val models: Map<String, String>?,
    val gpu: GPUStatus?,
    val cache: CacheStatus?
)

/**
 * GPU status information
 */
data class GPUStatus(
    val available: Boolean,
    val deviceName: String?,
    val memoryUsed: Int?,
    val memoryTotal: Int?,
    val utilization: Int?
)

/**
 * Cache status information
 */
data class CacheStatus(
    val memoryEntries: Int?,
    val diskSizeGB: Double?,
    val hitRate: Double?
)
