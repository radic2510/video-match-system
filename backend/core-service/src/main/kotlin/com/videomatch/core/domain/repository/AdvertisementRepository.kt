package com.videomatch.core.domain.repository

import com.videomatch.core.domain.model.Advertisement
import com.videomatch.core.domain.model.AdvertisementStatus
import java.util.UUID

/**
 * Repository interface for Advertisement entity operations
 * Uses Kotlin coroutines for async operations
 */
interface AdvertisementRepository {

    /**
     * Save an advertisement to the database
     * @param advertisement Advertisement entity to save
     * @return Saved advertisement entity
     */
    fun save(advertisement: Advertisement): Advertisement

    /**
     * Find an advertisement by ID
     * @param id Advertisement ID
     * @return Advertisement if found, null otherwise
     */
    fun findById(id: UUID): Advertisement?

    /**
     * Find all advertisements
     * @return List of all advertisements
     */
    fun findAll(): List<Advertisement>

    /**
     * Find advertisements by brand name
     * @param brandName Brand name to search for
     * @return List of advertisements matching the brand name
     */
    fun findByBrandName(brandName: String): List<Advertisement>

    /**
     * Update an advertisement
     * @param advertisement Advertisement entity with updated fields
     * @return Updated advertisement entity
     */
    fun update(advertisement: Advertisement): Advertisement

    /**
     * Update advertisement status
     * @param id Advertisement ID
     * @param status New status
     * @return Updated advertisement if found, null otherwise
     */
    fun updateStatus(id: UUID, status: AdvertisementStatus): Advertisement?

    /**
     * Delete an advertisement by ID
     * @param id Advertisement ID
     */
    fun delete(id: UUID)
}
