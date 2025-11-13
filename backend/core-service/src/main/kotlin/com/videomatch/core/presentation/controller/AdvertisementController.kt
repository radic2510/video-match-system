package com.videomatch.core.presentation.controller

import com.videomatch.core.application.dto.AdvertisementDTO
import com.videomatch.core.application.dto.CreateAdvertisementRequest
import com.videomatch.core.application.dto.toDTO
import com.videomatch.core.application.service.AdvertisementService
import com.videomatch.core.domain.model.AdvertisementStatus
import jakarta.validation.Valid
import kotlinx.coroutines.runBlocking
import mu.KotlinLogging
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

private val logger = KotlinLogging.logger {}

/**
 * REST controller for advertisement management
 * Handles advertisement CRUD operations and status updates
 */
@RestController
@RequestMapping("/api/advertisements")
class AdvertisementController(
    private val advertisementService: AdvertisementService
) {

    /**
     * Create a new advertisement
     * Public endpoint - requires authentication
     */
    @PostMapping
    fun createAdvertisement(
        @Valid @RequestBody request: CreateAdvertisementRequest
    ): ResponseEntity<AdvertisementDTO> = runBlocking {
        logger.info { "Creating advertisement: ${request.title}" }

        val advertisement = advertisementService.createAdvertisement(
            title = request.title,
            brandName = request.brandName,
            videoPath = request.videoPath,
            totalFrames = request.totalFrames
        )

        logger.info { "Advertisement created successfully: ${advertisement.id}" }
        ResponseEntity.status(HttpStatus.CREATED).body(advertisement.toDTO())
    }

    /**
     * Get advertisement by ID
     * Public endpoint
     */
    @GetMapping("/{id}")
    fun getAdvertisement(@PathVariable id: UUID): ResponseEntity<AdvertisementDTO> = runBlocking {
        logger.debug { "Getting advertisement: $id" }

        val advertisement = advertisementService.getAdvertisement(id)
            ?: return@runBlocking ResponseEntity.notFound().build()

        ResponseEntity.ok(advertisement.toDTO())
    }

    /**
     * List all advertisements with optional brand filter
     * Public endpoint
     */
    @GetMapping
    fun listAdvertisements(
        @RequestParam(required = false) brandName: String?
    ): ResponseEntity<List<AdvertisementDTO>> = runBlocking {
        logger.debug { "Listing advertisements with brandName filter: $brandName" }

        val advertisements = advertisementService.listAdvertisements(brandName)
        val dtos = advertisements.map { it.toDTO() }

        ResponseEntity.ok(dtos)
    }

    /**
     * Update advertisement status
     * Authenticated endpoint - for internal use (Processing Service)
     */
    @PatchMapping("/{id}/status")
    fun updateStatus(
        @PathVariable id: UUID,
        @RequestBody statusUpdate: Map<String, String>
    ): ResponseEntity<AdvertisementDTO> = runBlocking {
        logger.info { "Updating advertisement status: $id" }

        // Parse status from request
        val statusStr = statusUpdate["status"]
            ?: throw IllegalArgumentException("Status is required")

        val status = try {
            AdvertisementStatus.valueOf(statusStr)
        } catch (e: IllegalArgumentException) {
            throw IllegalArgumentException("Invalid status: $statusStr. Valid values: ${AdvertisementStatus.values().joinToString()}")
        }

        val updatedAd = advertisementService.updateStatus(id, status)

        logger.info { "Advertisement status updated successfully: $id -> $status" }
        ResponseEntity.ok(updatedAd.toDTO())
    }

    /**
     * Delete advertisement
     * Authenticated endpoint
     */
    @DeleteMapping("/{id}")
    fun deleteAdvertisement(@PathVariable id: UUID): ResponseEntity<Void> = runBlocking {
        logger.info { "Deleting advertisement: $id" }

        val deleted = advertisementService.deleteAdvertisement(id)
        if (deleted) {
            logger.info { "Advertisement deleted successfully: $id" }
            ResponseEntity.noContent().build()
        } else {
            logger.warn { "Advertisement not found for deletion: $id" }
            ResponseEntity.notFound().build()
        }
    }
}
