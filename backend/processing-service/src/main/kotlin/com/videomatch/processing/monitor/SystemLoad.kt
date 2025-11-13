package com.videomatch.processing.monitor

/**
 * System resource load metrics
 */
data class SystemLoad(
    val cpuPercent: Double,
    val memoryPercent: Double
)
