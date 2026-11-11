package com.realworld.tax.advisor.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Provides a Jackson 2 {@link ObjectMapper} bean.
 *
 * <p>Spring Boot 4 switched its default JSON mapper to Jackson 3
 * ({@code tools.jackson.databind.ObjectMapper}) and no longer auto-configures a
 * Jackson 2 {@code com.fasterxml.jackson.databind.ObjectMapper} bean. This service
 * still has to speak Jackson 2 because the shared {@code data-models}
 * {@link gov.irs.directfile.models.FactTypeWithItem} record carries a Jackson 2
 * {@code com.fasterxml.jackson.databind.JsonNode}, and {@code PlanningGraphService}
 * produces those nodes via {@code valueToTree(...)}. Re-declare the Jackson 2 mapper
 * explicitly so that interop keeps working.
 *
 * <p>{@code findAndRegisterModules()} discovers the {@code jackson-datatype-jsr310}
 * module on the classpath, matching what Boot's old Jackson 2 auto-configuration did.
 */
@Configuration
public class JacksonConfig {

    @Bean
    ObjectMapper objectMapper() {
        return new ObjectMapper().findAndRegisterModules();
    }
}
