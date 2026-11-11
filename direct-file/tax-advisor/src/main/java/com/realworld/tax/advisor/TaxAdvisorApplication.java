package com.realworld.tax.advisor;

import com.realworld.tax.advisor.config.TaxAdvisorProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

import gov.irs.directfile.models.autoconfigure.EncryptionAutoConfiguration;

@SpringBootApplication(exclude = EncryptionAutoConfiguration.class)
@EnableConfigurationProperties(TaxAdvisorProperties.class)
public class TaxAdvisorApplication {
    public static void main(String[] args) {
        SpringApplication.run(TaxAdvisorApplication.class, args);
    }
}
