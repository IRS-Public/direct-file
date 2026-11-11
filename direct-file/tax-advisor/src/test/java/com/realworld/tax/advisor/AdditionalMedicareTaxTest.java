package com.realworld.tax.advisor;

import java.math.BigDecimal;

import com.realworld.tax.advisor.graph.PlanningGraphService;
import com.realworld.tax.advisor.mcp.PlanningTools;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Exercises the Additional Medicare Tax (Form 8959) end-to-end through the MCP tool surface,
 * including the filing-status-dependent threshold ($200K single / $250K MFJ / $125K MFS) injected
 * at session creation. Every figure below is hand-verifiable from the form's mechanics.
 */
@SpringBootTest
class AdditionalMedicareTaxTest {

    @Autowired
    PlanningGraphService graph;

    @Autowired
    PlanningTools tools;

    @Test
    void singleFilerSeOnlyOverTheTwoHundredKThreshold() {
        String sid = tools.createSession("2025", "single").sessionId();
        // Net profit $300,000, no expenses -> net earnings = 300,000 x 92.35% = $277,050.
        tools.calculateSeTax(sid, "300000", null, null, null, null);

        var r = tools.calculateAdditionalMedicare(sid, "0");

        assertThat((BigDecimal) r.additionalMedicareThreshold()).isEqualByComparingTo("200000");
        // SE earnings over the threshold = 277,050 - 200,000 = 77,050; x 0.9% = $693.45 -> $693.
        assertThat((BigDecimal) r.seIncomeOverThreshold()).isEqualByComparingTo("77050");
        assertThat((BigDecimal) r.additionalMedicareTaxOnSe()).isEqualByComparingTo("693");
        assertThat((BigDecimal) r.additionalMedicareTaxOnWages()).isEqualByComparingTo("0");
        assertThat((BigDecimal) r.additionalMedicareTax()).isEqualByComparingTo("693");
    }

    @Test
    void mfjW2WagesReduceTheThresholdRemainingForSeIncome() {
        String sid = tools.createSession("2025", "mfj").sessionId();
        // Net profit $200,000 -> net earnings = 200,000 x 92.35% = $184,700.
        tools.calculateSeTax(sid, "200000", null, null, null, null);

        // $100,000 W-2 Medicare wages. MFJ threshold $250,000; wages counted first leave $150,000
        // of threshold for SE income. SE over remaining = 184,700 - 150,000 = 34,700; x 0.9% = $312.30 -> $312.
        var r = tools.calculateAdditionalMedicare(sid, "100000");

        assertThat((BigDecimal) r.additionalMedicareThreshold()).isEqualByComparingTo("250000");
        assertThat((BigDecimal) r.seIncomeOverThreshold()).isEqualByComparingTo("34700");
        assertThat((BigDecimal) r.additionalMedicareTaxOnSe()).isEqualByComparingTo("312");
        // Wages ($100K) are below the threshold, so there is no wage-portion surtax.
        assertThat((BigDecimal) r.additionalMedicareTaxOnWages()).isEqualByComparingTo("0");
        assertThat((BigDecimal) r.additionalMedicareTax()).isEqualByComparingTo("312");
    }

    @Test
    void wagePortionAppliesWhenW2WagesAloneExceedTheThreshold() {
        String sid = tools.createSession("2025", "single").sessionId();
        tools.calculateSeTax(sid, "0", null, null, null, null); // no SE income

        // $220,000 Medicare wages, single threshold $200,000: wage portion = 20,000 x 0.9% = $180.
        var r = tools.calculateAdditionalMedicare(sid, "220000");

        assertThat((BigDecimal) r.additionalMedicareTaxOnWages()).isEqualByComparingTo("180");
        assertThat((BigDecimal) r.additionalMedicareTaxOnSe()).isEqualByComparingTo("0");
        assertThat((BigDecimal) r.additionalMedicareTax()).isEqualByComparingTo("180");
    }

    @Test
    void filingStatusSelectsTheInjectedThreshold() {
        assertThat((BigDecimal) graph.readFact(graph.createSession(2025, "single"), "/additionalMedicareThreshold")
                        .value())
                .isEqualByComparingTo("200000");
        assertThat((BigDecimal) graph.readFact(graph.createSession(2025, "mfj"), "/additionalMedicareThreshold")
                        .value())
                .isEqualByComparingTo("250000");
        assertThat((BigDecimal) graph.readFact(graph.createSession(2025, "mfs"), "/additionalMedicareThreshold")
                        .value())
                .isEqualByComparingTo("125000");
    }

    @Test
    void rejectsAnUnknownFilingStatus() {
        assertThatThrownBy(() -> graph.createSession(2025, "household"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("filing status");
    }
}
