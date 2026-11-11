package com.realworld.tax.advisor.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "tax-advisor")
public record TaxAdvisorProperties(
        /**
         * Filesystem root for prototype tax-knowledge authoring artifacts. These are
         * loaded as planning inputs only; they do not mutate filed-return facts.
         */
        String taxKnowledgeRoot,

        /**
         * Resource patterns from which to load fact-dictionary XML. The planning service
         * loads BOTH the production tax/ XMLs (from the directfile-api jar's classpath)
         * AND its own tax-plan/ XMLs, so the combined dictionary can compute SE tax and
         * estimated payments alongside the standard income/AGI/tax-liability chain.
         */
        List<String> factXmlPatterns) {

    public TaxAdvisorProperties {
        if (taxKnowledgeRoot == null || taxKnowledgeRoot.isBlank()) {
            taxKnowledgeRoot = "../tax-knowledge";
        }
        if (factXmlPatterns == null || factXmlPatterns.isEmpty()) {
            factXmlPatterns = List.of("classpath:/tax/*.xml", "classpath:/tax-plan/*.xml");
        }
    }
}
