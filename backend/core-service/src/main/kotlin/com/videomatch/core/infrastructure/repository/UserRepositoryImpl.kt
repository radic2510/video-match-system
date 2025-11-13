package com.videomatch.core.infrastructure.repository

import com.videomatch.core.domain.model.User
import com.videomatch.core.domain.repository.UserRepository
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * JPA implementation of UserRepository using Kotlin coroutines
 */
@Repository
class UserRepositoryImpl : UserRepository {

    @PersistenceContext
    private lateinit var entityManager: EntityManager

    @Transactional
    override suspend fun save(user: User): User {
        entityManager.persist(user)
        entityManager.flush()
        return user
    }

    @Transactional(readOnly = true)
    override suspend fun findById(id: UUID): User? {
        return entityManager.find(User::class.java, id)
    }

    @Transactional(readOnly = true)
    override suspend fun findByEmail(email: String): User? {
        val query = entityManager.createQuery(
            "SELECT u FROM User u WHERE u.email = :email",
            User::class.java
        )
        query.setParameter("email", email)
        return query.resultList.firstOrNull()
    }

    @Transactional(readOnly = true)
    override suspend fun existsByEmail(email: String): Boolean {
        val query = entityManager.createQuery(
            "SELECT COUNT(u) FROM User u WHERE u.email = :email",
            Long::class.java
        )
        query.setParameter("email", email)
        return query.singleResult > 0
    }

    @Transactional
    override suspend fun update(user: User): User {
        val merged = entityManager.merge(user)
        entityManager.flush()
        return merged
    }

    @Transactional
    override suspend fun delete(id: UUID) {
        val user = entityManager.find(User::class.java, id)
        if (user != null) {
            entityManager.remove(user)
            entityManager.flush()
        }
    }

    @Transactional(readOnly = true)
    override suspend fun findAll(): List<User> {
        val query = entityManager.createQuery("SELECT u FROM User u", User::class.java)
        return query.resultList
    }
}
