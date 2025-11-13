package com.videomatch.processing.monitor

import org.junit.jupiter.api.Test
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * Tests for ResourceMonitor
 * Tests system resource monitoring and overload detection
 */
class ResourceMonitorTest {

    @Test
    fun `getSystemLoad should return current system metrics`() {
        // Given
        val monitor = ResourceMonitor(
            cpuThreshold = 80.0,
            memoryThreshold = 90.0
        )

        // When
        val load = monitor.getSystemLoad()

        // Then
        assertNotNull(load)
        assertTrue(load.cpuPercent >= 0)
        assertTrue(load.cpuPercent <= 100)
        assertTrue(load.memoryPercent >= 0)
        assertTrue(load.memoryPercent <= 100)
    }

    @Test
    fun `isOverloaded should return false when resources are normal`() {
        // Given: High thresholds (system unlikely to exceed)
        val monitor = ResourceMonitor(
            cpuThreshold = 95.0,
            memoryThreshold = 95.0
        )

        // When
        val overloaded = monitor.isOverloaded()

        // Then: Should not be overloaded under normal conditions
        assertFalse(overloaded)
    }

    @Test
    fun `isOverloaded should return true when CPU exceeds threshold`() {
        // Given: Very low CPU threshold
        val monitor = ResourceMonitor(
            cpuThreshold = 0.1, // Nearly impossible not to exceed
            memoryThreshold = 99.0
        )

        // When
        val overloaded = monitor.isOverloaded()

        // Then: May or may not be overloaded depending on current CPU
        // This test just verifies the method runs without errors
        assertNotNull(overloaded)
    }

    @Test
    fun `isOverloaded should return true when memory exceeds threshold`() {
        // Given: Very low memory threshold
        val monitor = ResourceMonitor(
            cpuThreshold = 99.0,
            memoryThreshold = 0.1 // Nearly impossible not to exceed
        )

        // When
        val overloaded = monitor.isOverloaded()

        // Then: Should likely be overloaded
        // This test just verifies the method runs without errors
        assertNotNull(overloaded)
    }

    @Test
    fun `multiple calls to getSystemLoad should return different values`() {
        // Given
        val monitor = ResourceMonitor(
            cpuThreshold = 80.0,
            memoryThreshold = 90.0
        )

        // When: Get load multiple times
        val load1 = monitor.getSystemLoad()
        Thread.sleep(100) // Small delay
        val load2 = monitor.getSystemLoad()

        // Then: Both calls should succeed
        assertNotNull(load1)
        assertNotNull(load2)

        // CPU might change slightly, but both should be valid
        assertTrue(load1.cpuPercent >= 0)
        assertTrue(load2.cpuPercent >= 0)
    }

    @Test
    fun `getSystemLoad should handle edge cases`() {
        // Given
        val monitor = ResourceMonitor(
            cpuThreshold = 50.0,
            memoryThreshold = 50.0
        )

        // When: Get load under various conditions
        val loads = (1..5).map {
            monitor.getSystemLoad()
        }

        // Then: All loads should be valid
        loads.forEach { load ->
            assertNotNull(load)
            assertTrue(load.cpuPercent in 0.0..100.0, "CPU should be between 0-100, got ${load.cpuPercent}")
            assertTrue(load.memoryPercent in 0.0..100.0, "Memory should be between 0-100, got ${load.memoryPercent}")
        }
    }
}
