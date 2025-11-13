package com.videomatch.core.domain.repository

import com.videomatch.core.domain.model.Advertisement
import com.videomatch.core.domain.model.AdvertisementStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

/**
 * Repository interface for Advertisement entity operations
 * Uses Kotlin coroutines for async operations
 */
@Repository
interface AdvertisementRepository : JpaRepository<Advertisement, UUID> {

    /**
     * Save an advertisement to the database
     * @param advertisement Advertisement entity to save
     * @return Saved advertisement entity
     */
    suspend fun save(advertisement: Advertisement): Advertisement

    /**
     * Find an advertisement by ID
     * @param id Advertisement ID
     * @return Advertisement if found, null otherwise
     */
    suspend fun findById(id: UUID): Advertisement?

    /**
     * Find all advertisements
     * @return List of all advertisements
     */
    suspend fun findAll(): List<Advertisement>

    /**
     * Find advertisements by brand name
     * @param brandName Brand name to search for
     * @return List of advertisements matching the brand name
     */
    suspend fun findByBrandName(brandName: String): List<Advertisement>

    /**
     * Update an advertisement
     * @param advertisement Advertisement entity with updated fields
     * @return Updated advertisement entity
     */
    suspend fun update(advertisement: Advertisement): Advertisement

    /**
     * Update advertisement status
     * @param id Advertisement ID
     * @param status New status
     * @return Updated advertisement if found, null otherwise
     */
    suspend fun updateStatus(id: UUID, status: AdvertisementStatus): Advertisement?

    /**
     * Delete an advertisement by ID
     * @param id Advertisement ID
     */
    suspend fun delete(id: UUID)
}
