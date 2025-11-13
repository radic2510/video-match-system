package com.videomatch.core.domain.model

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

/**
 * User role enumeration
 */
enum class UserRole {
    USER,
    ADMIN
}

/**
 * User entity representing a system user
 */
@Entity
@Table(name = "users")
data class User(
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    val id: UUID = UUID.randomUUID(),

    @Column(name = "email", nullable = false, unique = true, length = 255)
    val email: String,

    @Column(name = "name", nullable = false, length = 255)
    val name: String,

    @Column(name = "password_hash", nullable = false, length = 255)
    val passwordHash: String,

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 50)
    val role: UserRole = UserRole.USER,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now()
) {
    init {
        require(email.isNotBlank()) { "Email must not be blank" }
        require(name.isNotBlank()) { "Name must not be blank" }
        require(passwordHash.isNotBlank()) { "Password hash must not be blank" }
    }
}
