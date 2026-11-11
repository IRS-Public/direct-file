package com.realworld.tax.advisor.citation;

import com.realworld.tax.advisor.knowledge.TaxKnowledgeService;
import com.realworld.tax.advisor.knowledge.TaxKnowledgeService.Citation;
import com.realworld.tax.advisor.knowledge.TaxKnowledgeService.TaxParameter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Every {@code source_id} a published parameter references must resolve in the citation registry —
 * otherwise the export would print a dangling id with no authority behind it. This guards the
 * invariant: add a parameter with a new source_id and you must add its citation, or this fails.
 */
@SpringBootTest
class CitationRegistryTest {

    @Autowired
    TaxKnowledgeService taxKnowledge;

    @Test
    void everyParameterSourceIdResolvesToACitation() {
        for (int year : new int[] {2024, 2025, 2026}) {
            for (TaxParameter p : taxKnowledge.taxParametersForYear(year)) {
                if (p.sourceId() == null) {
                    continue;
                }
                assertThat(taxKnowledge.citation(p.sourceId()))
                        .as("citation for source_id '%s' (referenced by %s in %d)", p.sourceId(), p.factPath(), year)
                        .isNotNull();
            }
        }
    }

    @Test
    void citationsCarryFormalCitationAndFriendlyPlainLanguage() {
        Citation c = taxKnowledge.citation("irc_6654");
        assertThat(c).isNotNull();
        assertThat(c.citation()).isEqualTo("26 U.S.C. § 6654");
        assertThat(c.authority()).isEqualTo("statute");
        assertThat(c.url()).startsWith("https://");
        assertThat(c.plainLanguage()).isNotBlank();
        // Friendly register: no section-symbol jargon in the plain-language explanation itself.
        assertThat(c.plainLanguage()).doesNotContain("§");
    }
}
