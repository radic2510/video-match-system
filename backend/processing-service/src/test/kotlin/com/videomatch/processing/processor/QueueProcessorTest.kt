package com.videomatch.processing.processor

import com.videomatch.processing.client.CoreServiceClient
import com.videomatch.processing.client.MLServiceClient
import com.videomatch.processing.dto.*
import com.videomatch.processing.monitor.ResourceMonitor
import com.videomatch.processing.monitor.SystemLoad
import io.mockk.*
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.time.Instant
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

/**
 * Tests for QueueProcessor
 * Tests queue polling, match processing, and error handling
 */
class QueueProcessorTest {

    private lateinit var queueProcessor: QueueProcessor
    private lateinit var coreServiceClient: CoreServiceClient
    private lateinit var mlServiceClient: MLServiceClient
    private lateinit var resourceMonitor: ResourceMonitor

    private val testUserId = UUID.randomUUID()
    private val testMatchId1 = UUID.randomUUID()
    private val testMatchId2 = UUID.randomUUID()
    private val testVideoId = UUID.randomUUID()

    @BeforeEach
    fun setup() {
        coreServiceClient = mockk()
        mlServiceClient = mockk()
        resourceMonitor = mockk()

        queueProcessor = QueueProcessor(
            coreServiceClient = coreServiceClient,
            mlServiceClient = mlServiceClient,
            resourceMonitor = resourceMonitor,
            maxConcurrent = 3
        )
    }

    @AfterEach
    fun tearDown() {
        clearAllMocks()
    }

    @Test
    fun `processQueue should process queued matches successfully`() = runBlocking {
        // Given: Matches in queue and system not overloaded
        val match1 = MatchDTO(
            id = testMatchId1,
            userId = testUserId,
            imageHash = "abc123def456",
            status = "QUEUED",
            result = null,
            queuePosition = 1,
            priority = 100.0,
            createdAt = Instant.now()
        )

        val match2 = MatchDTO(
            id = testMatchId2,
            userId = testUserId,
            imageHash = "xyz789uvw012",
            status = "QUEUED",
            result = null,
            queuePosition = 2,
            priority = 50.0,
            createdAt = Instant.now()
        )

        val queuedMatches = listOf(match1, match2)

        // Mock resource monitor - not overloaded
        coEvery { resourceMonitor.isOverloaded() } returns false

        // Mock core service - get queue
        coEvery { coreServiceClient.getQueuedMatches() } returns queuedMatches

        // Mock ML service - successful match
        val mlResponse = MLMatchResponse(
            matched = true,
            bestMatch = BestMatch(
                videoId = testVideoId,
                frameNumber = 234,
                confidence = 0.94,
                scores = VerificationScores(
                    embedding = 0.92,
                    sift = 0.95,
                    color = 0.88,
                    text = 0.91
                )
            ),
            alternativeCandidates = emptyList(),
            processingStages = null,
            totalInferenceTimeMs = 270
        )
        coEvery { mlServiceClient.matchAdvertisement(any(), any()) } returns mlResponse

        // Mock core service - update status and result
        coEvery { coreServiceClient.updateMatchStatus(any(), any()) } just Runs
        coEvery { coreServiceClient.updateMatchResult(any(), any()) } just Runs

        // When: Processing queue
        queueProcessor.processQueue()

        // Then: Should process matches
        coVerify(exactly = 1) { coreServiceClient.getQueuedMatches() }

        // Should update status to PROCESSING for both matches
        coVerify(exactly = 2) { coreServiceClient.updateMatchStatus(any(), "PROCESSING") }

        // Should call ML service for both matches
        coVerify(exactly = 2) { mlServiceClient.matchAdvertisement(any(), any()) }

        // Should update results for both matches
        coVerify(exactly = 2) { coreServiceClient.updateMatchResult(any(), any()) }
    }

    @Test
    fun `processQueue should skip when system is overloaded`() = runBlocking {
        // Given: System is overloaded
        coEvery { resourceMonitor.isOverloaded() } returns true

        // When: Processing queue
        queueProcessor.processQueue()

        // Then: Should not process any matches
        coVerify(exactly = 0) { coreServiceClient.getQueuedMatches() }
        coVerify(exactly = 0) { mlServiceClient.matchAdvertisement(any(), any()) }
    }

    @Test
    fun `processQueue should handle empty queue gracefully`() = runBlocking {
        // Given: Empty queue
        coEvery { resourceMonitor.isOverloaded() } returns false
        coEvery { coreServiceClient.getQueuedMatches() } returns emptyList()

        // When: Processing queue
        queueProcessor.processQueue()

        // Then: Should check queue but not process anything
        coVerify(exactly = 1) { coreServiceClient.getQueuedMatches() }
        coVerify(exactly = 0) { mlServiceClient.matchAdvertisement(any(), any()) }
    }

    @Test
    fun `processQueue should respect max concurrent limit`() = runBlocking {
        // Given: More matches than max concurrent (3)
        val matches = (1..5).map { i ->
            MatchDTO(
                id = UUID.randomUUID(),
                userId = testUserId,
                imageHash = "hash$i",
                status = "QUEUED",
                result = null,
                queuePosition = i,
                priority = (100 - i).toDouble(),
                createdAt = Instant.now()
            )
        }

        coEvery { resourceMonitor.isOverloaded() } returns false
        coEvery { coreServiceClient.getQueuedMatches() } returns matches
        coEvery { coreServiceClient.updateMatchStatus(any(), any()) } just Runs
        coEvery { coreServiceClient.updateMatchResult(any(), any()) } just Runs

        val mlResponse = MLMatchResponse(
            matched = true,
            bestMatch = BestMatch(
                videoId = testVideoId,
                frameNumber = 100,
                confidence = 0.90,
                scores = VerificationScores(embedding = 0.90, sift = null, color = null, text = null)
            ),
            alternativeCandidates = null,
            processingStages = null,
            totalInferenceTimeMs = 200
        )
        coEvery { mlServiceClient.matchAdvertisement(any(), any()) } returns mlResponse

        // When: Processing queue
        queueProcessor.processQueue()

        // Then: Should only process max concurrent (3) matches
        coVerify(exactly = 3) { mlServiceClient.matchAdvertisement(any(), any()) }
    }

    @Test
    fun `processMatch should update status to FAILED on ML error`() = runBlocking {
        // Given: Match in queue and ML service fails
        val match = MatchDTO(
            id = testMatchId1,
            userId = testUserId,
            imageHash = "abc123def456",
            status = "QUEUED",
            result = null,
            queuePosition = 1,
            priority = 100.0,
            createdAt = Instant.now()
        )

        coEvery { resourceMonitor.isOverloaded() } returns false
        coEvery { coreServiceClient.getQueuedMatches() } returns listOf(match)
        coEvery { coreServiceClient.updateMatchStatus(any(), "PROCESSING") } just Runs
        coEvery { coreServiceClient.updateMatchStatus(any(), "FAILED") } just Runs

        // Mock ML service failure
        coEvery { mlServiceClient.matchAdvertisement(any(), any()) } throws Exception("ML service error")

        // When: Processing queue
        queueProcessor.processQueue()

        // Then: Should update status to FAILED
        coVerify { coreServiceClient.updateMatchStatus(testMatchId1, "PROCESSING") }
        coVerify { coreServiceClient.updateMatchStatus(testMatchId1, "FAILED") }
        coVerify(exactly = 0) { coreServiceClient.updateMatchResult(any(), any()) }
    }

    @Test
    fun `processMatch should handle no match found from ML service`() = runBlocking {
        // Given: Match in queue and ML service returns no match
        val match = MatchDTO(
            id = testMatchId1,
            userId = testUserId,
            imageHash = "abc123def456",
            status = "QUEUED",
            result = null,
            queuePosition = 1,
            priority = 100.0,
            createdAt = Instant.now()
        )

        coEvery { resourceMonitor.isOverloaded() } returns false
        coEvery { coreServiceClient.getQueuedMatches() } returns listOf(match)
        coEvery { coreServiceClient.updateMatchStatus(any(), any()) } just Runs

        // Mock ML service - no match found
        val mlResponse = MLMatchResponse(
            matched = false,
            bestMatch = null,
            alternativeCandidates = emptyList(),
            processingStages = null,
            totalInferenceTimeMs = 250
        )
        coEvery { mlServiceClient.matchAdvertisement(any(), any()) } returns mlResponse

        // When: Processing queue
        queueProcessor.processQueue()

        // Then: Should update status to COMPLETED even though no match found
        coVerify { coreServiceClient.updateMatchStatus(testMatchId1, "PROCESSING") }
        coVerify { coreServiceClient.updateMatchStatus(testMatchId1, "COMPLETED") }
        coVerify(exactly = 0) { coreServiceClient.updateMatchResult(any(), any()) }
    }

    @Test
    fun `processMatch should convert ML response to match result correctly`() = runBlocking {
        // Given: Match in queue
        val match = MatchDTO(
            id = testMatchId1,
            userId = testUserId,
            imageHash = "abc123def456",
            status = "QUEUED",
            result = null,
            queuePosition = 1,
            priority = 100.0,
            createdAt = Instant.now()
        )

        coEvery { resourceMonitor.isOverloaded() } returns false
        coEvery { coreServiceClient.getQueuedMatches() } returns listOf(match)
        coEvery { coreServiceClient.updateMatchStatus(any(), any()) } just Runs

        // Mock ML service response with detailed scores
        val mlResponse = MLMatchResponse(
            matched = true,
            bestMatch = BestMatch(
                videoId = testVideoId,
                frameNumber = 234,
                confidence = 0.94,
                scores = VerificationScores(
                    embedding = 0.92,
                    sift = 0.95,
                    color = 0.88,
                    text = 0.91
                )
            ),
            alternativeCandidates = emptyList(),
            processingStages = null,
            totalInferenceTimeMs = 270
        )
        coEvery { mlServiceClient.matchAdvertisement(any(), any()) } returns mlResponse

        // Capture the result update request
        val resultSlot = slot<UpdateMatchResultRequest>()
        coEvery { coreServiceClient.updateMatchResult(testMatchId1, capture(resultSlot)) } just Runs

        // When: Processing queue
        queueProcessor.processQueue()

        // Then: Should convert ML response correctly
        val capturedResult = resultSlot.captured
        assertEquals(testVideoId, capturedResult.matchedVideoId)
        assertEquals(0.94, capturedResult.confidence)
        assertEquals(234, capturedResult.frame)

        // Verify verification scores are properly mapped
        assertNotNull(capturedResult.verificationScores)
        assertEquals(0.92, capturedResult.verificationScores["embedding"])
        assertEquals(0.95, capturedResult.verificationScores["sift"])
        assertEquals(0.88, capturedResult.verificationScores["color"])
        assertEquals(0.91, capturedResult.verificationScores["text"])
    }
}
