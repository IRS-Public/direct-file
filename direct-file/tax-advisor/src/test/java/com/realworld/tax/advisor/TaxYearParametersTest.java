package com.realworld.tax.advisor;

import java.math.BigDecimal;

import com.realworld.tax.advisor.graph.PlanningGraphService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The year-indexed self-employment constants (standard mileage rate, Social Security wage base)
 * are sourced from tax-knowledge by tax year and injected at session creation — not hard-coded to
 * a single year. A year with no published parameters is refused rather than silently using
 * another year's rates. Adding a future year is a tax-knowledge YAML file, not a code change.
 */
@SpringBootTest
class TaxYearParametersTest {

    @Autowired
    PlanningGraphService graph;

    @Test
    void injectsYearIndexedConstantsMatchingTheTaxYear() {
        String s2024 = graph.createSession(2024);
        String s2025 = graph.createSession(2025);

        // standardMileageRate is a Rational (exact, can carry a half-cent), read as a decimal.
        assertThat(graph.readDecimal(s2024, "/standardMileageRate")).isEqualByComparingTo("0.67");
        assertThat(graph.readDecimal(s2025, "/standardMileageRate")).isEqualByComparingTo("0.70");
        assertThat((BigDecimal) graph.readFact(s2024, "/socialSecurityWageBase").value())
                .isEqualByComparingTo("168600");
        assertThat((BigDecimal) graph.readFact(s2025, "/socialSecurityWageBase").value())
                .isEqualByComparingTo("176100");

        // The Dollar statutory thresholds are folded into the year params too (single source of truth).
        assertThat((BigDecimal) graph.readFact(s2025, "/seFilingThreshold").value())
                .isEqualByComparingTo("400");
        assertThat((BigDecimal)
                        graph.readFact(s2025, "/highIncomeSafeHarborThreshold").value())
                .isEqualByComparingTo("150000");

        // The FICA rates are Rationals and are injected too (writable Rational is supported by the
        // engine; the schema's WritableContent now allows it). The dictionary holds no SE constants.
        assertThat(graph.readFact(s2025, "/seSocialSecurityRate").complete()).isTrue();
        assertThat(graph.readFact(s2025, "/seWageMultiplier").complete()).isTrue();
    }

    @Test
    void refusesAYearWithNoPublishedConstants() {
        assertThatThrownBy(() -> graph.createSession(2099))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("2099");
    }

    @Test
    void supportsTheCurrentPlanningYear2026() {
        // Bug 2: planning the year you are actually in must work. The 2026 set is draft (its mileage
        // rate and wage base are provisional pending the official announcements) but present, so a
        // 2026 session is created and the constants are injected.
        String s2026 = graph.createSession(2026);

        assertThat(graph.readDecimal(s2026, "/standardMileageRate")).isEqualByComparingTo("0.725");
        assertThat(graph.readFact(s2026, "/socialSecurityWageBase").complete()).isTrue();
        assertThat((BigDecimal) graph.readFact(s2026, "/seFilingThreshold").value())
                .isEqualByComparingTo("400");
        assertThat(graph.readFact(s2026, "/seSocialSecurityRate").complete()).isTrue();
    }
}
