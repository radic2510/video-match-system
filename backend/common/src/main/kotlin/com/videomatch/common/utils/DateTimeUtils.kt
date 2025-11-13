package com.videomatch.common.utils

import java.time.Duration
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

/**
 * Utility functions for date and time operations
 */
object DateTimeUtils {
    private val UTC = ZoneId.of("UTC")
    private val isoFormatter = DateTimeFormatter.ISO_INSTANT

    /**
     * Get current timestamp as Instant
     */
    fun now(): Instant = Instant.now()

    /**
     * Format Instant to ISO-8601 string
     */
    fun formatISO(instant: Instant): String {
        return isoFormatter.format(instant)
    }

    /**
     * Parse ISO-8601 string to Instant
     */
    fun parseISO(isoString: String): Instant {
        return Instant.parse(isoString)
    }

    /**
     * Calculate duration between two instants in milliseconds
     */
    fun durationMs(start: Instant, end: Instant): Long {
        return Duration.between(start, end).toMillis()
    }

    /**
     * Check if first instant is before second
     */
    fun isBefore(first: Instant, second: Instant): Boolean {
        return first.isBefore(second)
    }

    /**
     * Check if first instant is after second
     */
    fun isAfter(first: Instant, second: Instant): Boolean {
        return first.isAfter(second)
    }

    /**
     * Add milliseconds to instant
     */
    fun plusMillis(instant: Instant, millisToAdd: Long): Instant {
        return instant.plusMillis(millisToAdd)
    }

    /**
     * Convert Instant to LocalDateTime in UTC
     */
    fun toLocalDateTime(instant: Instant): LocalDateTime {
        return LocalDateTime.ofInstant(instant, UTC)
    }

    /**
     * Get start of day (00:00:00) for given instant in UTC
     */
    fun startOfDay(instant: Instant): Instant {
        val localDate = instant.atZone(UTC).toLocalDate()
        return localDate.atStartOfDay(UTC).toInstant()
    }

    /**
     * Get end of day (23:59:59.999999999) for given instant in UTC
     */
    fun endOfDay(instant: Instant): Instant {
        val localDate = instant.atZone(UTC).toLocalDate()
        return localDate.atTime(23, 59, 59, 999_999_999).toInstant(ZoneOffset.UTC)
    }
}
