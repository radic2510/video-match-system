package com.videomatch.processing.monitor

import mu.KotlinLogging
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.lang.management.ManagementFactory

private val logger = KotlinLogging.logger {}

/**
 * Monitors system resources (CPU, memory) to prevent overload
 * Used by QueueProcessor to decide whether to process more matches
 */
@Component
class ResourceMonitor(
    @Value("\${resource-monitor.thresholds.cpu-percent}") private val cpuThreshold: Double,
    @Value("\${resource-monitor.thresholds.memory-percent}") private val memoryThreshold: Double
) {

    private val osBean = ManagementFactory.getOperatingSystemMXBean()
    private val runtime = Runtime.getRuntime()

    /**
     * Get current system load metrics
     * @return SystemLoad with CPU and memory percentages
     */
    fun getSystemLoad(): SystemLoad {
        // Get system CPU load (0.0 to 1.0)
        // Note: This might return -1 if not supported, in which case we default to 0
        val systemCpuLoad = osBean.systemLoadAverage
        val availableProcessors = osBean.availableProcessors

        // Convert to percentage
        // systemLoadAverage returns the 1-minute load average
        // Normalize by number of processors to get a percentage
        val cpuPercent = if (systemCpuLoad >= 0) {
            ((systemCpuLoad / availableProcessors) * 100).coerceIn(0.0, 100.0)
        } else {
            0.0 // Not supported on this platform
        }

        // Get memory usage
        val maxMemory = runtime.maxMemory()
        val totalMemory = runtime.totalMemory()
        val freeMemory = runtime.freeMemory()
        val usedMemory = totalMemory - freeMemory
        val memoryPercent = (usedMemory.toDouble() / maxMemory.toDouble()) * 100

        return SystemLoad(
            cpuPercent = cpuPercent,
            memoryPercent = memoryPercent
        )
    }

    /**
     * Check if system is currently overloaded
     * @return true if CPU or memory exceeds configured thresholds
     */
    fun isOverloaded(): Boolean {
        val load = getSystemLoad()

        val isOverloaded = load.cpuPercent > cpuThreshold || load.memoryPercent > memoryThreshold

        if (isOverloaded) {
            logger.warn {
                "System overloaded: CPU=${String.format("%.1f", load.cpuPercent)}% " +
                "(threshold=${cpuThreshold}%), " +
                "Memory=${String.format("%.1f", load.memoryPercent)}% " +
                "(threshold=${memoryThreshold}%)"
            }
        } else {
            logger.debug {
                "System load normal: CPU=${String.format("%.1f", load.cpuPercent)}%, " +
                "Memory=${String.format("%.1f", load.memoryPercent)}%"
            }
        }

        return isOverloaded
    }
}
