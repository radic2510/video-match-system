package com.videomatch.core.domain.converter

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.videomatch.core.domain.model.MatchResult
import jakarta.persistence.AttributeConverter
import jakarta.persistence.Converter

/**
 * JPA converter for MatchResult to JSON
 */
@Converter(autoApply = true)
class MatchResultConverter : AttributeConverter<MatchResult?, String?> {

    private val objectMapper: ObjectMapper = jacksonObjectMapper()

    override fun convertToDatabaseColumn(attribute: MatchResult?): String? {
        return attribute?.let { objectMapper.writeValueAsString(it) }
    }

    override fun convertToEntityAttribute(dbData: String?): MatchResult? {
        return dbData?.let { objectMapper.readValue<MatchResult>(it) }
    }
}
