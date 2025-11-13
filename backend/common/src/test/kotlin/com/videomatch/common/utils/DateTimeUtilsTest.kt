package com.videomatch.common.utils

import org.junit.jupiter.api.Test
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class DateTimeUtilsTest {

    @Test
    fun `should get current timestamp as Instant`() {
        // When
        val now = DateTimeUtils.now()

        // Then
        assertNotNull(now)
        assertTrue(now is Instant)
        assertTrue(now <= Instant.now())
    }

    @Test
    fun `should format Instant to ISO-8601 string`() {
        // Given
        val instant = Instant.parse("2025-01-15T10:30:45Z")

        // When
        val formatted = DateTimeUtils.formatISO(instant)

        // Then
        assertEquals("2025-01-15T10:30:45Z", formatted)
    }

    @Test
    fun `should parse ISO-8601 string to Instant`() {
        // Given
        val isoString = "2025-01-15T10:30:45Z"

        // When
        val instant = DateTimeUtils.parseISO(isoString)

        // Then
        assertNotNull(instant)
        assertEquals(Instant.parse(isoString), instant)
    }

    @Test
    fun `should calculate duration between two instants in milliseconds`() {
        // Given
        val start = Instant.parse("2025-01-15T10:00:00Z")
        val end = Instant.parse("2025-01-15T10:00:01.250Z")

        // When
        val durationMs = DateTimeUtils.durationMs(start, end)

        // Then
        assertEquals(1250L, durationMs)
    }

    @Test
    fun `should check if instant is before another`() {
        // Given
        val earlier = Instant.parse("2025-01-15T10:00:00Z")
        val later = Instant.parse("2025-01-15T10:00:01Z")

        // When
        val result = DateTimeUtils.isBefore(earlier, later)

        // Then
        assertTrue(result)
    }

    @Test
    fun `should check if instant is after another`() {
        // Given
        val earlier = Instant.parse("2025-01-15T10:00:00Z")
        val later = Instant.parse("2025-01-15T10:00:01Z")

        // When
        val result = DateTimeUtils.isAfter(later, earlier)

        // Then
        assertTrue(result)
    }

    @Test
    fun `should add milliseconds to instant`() {
        // Given
        val instant = Instant.parse("2025-01-15T10:00:00Z")
        val millisToAdd = 5000L

        // When
        val result = DateTimeUtils.plusMillis(instant, millisToAdd)

        // Then
        assertEquals(Instant.parse("2025-01-15T10:00:05Z"), result)
    }

    @Test
    fun `should convert instant to LocalDateTime in UTC`() {
        // Given
        val instant = Instant.parse("2025-01-15T10:30:45Z")

        // When
        val localDateTime = DateTimeUtils.toLocalDateTime(instant)

        // Then
        assertNotNull(localDateTime)
        assertEquals(2025, localDateTime.year)
        assertEquals(1, localDateTime.monthValue)
        assertEquals(15, localDateTime.dayOfMonth)
        assertEquals(10, localDateTime.hour)
        assertEquals(30, localDateTime.minute)
        assertEquals(45, localDateTime.second)
    }

    @Test
    fun `should get start of day for given instant`() {
        // Given
        val instant = Instant.parse("2025-01-15T14:30:45Z")

        // When
        val startOfDay = DateTimeUtils.startOfDay(instant)

        // Then
        assertEquals(Instant.parse("2025-01-15T00:00:00Z"), startOfDay)
    }

    @Test
    fun `should get end of day for given instant`() {
        // Given
        val instant = Instant.parse("2025-01-15T14:30:45Z")

        // When
        val endOfDay = DateTimeUtils.endOfDay(instant)

        // Then
        assertEquals(Instant.parse("2025-01-15T23:59:59.999999999Z"), endOfDay)
    }
}
