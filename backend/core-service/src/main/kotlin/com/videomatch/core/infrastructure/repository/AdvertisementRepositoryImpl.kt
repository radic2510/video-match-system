package com.videomatch.core.infrastructure.repository

import com.videomatch.core.domain.model.Advertisement
import com.videomatch.core.domain.model.AdvertisementStatus
import com.videomatch.core.domain.repository.AdvertisementRepository
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * JPA implementation of AdvertisementRepository using Kotlin coroutines
 */
@Repository
class AdvertisementRepositoryImpl : AdvertisementRepository {

    @PersistenceContext
    private lateinit var entityManager: EntityManager

    @Transactional
    override suspend fun save(advertisement: Advertisement): Advertisement {
        entityManager.persist(advertisement)
        entityManager.flush()
        return advertisement
    }

    @Transactional(readOnly = true)
    override suspend fun findById(id: UUID): Advertisement? {
        return entityManager.find(Advertisement::class.java, id)
    }

    @Transactional(readOnly = true)
    override suspend fun findAll(): List<Advertisement> {
        val query = entityManager.createQuery(
            "SELECT a FROM Advertisement a",
            Advertisement::class.java
        )
        return query.resultList
    }

    @Transactional(readOnly = true)
    override suspend fun findByBrandName(brandName: String): List<Advertisement> {
        val query = entityManager.createQuery(
            "SELECT a FROM Advertisement a WHERE a.brandName = :brandName",
            Advertisement::class.java
        )
        query.setParameter("brandName", brandName)
        return query.resultList
    }

    @Transactional
    override suspend fun update(advertisement: Advertisement): Advertisement {
        val merged = entityManager.merge(advertisement)
        entityManager.flush()
        return merged
    }

    @Transactional
    override suspend fun updateStatus(id: UUID, status: AdvertisementStatus): Advertisement? {
        val advertisement = entityManager.find(Advertisement::class.java, id) ?: return null
        val updated = advertisement.copy(status = status)
        val merged = entityManager.merge(updated)
        entityManager.flush()
        return merged
    }

    @Transactional
    override suspend fun delete(id: UUID) {
        val advertisement = entityManager.find(Advertisement::class.java, id)
        if (advertisement != null) {
            entityManager.remove(advertisement)
            entityManager.flush()
        }
    }
}
