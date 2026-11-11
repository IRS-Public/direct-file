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
 * Projected net profit: the annualization path scales year-to-date raw numbers to a full year in
 * the fact graph (× 12 ÷ months of data), then runs the same Schedule C/SE math. The direct path
 * (full-year actuals) must be unchanged — it just uses an annualization factor of 1.
 */
@SpringBootTest
class ProjectNetProfitTest {

    @Autowired
    PlanningGraphService graph;

    @Autowired
    PlanningTools tools;

    @Test
    void annualizesYearToDateFiguresToAFullYear() {
        String sid = tools.createSession("2025", null).sessionId();

        // Seven months of data (through July 1). Numbers chosen to annualize cleanly (× 12/7).
        var out = tools.projectNetProfit(sid, "2025-07-01", "21000", "7000", "1750", "0", "0");

        assertThat(out.status()).isEqualTo("ok");
        assertThat(out.monthsElapsed()).isEqualTo(7);
        assertThat(out.annualizationFactor()).isEqualTo("12/7");

        // Output surfaces the tax year and the rate actually used (so a wrong-year session is visible).
        assertThat(out.taxYear()).isEqualTo(2025);
        assertThat((BigDecimal) out.standardMileageRate()).isEqualByComparingTo("0.70");

        // Receipts: 21,000 × 12/7 = 36,000.
        assertThat((BigDecimal) out.projectedGrossReceipts()).isEqualByComparingTo("36000");

        // Expenses annualized too: vehicle 7,000 mi × $0.70 × 12/7 = $8,400; fees 1,750 × 12/7 = $3,000.
        // Net profit = 36,000 − (8,400 + 3,000 + 0) = 24,600.
        assertThat((BigDecimal) out.projectedNetProfit()).isEqualByComparingTo("24600");

        // SE tax is computed from the projected profit and is complete.
        assertThat(graph.readFact(sid, "/seTax").complete()).isTrue();
        assertThat((BigDecimal) out.projectedSelfEmploymentTax()).isGreaterThan(BigDecimal.ZERO);
    }

    @Test
    void directFullYearPathIsUnchangedByAnnualization() {
        String sid = tools.createSession("2025", null).sessionId();

        // calculate_se_tax writes an annualization factor of 1/1, so full-year actuals pass through.
        tools.calculateSeTax(sid, "40000", "10000", "3000", "1000", "0");

        // 40,000 − (10,000 mi × $0.70 + 3,000 + 1,000) = 40,000 − 11,000 = 29,000.
        assertThat((BigDecimal) graph.readFact(sid, "/seNetProfit").value()).isEqualByComparingTo("29000");
    }

    @Test
    void halfCentMileageRateIsExactNotRoundedToCents() {
        // The 2026 rate is 72.5¢/mile. Modeled as a Rational it is exact: 10,000 mi × $0.725 = $7,250.
        // A cents-precision Dollar would have stored 0.72 and given $7,200 — silently understating the
        // deduction (the user-reported gap). calculate_se_tax writes a 1/1 factor, so no annualization.
        String s2026 = graph.createSession(2026);
        tools.calculateSeTax(s2026, "50000", "10000", "0", "0", "0");

        assertThat((BigDecimal) graph.readFact(s2026, "/seVehicleDeduction").value())
                .isEqualByComparingTo("7250");
    }

    @Test
    void flagsProvisionalConstantsForADraftYearButNotAFinalizedOne() {
        // 2026's mileage rate and wage base are provisional (draft); the tool must say so, naming them.
        String s2026 = tools.createSession("2026", null).sessionId();
        var out2026 = tools.projectNetProfit(s2026, "2026-07-01", "21000", "7000", "0", "0", "0");
        assertThat(out2026.provisionalWarning())
                .contains("2026")
                .contains("mileage")
                .contains("Social Security wage base");

        // 2025 is finalized — no warning.
        String s2025 = tools.createSession("2025", null).sessionId();
        var out2025 = tools.projectNetProfit(s2025, "2025-07-01", "21000", "7000", "0", "0", "0");
        assertThat(out2025.provisionalWarning()).isEmpty();
    }

    @Test
    void createSessionWarnsOnlyForADraftYear() {
        assertThat(tools.createSession("2026", null).provisionalWarning()).isNotEmpty();
        assertThat(tools.createSession("2025", null).provisionalWarning()).isEmpty();
    }

    @Test
    void refusesToProjectFromBeforeTheTaxYearStarted() {
        String sid = tools.createSession("2025", null).sessionId();

        assertThatThrownBy(() -> tools.projectNetProfit(sid, "2024-11-30", "5000", "0", "0", "0", "0"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("2025");
    }

    @Test
    void refusesToProjectFromAfterTheTaxYearEndedInsteadOfSilentlyClampingToAFullYear() {
        // Bug 1 repro: a 2025 session with a 2026 asOfDate must NOT clamp to 12 months (factor 12/12),
        // which would silently return the year-to-date figure unchanged as if it were full-year.
        String sid = tools.createSession("2025", null).sessionId();

        assertThatThrownBy(() -> tools.projectNetProfit(sid, "2026-05-31", "11690", "15000", "0", "0", "0"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not within tax year 2025");
    }
}
