package com.videomatch.core.domain.repository

import com.videomatch.core.domain.model.User
import java.util.UUID

/**
 * Repository interface for User entity operations
 * Uses Kotlin coroutines for async operations
 */
interface UserRepository {

    /**
     * Save a user to the database
     * @param user User entity to save
     * @return Saved user entity
     */
    fun save(user: User): User

    /**
     * Find a user by ID
     * @param id User ID
     * @return User if found, null otherwise
     */
    fun findById(id: UUID): User?

    /**
     * Find a user by email address
     * @param email User email
     * @return User if found, null otherwise
     */
    fun findByEmail(email: String): User?

    /**
     * Check if a user exists by email
     * @param email User email
     * @return true if user exists, false otherwise
     */
    fun existsByEmail(email: String): Boolean

    /**
     * Update a user
     * @param user User entity with updated fields
     * @return Updated user entity
     */
    fun update(user: User): User

    /**
     * Delete a user by ID
     * @param id User ID
     */
    fun delete(id: UUID)

    /**
     * Find all users
     * @return List of all users
     */
    fun findAll(): List<User>
}
