package com.videomatch.core.presentation.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.ninjasquad.springmockk.MockkBean
import com.videomatch.common.exception.ResourceNotFoundException
import com.videomatch.common.exception.UnauthorizedException
import com.videomatch.common.exception.ValidationException
import com.videomatch.core.application.dto.*
import com.videomatch.core.application.service.JwtTokenService
import com.videomatch.core.application.service.UserService
import com.videomatch.core.domain.model.User
import com.videomatch.core.domain.model.UserRole
import io.mockk.coEvery
import io.mockk.coVerify
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import java.time.Instant
import java.util.UUID

/**
 * Test suite for UserController
 */
@WebMvcTest(UserController::class)
class UserControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @MockkBean
    private lateinit var userService: UserService

    @MockkBean
    private lateinit var jwtTokenService: JwtTokenService

    private val testUserId = UUID.randomUUID()
    private val testUser = User(
        id = testUserId,
        email = "test@example.com",
        name = "Test User",
        passwordHash = "hashed_password",
        role = UserRole.USER,
        createdAt = Instant.now()
    )

    @Test
    fun `POST register should create new user and return 201`() {
        // Given
        val request = RegisterUserRequest(
            email = "test@example.com",
            password = "Password123",
            name = "Test User"
        )

        coEvery { userService.registerUser(any(), any(), any()) } returns testUser

        // When/Then
        mockMvc.post("/api/users/register") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.id") { value(testUserId.toString()) }
            jsonPath("$.email") { value("test@example.com") }
            jsonPath("$.name") { value("Test User") }
            jsonPath("$.role") { value("USER") }
        }

        coVerify { userService.registerUser("test@example.com", "Password123", "Test User") }
    }

    @Test
    fun `POST register should return 400 for invalid email`() {
        // Given
        val request = RegisterUserRequest(
            email = "invalid-email",
            password = "Password123",
            name = "Test User"
        )

        coEvery { userService.registerUser(any(), any(), any()) } throws
            ValidationException("email", "Invalid email format")

        // When/Then
        mockMvc.post("/api/users/register") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `POST register should return 400 for weak password`() {
        // Given
        val request = RegisterUserRequest(
            email = "test@example.com",
            password = "weak",
            name = "Test User"
        )

        coEvery { userService.registerUser(any(), any(), any()) } throws
            ValidationException("password", "Password must be at least 8 characters")

        // When/Then
        mockMvc.post("/api/users/register") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `POST login should return token for valid credentials`() {
        // Given
        val request = LoginRequest(
            email = "test@example.com",
            password = "Password123"
        )
        val token = "generated.jwt.token"

        coEvery { userService.loginUser(any(), any()) } returns testUser
        coEvery { jwtTokenService.generateToken(any()) } returns token

        // When/Then
        mockMvc.post("/api/users/login") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isOk() }
            jsonPath("$.token") { value(token) }
            jsonPath("$.user.id") { value(testUserId.toString()) }
            jsonPath("$.user.email") { value("test@example.com") }
        }

        coVerify { userService.loginUser("test@example.com", "Password123") }
        coVerify { jwtTokenService.generateToken(testUser) }
    }

    @Test
    fun `POST login should return 401 for invalid credentials`() {
        // Given
        val request = LoginRequest(
            email = "test@example.com",
            password = "WrongPassword"
        )

        coEvery { userService.loginUser(any(), any()) } throws
            UnauthorizedException("Invalid email or password")

        // When/Then
        mockMvc.post("/api/users/login") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isUnauthorized() }
        }
    }

    @Test
    fun `GET user by id should return user when found`() {
        // Given
        coEvery { userService.getUserById(testUserId) } returns testUser

        // When/Then
        mockMvc.get("/api/users/$testUserId").andExpect {
            status { isOk() }
            jsonPath("$.id") { value(testUserId.toString()) }
            jsonPath("$.email") { value("test@example.com") }
            jsonPath("$.name") { value("Test User") }
        }

        coVerify { userService.getUserById(testUserId) }
    }

    @Test
    fun `GET user by id should return 404 when not found`() {
        // Given
        val nonExistentId = UUID.randomUUID()
        coEvery { userService.getUserById(nonExistentId) } returns null

        // When/Then
        mockMvc.get("/api/users/$nonExistentId").andExpect {
            status { isNotFound() }
        }
    }

    @Test
    fun `PUT update user should update and return user`() {
        // Given
        val updateRequest = UserUpdateRequest(
            name = "Updated Name",
            email = "updated@example.com"
        )
        val updatedUser = testUser.copy(
            name = "Updated Name",
            email = "updated@example.com"
        )

        coEvery { userService.updateUser(testUserId, any(), any(), any()) } returns updatedUser

        // When/Then
        mockMvc.put("/api/users/$testUserId") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(updateRequest)
        }.andExpect {
            status { isOk() }
            jsonPath("$.id") { value(testUserId.toString()) }
            jsonPath("$.name") { value("Updated Name") }
            jsonPath("$.email") { value("updated@example.com") }
        }

        coVerify {
            userService.updateUser(
                id = testUserId,
                email = "updated@example.com",
                name = "Updated Name",
                password = null
            )
        }
    }

    @Test
    fun `PUT update user should return 404 when user not found`() {
        // Given
        val updateRequest = UserUpdateRequest(name = "Updated Name")
        val nonExistentId = UUID.randomUUID()

        coEvery { userService.updateUser(nonExistentId, any(), any(), any()) } throws
            ResourceNotFoundException("User", nonExistentId.toString())

        // When/Then
        mockMvc.put("/api/users/$nonExistentId") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(updateRequest)
        }.andExpect {
            status { isNotFound() }
        }
    }

    @Test
    fun `DELETE user should return 204 when successful`() {
        // Given
        coEvery { userService.deleteUser(testUserId) } returns true

        // When/Then
        mockMvc.delete("/api/users/$testUserId").andExpect {
            status { isNoContent() }
        }

        coVerify { userService.deleteUser(testUserId) }
    }

    @Test
    fun `DELETE user should return 404 when user not found`() {
        // Given
        val nonExistentId = UUID.randomUUID()
        coEvery { userService.deleteUser(nonExistentId) } returns false

        // When/Then
        mockMvc.delete("/api/users/$nonExistentId").andExpect {
            status { isNotFound() }
        }
    }
}
