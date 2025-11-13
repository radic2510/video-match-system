package com.videomatch.core.application.service

import com.videomatch.common.exception.ResourceNotFoundException
import com.videomatch.common.exception.UnauthorizedException
import com.videomatch.common.exception.ValidationException
import com.videomatch.common.utils.HashUtils
import com.videomatch.core.domain.model.User
import com.videomatch.core.domain.model.UserRole
import com.videomatch.core.domain.repository.UserRepository
import io.mockk.*
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.time.Instant
import java.util.UUID

/**
 * Unit tests for UserService
 * Tests all business logic with mocked repository
 */
class UserServiceTest {

    private lateinit var userRepository: UserRepository
    private lateinit var userService: UserService

    @BeforeEach
    fun setup() {
        userRepository = mockk()
        userService = UserService(userRepository)
    }

    @AfterEach
    fun tearDown() {
        clearAllMocks()
    }

    // Test registerUser - Happy Path
    @Test
    fun `registerUser should create user with hashed password`() = runBlocking {
        // Given
        val email = "test@example.com"
        val password = "ValidPass123"
        val name = "Test User"

        val savedUser = User(
            id = UUID.randomUUID(),
            email = email,
            name = name,
            passwordHash = "hashed_password",
            role = UserRole.USER,
            createdAt = Instant.now()
        )

        coEvery { userRepository.existsByEmail(email) } returns false
        coEvery { userRepository.save(any()) } returns savedUser

        // When
        val result = userService.registerUser(email, password, name)

        // Then
        assertNotNull(result)
        assertEquals(email, result.email)
        assertEquals(name, result.name)
        coVerify { userRepository.existsByEmail(email) }
        coVerify { userRepository.save(any()) }
    }

    @Test
    fun `registerUser should throw ValidationException for invalid email`() = runBlocking {
        // Given
        val email = "invalid-email"
        val password = "ValidPass123"
        val name = "Test User"

        // When/Then
        val exception = assertThrows<ValidationException> {
            userService.registerUser(email, password, name)
        }
        assertEquals("email", exception.field)
    }

    @Test
    fun `registerUser should throw ValidationException for weak password`() = runBlocking {
        // Given
        val email = "test@example.com"
        val password = "weak"
        val name = "Test User"

        // When/Then
        val exception = assertThrows<ValidationException> {
            userService.registerUser(email, password, name)
        }
        assertTrue(exception.message!!.contains("password"))
    }

    @Test
    fun `registerUser should throw ValidationException for blank name`() = runBlocking {
        // Given
        val email = "test@example.com"
        val password = "ValidPass123"
        val name = ""

        // When/Then
        val exception = assertThrows<ValidationException> {
            userService.registerUser(email, password, name)
        }
        assertEquals("name", exception.field)
    }

    @Test
    fun `registerUser should throw ValidationException when email already exists`() = runBlocking {
        // Given
        val email = "test@example.com"
        val password = "ValidPass123"
        val name = "Test User"

        coEvery { userRepository.existsByEmail(email) } returns true

        // When/Then
        val exception = assertThrows<ValidationException> {
            userService.registerUser(email, password, name)
        }
        assertTrue(exception.message!!.contains("already exists"))
        coVerify { userRepository.existsByEmail(email) }
        coVerify(exactly = 0) { userRepository.save(any()) }
    }

    // Test loginUser - Happy Path
    @Test
    fun `loginUser should return user when credentials are correct`() = runBlocking {
        // Given
        val email = "test@example.com"
        val password = "ValidPass123"
        val hashedPassword = HashUtils.hashPassword(password)

        val user = User(
            id = UUID.randomUUID(),
            email = email,
            name = "Test User",
            passwordHash = hashedPassword,
            role = UserRole.USER,
            createdAt = Instant.now()
        )

        coEvery { userRepository.findByEmail(email) } returns user

        // When
        val result = userService.loginUser(email, password)

        // Then
        assertNotNull(result)
        assertEquals(email, result.email)
        coVerify { userRepository.findByEmail(email) }
    }

    @Test
    fun `loginUser should throw UnauthorizedException when user not found`() = runBlocking {
        // Given
        val email = "test@example.com"
        val password = "ValidPass123"

        coEvery { userRepository.findByEmail(email) } returns null

        // When/Then
        assertThrows<UnauthorizedException> {
            userService.loginUser(email, password)
        }
        coVerify { userRepository.findByEmail(email) }
    }

    @Test
    fun `loginUser should throw UnauthorizedException when password is incorrect`() = runBlocking {
        // Given
        val email = "test@example.com"
        val password = "ValidPass123"
        val wrongPassword = "WrongPass123"
        val hashedPassword = HashUtils.hashPassword(password)

        val user = User(
            id = UUID.randomUUID(),
            email = email,
            name = "Test User",
            passwordHash = hashedPassword,
            role = UserRole.USER,
            createdAt = Instant.now()
        )

        coEvery { userRepository.findByEmail(email) } returns user

        // When/Then
        assertThrows<UnauthorizedException> {
            userService.loginUser(email, wrongPassword)
        }
        coVerify { userRepository.findByEmail(email) }
    }

    // Test getUserById
    @Test
    fun `getUserById should return user when found`() = runBlocking {
        // Given
        val userId = UUID.randomUUID()
        val user = User(
            id = userId,
            email = "test@example.com",
            name = "Test User",
            passwordHash = "hashed_password",
            role = UserRole.USER,
            createdAt = Instant.now()
        )

        coEvery { userRepository.findById(userId) } returns user

        // When
        val result = userService.getUserById(userId)

        // Then
        assertNotNull(result)
        assertEquals(userId, result?.id)
        coVerify { userRepository.findById(userId) }
    }

    @Test
    fun `getUserById should return null when user not found`() = runBlocking {
        // Given
        val userId = UUID.randomUUID()
        coEvery { userRepository.findById(userId) } returns null

        // When
        val result = userService.getUserById(userId)

        // Then
        assertNull(result)
        coVerify { userRepository.findById(userId) }
    }

    // Test updateUser
    @Test
    fun `updateUser should update user fields`() = runBlocking {
        // Given
        val userId = UUID.randomUUID()
        val existingUser = User(
            id = userId,
            email = "test@example.com",
            name = "Old Name",
            passwordHash = "hashed_password",
            role = UserRole.USER,
            createdAt = Instant.now()
        )

        val updatedUser = existingUser.copy(name = "New Name")

        coEvery { userRepository.findById(userId) } returns existingUser
        coEvery { userRepository.update(any()) } returns updatedUser

        // When
        val result = userService.updateUser(userId, name = "New Name")

        // Then
        assertNotNull(result)
        assertEquals("New Name", result.name)
        coVerify { userRepository.findById(userId) }
        coVerify { userRepository.update(any()) }
    }

    @Test
    fun `updateUser should throw ResourceNotFoundException when user not found`() = runBlocking {
        // Given
        val userId = UUID.randomUUID()

        coEvery { userRepository.findById(userId) } returns null

        // When/Then
        assertThrows<ResourceNotFoundException> {
            userService.updateUser(userId, name = "New Name")
        }
        coVerify { userRepository.findById(userId) }
        coVerify(exactly = 0) { userRepository.update(any()) }
    }

    @Test
    fun `updateUser should validate new email when provided`() = runBlocking {
        // Given
        val userId = UUID.randomUUID()
        val existingUser = User(
            id = userId,
            email = "test@example.com",
            name = "Test User",
            passwordHash = "hashed_password",
            role = UserRole.USER,
            createdAt = Instant.now()
        )

        coEvery { userRepository.findById(userId) } returns existingUser

        // When/Then
        assertThrows<ValidationException> {
            userService.updateUser(userId, email = "invalid-email")
        }
        coVerify { userRepository.findById(userId) }
        coVerify(exactly = 0) { userRepository.update(any()) }
    }

    // Test deleteUser
    @Test
    fun `deleteUser should delete existing user and return true`() = runBlocking {
        // Given
        val userId = UUID.randomUUID()
        val user = User(
            id = userId,
            email = "test@example.com",
            name = "Test User",
            passwordHash = "hashed_password",
            role = UserRole.USER,
            createdAt = Instant.now()
        )

        coEvery { userRepository.findById(userId) } returns user
        coEvery { userRepository.delete(userId) } just Runs

        // When
        val result = userService.deleteUser(userId)

        // Then
        assertTrue(result)
        coVerify { userRepository.findById(userId) }
        coVerify { userRepository.delete(userId) }
    }

    @Test
    fun `deleteUser should return false when user not found`() = runBlocking {
        // Given
        val userId = UUID.randomUUID()
        coEvery { userRepository.findById(userId) } returns null

        // When
        val result = userService.deleteUser(userId)

        // Then
        assertFalse(result)
        coVerify { userRepository.findById(userId) }
        coVerify(exactly = 0) { userRepository.delete(any()) }
    }
}
