package com.realworld.tax.advisor;

import java.math.BigDecimal;

import com.realworld.tax.advisor.graph.PlanningGraphService;
import com.realworld.tax.advisor.mcp.PlanningTools;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Exercises the QBI deduction (Form 8995 simple method, IRC 199A) end-to-end through the MCP tool
 * surface. Numbers are hand-verifiable. Scenario base (single, TY2025): Schedule C net profit
 * $60,000, no expenses -> net earnings 55,410, SE tax 8,478, deductible half 4,239, so
 * QBI = 60,000 - 4,239 = 55,761 and the 20% component = 11,152.
 */
@SpringBootTest
class QbiDeductionTest {

    @Autowired
    PlanningGraphService graph;

    @Autowired
    PlanningTools tools;

    private String sessionWith60kProfit(String filingStatus) {
        String sid = tools.createSession("2025", filingStatus).sessionId();
        tools.calculateSeTax(sid, "60000", null, null, null, null);
        return sid;
    }

    /**
     * Set ordinary income besides this Schedule C (e.g. a W-2), which raises taxable income. Taxable
     * income before QBI is now derived (AGI − standard deduction), so the cap is exercised through real
     * income rather than a number passed straight to the QBI tool.
     */
    private void setOtherIncome(String sid, int dollars) {
        tools.setFact(sid, "/planning/otherTaxableIncome", "dollar", null, Integer.toString(dollars), null);
    }

    @Test
    void deductionIsTwentyPercentOfQbiWhenTheIncomeLimitIsNotBinding() {
        String sid = sessionWith60kProfit("single");
        // For a pure sole proprietor the standard deduction always pulls taxable income below QBI, so the
        // income cap would bind. Add $40,000 of other ordinary income (e.g. a W-2) to lift taxable income
        // before QBI to 80,761; the cap (20% = 16,152) then exceeds the 11,152 component, so it binds.
        setOtherIncome(sid, 40000);
        var r = tools.estimateQbiDeduction(sid, "0");

        assertThat((BigDecimal) r.qualifiedBusinessIncome()).isEqualByComparingTo("55761");
        assertThat((BigDecimal) r.qbiComponent()).isEqualByComparingTo("11152");
        assertThat((BigDecimal) r.qbiIncomeLimit()).isEqualByComparingTo("16152");
        assertThat((BigDecimal) r.qbiDeduction()).isEqualByComparingTo("11152");
        assertThat(r.aboveThreshold()).isEqualTo(false);
        assertThat(r.aboveThresholdWarning()).isEmpty();
    }

    @Test
    void deductionIsCappedAtTwentyPercentOfTaxableIncome() {
        String sid = sessionWith60kProfit("single");
        // Pure SE income: AGI 55,761 − $15,000 standard deduction = 40,761 taxable income before QBI.
        // Cap = 20% × 40,761 = 8,152, below the 11,152 component, so the cap binds.
        var r = tools.estimateQbiDeduction(sid, "0");

        assertThat((BigDecimal) r.qbiIncomeLimit()).isEqualByComparingTo("8152");
        assertThat((BigDecimal) r.qbiDeduction()).isEqualByComparingTo("8152");
    }

    @Test
    void netCapitalGainsReduceTheIncomeCapBase() {
        String sid = sessionWith60kProfit("single");
        // Taxable income before QBI 40,761 minus 20,000 net capital gains = 20,761 -> cap = 4,152.
        var r = tools.estimateQbiDeduction(sid, "20000");

        assertThat((BigDecimal) r.qbiIncomeLimit()).isEqualByComparingTo("4152");
        assertThat((BigDecimal) r.qbiDeduction()).isEqualByComparingTo("4152");
    }

    @Test
    void aboveTheThresholdTheSimpleResultIsFlaggedAsAnUpperBound() {
        String sid = sessionWith60kProfit("single");
        // Push taxable income above the single TY2025 threshold (197,300) with other ordinary income:
        // AGI 60,000 + 200,000 − 4,239 = 255,761; minus $15,000 standard deduction = 240,761 > 197,300.
        setOtherIncome(sid, 200000);
        var r = tools.estimateQbiDeduction(sid, "0");

        assertThat((BigDecimal) r.qbiThreshold()).isEqualByComparingTo("197300");
        assertThat(r.aboveThreshold()).isEqualTo(true);
        assertThat(r.aboveThresholdWarning()).isNotEmpty();
    }

    @Test
    void filingStatusSelectsTheInjectedThreshold() {
        assertThat((BigDecimal) graph.readFact(graph.createSession(2025, "single"), "/qbiThreshold")
                        .value())
                .isEqualByComparingTo("197300");
        assertThat((BigDecimal) graph.readFact(graph.createSession(2025, "mfj"), "/qbiThreshold")
                        .value())
                .isEqualByComparingTo("394600");
    }
}
