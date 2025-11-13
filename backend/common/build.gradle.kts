plugins {
    kotlin("jvm")
    kotlin("plugin.spring")
}

dependencies {
    // Spring Boot (without starter-web, this is a library module)
    implementation("org.springframework.boot:spring-boot-starter:3.2.1")
    implementation("org.springframework.security:spring-security-crypto")

    // Validation
    implementation("jakarta.validation:jakarta.validation-api:3.0.2")

    // Apache Commons
    implementation("org.apache.commons:commons-lang3:3.14.0")
    implementation("commons-codec:commons-codec:1.16.0")
}
