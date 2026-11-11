package com.realworld.tax.advisor;

import java.math.BigDecimal;

import com.realworld.tax.advisor.graph.PlanningGraphService;
import com.realworld.tax.advisor.mcp.PlanningTools;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Exercises a full agentic flow end-to-end through the Spring AI tool surface:
 *
 *   1. Create a planning session via the create_session tool.
 *   2. Initial call to estimate_quarterly_payment returns 'needs_facts'.
 *   3. Agent writes each required fact via set_fact.
 *   4. Second call returns a recommended Q3 payment with a derivation chain.
 *
 * Uses a realistic gig-worker scenario: Uber + DoorDash driver in TY2025,
 * netting ~$32K SE profit, prior-year tax $3,800, AGI $58K (not high-income),
 * has $400 in 1099 withholding YTD, has paid Q1+Q2 already.
 */
@SpringBootTest
class QuarterlyEstimateIntegrationTest {

    @Autowired
    PlanningGraphService graph;

    @Autowired
    PlanningTools tools;

    @Test
    void quarterlyEstimateFlow() {
        String sid = tools.createSession("2025", null).sessionId();

        // 1) Without any facts populated, the tool should ask for what's missing.
        var before = tools.estimateQuarterlyPayment(sid, "2025-08-20");
        assertThat(before.status()).isEqualTo("needs_facts");
        assertThat(before.missingFacts()).isNotEmpty();

        // 2) Gather facts the way the LLM agent would after a short interview.
        writeDollar(sid, "/planning/priorYearTotalTax", 3800);
        writeDollar(sid, "/planning/priorYearAGI", 58000);
        // projectedCurrentYearTax is now DERIVED (was an agent-entered guess). Populate the Schedule C
        // inputs so it computes: ~$32K net profit -> total tax (income + SE) comfortably above the
        // $4,222 the 90% leg would need to beat the $3,800 prior-year leg, so the prior-year leg governs.
        tools.calculateSeTax(sid, "32000", null, null, null, null);
        writeDollar(sid, "/planning/ytdWithholding", 400);
        writeDollar(sid, "/planning/ytdEstimatedPaymentsMade", 1800); // Q1 + Q2 already paid

        // 3) Run again — now we should get a real recommendation.
        var after = tools.estimateQuarterlyPayment(sid, "2025-08-20");
        assertThat(after.status()).isEqualTo("ok");
        assertThat(after.nextDeadline()).isEqualTo("2025-09-15");
        assertThat(after.quarter()).isEqualTo("Q3");

        BigDecimal recommended = (BigDecimal) after.recommendedPayment();
        // Safe harbor = lesser of (100% of $3,800 = $3,800) and (90% of $7,200 = $6,480) -> $3,800.
        // Remaining due = $3,800 - $2,200 (withholding + paid) = $1,600.
        // Split across remaining 2 quarters (Q3 + Q4) -> $800 per quarter.
        assertThat(recommended).isEqualByComparingTo("800");
    }

    /**
     * Exercises the high-income (110%) safe-harbor leg, which the gig-worker scenario above
     * never reaches (its AGI is below the threshold, so the 100% identity branch wins). With
     * prior-year AGI over the $150K threshold, the injected {@code highIncomeSafeHarborRate}
     * (110/100, from estimated-tax-parameters.yaml) must multiply prior-year tax — proving the
     * rate is wired through from tax-knowledge and not a dictionary literal.
     */
    @Test
    void highIncomeSafeHarborMultipliesPriorYearTaxBy110Percent() {
        String sid = graph.createSession(2025);

        writeDollar(sid, "/planning/priorYearTotalTax", 20000);
        writeDollar(sid, "/planning/priorYearAGI", 200000); // over the $150K high-income threshold
        // Derived current-year tax: ~$130K net profit yields total tax well above $24,445, so the 90%
        // current-year leg (>= ~$28K) exceeds the 110% prior-year leg ($22,000) and the prior-year leg wins.
        tools.calculateSeTax(sid, "130000", null, null, null, null);

        // High-income tier engaged.
        assertThat(graph.readFact(sid, "/planning/highIncomeSafeHarborApplies").value())
                .isEqualTo(true);
        // Prior-year leg = 110% x $20,000 = $22,000 (would be $20,000 if the rate weren't applied).
        assertThat((BigDecimal) graph.readFact(sid, "/planning/priorYearSafeHarborTarget")
                        .value())
                .isEqualByComparingTo("22000");
        // Overall target = lesser of ($22,000, 90% x $30,000 = $27,000) = $22,000.
        assertThat((BigDecimal)
                        graph.readFact(sid, "/planning/safeHarborTarget").value())
                .isEqualByComparingTo("22000");
    }

    private void writeDollar(String sid, String path, int dollars) {
        tools.setFact(sid, path, "dollar", null, Integer.toString(dollars), null);
    }
}
