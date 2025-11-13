package com.videomatch.core.presentation.controller

import com.videomatch.core.application.dto.*
import com.videomatch.core.application.service.JwtTokenService
import com.videomatch.core.application.service.UserService
import jakarta.validation.Valid
import kotlinx.coroutines.runBlocking
import mu.KotlinLogging
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

private val logger = KotlinLogging.logger {}

/**
 * REST controller for user management
 * Handles user registration, authentication, and CRUD operations
 */
@RestController
@RequestMapping("/api/users")
class UserController(
    private val userService: UserService,
    private val jwtTokenService: JwtTokenService
) {

    /**
     * Register a new user
     * Public endpoint - no authentication required
     */
    @PostMapping("/register")
    fun register(@Valid @RequestBody request: RegisterUserRequest): ResponseEntity<UserDTO> = runBlocking {
        logger.info { "Registering new user with email: ${request.email}" }

        val user = userService.registerUser(
            email = request.email,
            password = request.password,
            name = request.name
        )

        logger.info { "User registered successfully: ${user.id}" }
        ResponseEntity.status(HttpStatus.CREATED).body(user.toDTO())
    }

    /**
     * Login user and return JWT token
     * Public endpoint - no authentication required
     */
    @PostMapping("/login")
    fun login(@Valid @RequestBody request: LoginRequest): ResponseEntity<LoginResponse> = runBlocking {
        logger.info { "Login attempt for email: ${request.email}" }

        val user = userService.loginUser(
            email = request.email,
            password = request.password
        )

        val token = jwtTokenService.generateToken(user)

        logger.info { "User logged in successfully: ${user.id}" }
        ResponseEntity.ok(
            LoginResponse(
                user = user.toDTO(),
                token = token
            )
        )
    }

    /**
     * Get user by ID
     * TODO: Add authentication - should only allow access to own user or admin
     */
    @GetMapping("/{id}")
    fun getUser(@PathVariable id: UUID): ResponseEntity<UserDTO> = runBlocking {
        logger.debug { "Getting user: $id" }

        val user = userService.getUserById(id)
            ?: return@runBlocking ResponseEntity.notFound().build()

        ResponseEntity.ok(user.toDTO())
    }

    /**
     * Update user information
     * TODO: Add authentication - should only allow updating own user
     */
    @PutMapping("/{id}")
    fun updateUser(
        @PathVariable id: UUID,
        @RequestBody updates: UserUpdateRequest
    ): ResponseEntity<UserDTO> = runBlocking {
        logger.info { "Updating user: $id" }

        val updatedUser = userService.updateUser(
            id = id,
            email = updates.email,
            name = updates.name,
            password = updates.password
        )

        logger.info { "User updated successfully: $id" }
        ResponseEntity.ok(updatedUser.toDTO())
    }

    /**
     * Delete user
     * TODO: Add authentication - should only allow deleting own user or admin
     */
    @DeleteMapping("/{id}")
    fun deleteUser(@PathVariable id: UUID): ResponseEntity<Void> = runBlocking {
        logger.info { "Deleting user: $id" }

        val deleted = userService.deleteUser(id)
        if (deleted) {
            logger.info { "User deleted successfully: $id" }
            ResponseEntity.noContent().build()
        } else {
            logger.warn { "User not found for deletion: $id" }
            ResponseEntity.notFound().build()
        }
    }
}
