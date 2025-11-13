package com.videomatch.core.infrastructure.repository

import com.videomatch.core.domain.model.Match
import com.videomatch.core.domain.model.MatchResult
import com.videomatch.core.domain.model.MatchStatus
import com.videomatch.core.domain.repository.MatchRepository
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * JPA implementation of MatchRepository using Kotlin coroutines
 */
@Repository
class MatchRepositoryImpl : MatchRepository {

    @PersistenceContext
    private lateinit var entityManager: EntityManager

    @Transactional
    override suspend fun save(match: Match): Match {
        entityManager.persist(match)
        entityManager.flush()
        return match
    }

    @Transactional(readOnly = true)
    override suspend fun findById(id: UUID): Match? {
        return entityManager.find(Match::class.java, id)
    }

    @Transactional(readOnly = true)
    override suspend fun findByUserId(userId: UUID): List<Match> {
        val query = entityManager.createQuery(
            "SELECT m FROM Match m WHERE m.userId = :userId",
            Match::class.java
        )
        query.setParameter("userId", userId)
        return query.resultList
    }

    @Transactional(readOnly = true)
    override suspend fun findByStatus(status: MatchStatus): List<Match> {
        val query = entityManager.createQuery(
            "SELECT m FROM Match m WHERE m.status = :status",
            Match::class.java
        )
        query.setParameter("status", status)
        return query.resultList
    }

    @Transactional
    override suspend fun updateStatus(id: UUID, status: MatchStatus): Match? {
        val match = entityManager.find(Match::class.java, id) ?: return null
        val updated = match.copy(status = status)
        val merged = entityManager.merge(updated)
        entityManager.flush()
        return merged
    }

    @Transactional
    override suspend fun updateResult(id: UUID, result: MatchResult): Match? {
        val match = entityManager.find(Match::class.java, id) ?: return null
        val updated = match.copy(result = result)
        val merged = entityManager.merge(updated)
        entityManager.flush()
        return merged
    }

    @Transactional
    override suspend fun delete(id: UUID) {
        val match = entityManager.find(Match::class.java, id)
        if (match != null) {
            entityManager.remove(match)
            entityManager.flush()
        }
    }

    @Transactional(readOnly = true)
    override suspend fun findAll(): List<Match> {
        val query = entityManager.createQuery("SELECT m FROM Match m", Match::class.java)
        return query.resultList
    }
}
