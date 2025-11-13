package com.videomatch.processing

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

/**
 * Processing Service - Coordinates ML processing requests
 * Polls the core service for queued matches and sends them to ML service
 */
@SpringBootApplication
@EnableScheduling
class ProcessingServiceApplication

fun main(args: Array<String>) {
    runApplication<ProcessingServiceApplication>(*args)
}
