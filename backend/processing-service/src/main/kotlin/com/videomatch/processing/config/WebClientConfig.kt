package com.videomatch.processing.config

import io.netty.channel.ChannelOption
import io.netty.handler.timeout.ReadTimeoutHandler
import io.netty.handler.timeout.WriteTimeoutHandler
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.client.reactive.ReactorClientHttpConnector
import org.springframework.web.reactive.function.client.WebClient
import reactor.netty.http.client.HttpClient
import java.time.Duration
import java.util.concurrent.TimeUnit

/**
 * WebClient configuration for HTTP communication
 */
@Configuration
class WebClientConfig {

    @Value("\${ml-service.timeout-seconds:30}")
    private val timeoutSeconds: Long = 30

    @Value("\${ml-service.url}")
    private lateinit var mlServiceUrl: String

    @Bean
    fun webClient(): WebClient {
        val httpClient = HttpClient.create()
            .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5000)
            .responseTimeout(Duration.ofSeconds(timeoutSeconds))
            .doOnConnected { conn ->
                conn.addHandlerLast(ReadTimeoutHandler(timeoutSeconds, TimeUnit.SECONDS))
                conn.addHandlerLast(WriteTimeoutHandler(timeoutSeconds, TimeUnit.SECONDS))
            }

        return WebClient.builder()
            .baseUrl(mlServiceUrl)
            .clientConnector(ReactorClientHttpConnector(httpClient))
            .build()
    }
}
