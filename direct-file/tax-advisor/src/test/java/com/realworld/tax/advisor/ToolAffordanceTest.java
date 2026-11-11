package com.realworld.tax.advisor;

import com.realworld.tax.advisor.mcp.PlanningTools;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Affordance evals: the tools must STEER a calling LLM toward correct use rather than letting it
 * improvise (the failure mode behind FIND-002/003 in the findings ledger — the agent hand-waving total
 * tax and filing-status comparisons). These assert the self-correcting responses — {@code needs_facts}
 * shapes and prerequisite notes — that point the agent at the right next tool instead of guessing.
 */
@SpringBootTest
class ToolAffordanceTest {

    @Autowired
    PlanningTools tools;

    @Test
    void quarterlyAsksForWhatIsMissingAndPointsAtTheIncomeProjection() {
        String s = tools.createSession("2025", "single").sessionId();
        var q = tools.estimateQuarterlyPayment(s, "2025-08-20");

        assertThat(q.status()).isEqualTo("needs_facts");
        assertThat(q.missingFacts())
                .extracting(PlanningTools.MissingFact::path)
                .contains(
                        "/planning/priorYearTotalTax",
                        "/planning/priorYearAGI",
                        "/planning/ytdWithholding",
                        "/planning/ytdEstimatedPaymentsMade",
                        // Total tax is derived, not entered — the prerequisite must steer to the projection.
                        "/planning/projectedCurrentYearTax");
        assertThat(q.missingFacts())
                .filteredOn(f -> f.path().equals("/planning/projectedCurrentYearTax"))
                .allSatisfy(f -> assertThat(f.prompt()).contains("project_total_tax"));
    }

    @Test
    void compareFilingStatusesAsksForIncomeFirst() {
        String s = tools.createSession("2025", "single").sessionId();
        var c = tools.compareFilingStatuses(s);
        assertThat(c.status()).isEqualTo("needs_facts");
        assertThat(c.note()).contains("calculate_se_tax", "project_net_profit");
    }

    @Test
    void totalTaxAndQbiNoteThatIncomeMustBeSetFirst() {
        String s = tools.createSession("2025", "single").sessionId();
        // No SE inputs yet — both tools should say so rather than return a misleading zero silently.
        assertThat(tools.projectTotalTax(s, null, null).note()).contains("calculate_se_tax", "project_net_profit");
        assertThat(tools.estimateQbiDeduction(s, null).note()).contains("calculate_se_tax", "project_net_profit");
    }
}
