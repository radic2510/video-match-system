package com.videomatch.core.application.service

import com.videomatch.common.exception.ResourceNotFoundException
import com.videomatch.common.exception.ValidationException
import com.videomatch.core.domain.model.Advertisement
import com.videomatch.core.domain.model.AdvertisementStatus
import com.videomatch.core.domain.repository.AdvertisementRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * Service for managing advertisement operations
 * Handles advertisement creation, status updates, and CRUD operations
 */
@Service
class AdvertisementService(
    private val advertisementRepository: AdvertisementRepository
) {

    /**
     * Create a new advertisement
     * @param title Advertisement title
     * @param brandName Brand name
     * @param videoPath Path to the video file
     * @param totalFrames Total number of frames in the video
     * @return Created advertisement entity with PROCESSING status
     * @throws ValidationException if validation fails
     */
    @Transactional
    fun createAdvertisement(
        title: String,
        brandName: String,
        videoPath: String,
        totalFrames: Int
    ): Advertisement {
        // Validate title
        if (title.isBlank()) {
            throw ValidationException("title", "Title must not be blank")
        }

        // Validate brand name
        if (brandName.isBlank()) {
            throw ValidationException("brandName", "Brand name must not be blank")
        }

        // Validate video path
        if (videoPath.isBlank()) {
            throw ValidationException("videoPath", "Video path must not be blank")
        }

        // Validate total frames
        if (totalFrames <= 0) {
            throw ValidationException("totalFrames", "Total frames must be greater than 0")
        }

        // Create advertisement entity with PROCESSING status
        val advertisement = Advertisement(
            title = title,
            brandName = brandName,
            videoPath = videoPath,
            totalFrames = totalFrames,
            status = AdvertisementStatus.PROCESSING
        )

        // Save and return
        return advertisementRepository.save(advertisement)
    }

    /**
     * Get advertisement by ID
     * @param id Advertisement UUID
     * @return Advertisement entity if found, null otherwise
     */
    fun getAdvertisement(id: UUID): Advertisement? {
        return advertisementRepository.findById(id)
    }

    /**
     * List all advertisements, optionally filtered by brand name
     * @param brandName Optional brand name filter
     * @return List of advertisements
     */
    fun listAdvertisements(brandName: String? = null): List<Advertisement> {
        return if (brandName != null) {
            advertisementRepository.findByBrandName(brandName)
        } else {
            advertisementRepository.findAll()
        }
    }

    /**
     * Update advertisement status
     * @param id Advertisement UUID
     * @param status New status
     * @return Updated advertisement entity
     * @throws ResourceNotFoundException if advertisement not found
     */
    @Transactional
    fun updateStatus(id: UUID, status: AdvertisementStatus): Advertisement {
        // Check if advertisement exists
        advertisementRepository.findById(id)
            ?: throw ResourceNotFoundException("Advertisement", id.toString())

        // Update status
        return advertisementRepository.updateStatus(id, status)
            ?: throw ResourceNotFoundException("Advertisement", id.toString())
    }

    /**
     * Delete advertisement by ID
     * @param id Advertisement UUID
     * @return true if advertisement was deleted, false if advertisement not found
     */
    @Transactional
    fun deleteAdvertisement(id: UUID): Boolean {
        // Check if advertisement exists
        advertisementRepository.findById(id) ?: return false

        // Delete advertisement
        advertisementRepository.delete(id)
        return true
    }
}
