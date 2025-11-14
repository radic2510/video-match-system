package com.videomatch.core.application.service

import com.videomatch.common.exception.ResourceNotFoundException
import com.videomatch.common.exception.UnauthorizedException
import com.videomatch.common.exception.ValidationException
import com.videomatch.common.utils.HashUtils
import com.videomatch.common.validation.Validators
import com.videomatch.core.domain.model.User
import com.videomatch.core.domain.model.UserRole
import com.videomatch.core.domain.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * Service for managing user operations
 * Handles user registration, authentication, and CRUD operations
 */
@Service
class UserService(
    private val userRepository: UserRepository
) {

    /**
     * Register a new user
     * @param email User email address
     * @param password Plain text password
     * @param name User's full name
     * @return Created user entity
     * @throws ValidationException if validation fails
     */
    @Transactional
    fun registerUser(email: String, password: String, name: String): User {
        // Validate email
        if (!Validators.isValidEmail(email)) {
            throw ValidationException("email", "Invalid email format")
        }

        // Validate password strength
        if (!Validators.isValidPassword(password)) {
            throw ValidationException("password", "Password must be at least 8 characters with uppercase, lowercase, and digit")
        }

        // Validate name
        if (name.isBlank()) {
            throw ValidationException("name", "Name must not be blank")
        }

        // Check if email already exists
        if (userRepository.existsByEmail(email)) {
            throw ValidationException("email", "Email already exists")
        }

        // Hash password
        val passwordHash = HashUtils.hashPassword(password)

        // Create user entity
        val user = User(
            email = email,
            name = name,
            passwordHash = passwordHash,
            role = UserRole.USER
        )

        // Save and return
        return userRepository.save(user)
    }

    /**
     * Authenticate user with email and password
     * @param email User email address
     * @param password Plain text password
     * @return User entity if authentication successful
     * @throws UnauthorizedException if authentication fails
     */
    fun loginUser(email: String, password: String): User {
        // Find user by email
        val user = userRepository.findByEmail(email)
            ?: throw UnauthorizedException("Invalid email or password")

        // Verify password
        if (!HashUtils.verifyPassword(password, user.passwordHash)) {
            throw UnauthorizedException("Invalid email or password")
        }

        return user
    }

    /**
     * Get user by ID
     * @param id User UUID
     * @return User entity if found, null otherwise
     */
    fun getUserById(id: UUID): User? {
        return userRepository.findById(id)
    }

    /**
     * Update user information
     * @param id User UUID
     * @param email New email (optional)
     * @param name New name (optional)
     * @param password New password (optional)
     * @return Updated user entity
     * @throws ResourceNotFoundException if user not found
     * @throws ValidationException if validation fails
     */
    @Transactional
    fun updateUser(id: UUID, email: String? = null, name: String? = null, password: String? = null): User {
        // Find existing user
        val existingUser = userRepository.findById(id)
            ?: throw ResourceNotFoundException("User", id.toString())

        // Validate new email if provided
        email?.let { newEmail ->
            if (!Validators.isValidEmail(newEmail)) {
                throw ValidationException("email", "Invalid email format")
            }
        }

        // Validate new password if provided
        password?.let { newPassword ->
            if (!Validators.isValidPassword(newPassword)) {
                throw ValidationException("password", "Password must be at least 8 characters with uppercase, lowercase, and digit")
            }
        }

        // Validate new name if provided
        name?.let { newName ->
            if (newName.isBlank()) {
                throw ValidationException("name", "Name must not be blank")
            }
        }

        // Build updated user
        val updatedUser = existingUser.copy(
            email = email ?: existingUser.email,
            name = name ?: existingUser.name,
            passwordHash = password?.let { HashUtils.hashPassword(it) } ?: existingUser.passwordHash
        )

        // Update and return
        return userRepository.update(updatedUser)
    }

    /**
     * Delete user by ID
     * @param id User UUID
     * @return true if user was deleted, false if user not found
     */
    @Transactional
    fun deleteUser(id: UUID): Boolean {
        // Check if user exists
        userRepository.findById(id) ?: return false

        // Delete user
        userRepository.delete(id)
        return true
    }
}
