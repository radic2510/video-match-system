package com.videomatch.core.domain.repository

import com.videomatch.core.domain.model.User
import com.videomatch.core.domain.model.UserRole
import com.videomatch.core.infrastructure.repository.UserRepositoryImpl
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import java.time.Instant
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(UserRepositoryImpl::class)
class UserRepositoryTest {

    companion object {
        @Container
        val postgres = PostgreSQLContainer<Nothing>("postgres:15-alpine").apply {
            withDatabaseName("videomatch_test")
            withUsername("test")
            withPassword("test")
        }

        @JvmStatic
        @DynamicPropertySource
        fun properties(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url", postgres::getJdbcUrl)
            registry.add("spring.datasource.username", postgres::getUsername)
            registry.add("spring.datasource.password", postgres::getPassword)
        }
    }

    @Autowired
    private lateinit var userRepository: UserRepository

    @AfterEach
    fun cleanup() = runBlocking {
        // Clean up test data after each test
        userRepository.findAll().forEach { user ->
            userRepository.delete(user.id)
        }
    }

    @Test
    fun `should save user`() = runBlocking {
        // Given
        val user = User(
            email = "test@example.com",
            name = "Test User",
            passwordHash = "hashed-password",
            role = UserRole.USER,
            createdAt = Instant.now()
        )

        // When
        val savedUser = userRepository.save(user)

        // Then
        assertNotNull(savedUser)
        assertEquals(user.email, savedUser.email)
        assertEquals(user.name, savedUser.name)
        assertEquals(user.role, savedUser.role)
    }

    @Test
    fun `should find user by id`() = runBlocking {
        // Given
        val user = User(
            email = "test@example.com",
            name = "Test User",
            passwordHash = "hashed-password",
            role = UserRole.USER,
            createdAt = Instant.now()
        )
        val savedUser = userRepository.save(user)

        // When
        val foundUser = userRepository.findById(savedUser.id)

        // Then
        assertNotNull(foundUser)
        assertEquals(savedUser.id, foundUser.id)
        assertEquals(savedUser.email, foundUser.email)
    }

    @Test
    fun `should return null when user not found by id`() = runBlocking {
        // Given
        val nonExistentId = UUID.randomUUID()

        // When
        val foundUser = userRepository.findById(nonExistentId)

        // Then
        assertNull(foundUser)
    }

    @Test
    fun `should find user by email`() = runBlocking {
        // Given
        val user = User(
            email = "test@example.com",
            name = "Test User",
            passwordHash = "hashed-password",
            role = UserRole.USER,
            createdAt = Instant.now()
        )
        val savedUser = userRepository.save(user)

        // When
        val foundUser = userRepository.findByEmail("test@example.com")

        // Then
        assertNotNull(foundUser)
        assertEquals(savedUser.id, foundUser.id)
        assertEquals("test@example.com", foundUser.email)
    }

    @Test
    fun `should return null when user not found by email`() = runBlocking {
        // When
        val foundUser = userRepository.findByEmail("nonexistent@example.com")

        // Then
        assertNull(foundUser)
    }

    @Test
    fun `should check if user exists by email`() = runBlocking {
        // Given
        val user = User(
            email = "test@example.com",
            name = "Test User",
            passwordHash = "hashed-password",
            role = UserRole.USER,
            createdAt = Instant.now()
        )
        userRepository.save(user)

        // When
        val exists = userRepository.existsByEmail("test@example.com")

        // Then
        assertTrue(exists)
    }

    @Test
    fun `should return false when user does not exist by email`() = runBlocking {
        // When
        val exists = userRepository.existsByEmail("nonexistent@example.com")

        // Then
        assertTrue(!exists)
    }

    @Test
    fun `should update user`() = runBlocking {
        // Given
        val user = User(
            email = "test@example.com",
            name = "Test User",
            passwordHash = "hashed-password",
            role = UserRole.USER,
            createdAt = Instant.now()
        )
        val savedUser = userRepository.save(user)

        // When
        val updatedUser = savedUser.copy(name = "Updated Name")
        val result = userRepository.update(updatedUser)

        // Then
        assertNotNull(result)
        assertEquals("Updated Name", result.name)
        assertEquals(savedUser.id, result.id)
    }

    @Test
    fun `should delete user`() = runBlocking {
        // Given
        val user = User(
            email = "test@example.com",
            name = "Test User",
            passwordHash = "hashed-password",
            role = UserRole.USER,
            createdAt = Instant.now()
        )
        val savedUser = userRepository.save(user)

        // When
        userRepository.delete(savedUser.id)

        // Then
        val foundUser = userRepository.findById(savedUser.id)
        assertNull(foundUser)
    }

    @Test
    fun `should save multiple users`() = runBlocking {
        // Given
        val user1 = User(
            email = "user1@example.com",
            name = "User 1",
            passwordHash = "hash1",
            role = UserRole.USER,
            createdAt = Instant.now()
        )
        val user2 = User(
            email = "user2@example.com",
            name = "User 2",
            passwordHash = "hash2",
            role = UserRole.ADMIN,
            createdAt = Instant.now()
        )

        // When
        userRepository.save(user1)
        userRepository.save(user2)

        // Then
        val foundUser1 = userRepository.findByEmail("user1@example.com")
        val foundUser2 = userRepository.findByEmail("user2@example.com")
        assertNotNull(foundUser1)
        assertNotNull(foundUser2)
        assertEquals(UserRole.USER, foundUser1.role)
        assertEquals(UserRole.ADMIN, foundUser2.role)
    }

    @Test
    fun `should find all users`() = runBlocking {
        // Given
        val user1 = User(
            email = "user1@example.com",
            name = "User 1",
            passwordHash = "hash1",
            role = UserRole.USER,
            createdAt = Instant.now()
        )
        val user2 = User(
            email = "user2@example.com",
            name = "User 2",
            passwordHash = "hash2",
            role = UserRole.USER,
            createdAt = Instant.now()
        )
        userRepository.save(user1)
        userRepository.save(user2)

        // When
        val allUsers = userRepository.findAll()

        // Then
        assertEquals(2, allUsers.size)
    }
}
