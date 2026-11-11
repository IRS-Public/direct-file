package com.realworld.tax.advisor;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

import com.realworld.tax.advisor.mcp.PlanningTools;
import com.realworld.tax.advisor.mcp.PlanningTools.FilingStatusProjection;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * compare_filing_statuses answers "would my filing status change what I owe?" with COMPUTED numbers
 * (a real transcript hand-waved it instead). It re-runs the session's income under single / MFJ / MFS
 * — proving self-employment tax is constant across statuses while income tax moves with the standard
 * deduction.
 */
@SpringBootTest
class CompareFilingStatusesTest {

    @Autowired
    PlanningTools tools;

    @Test
    void needsIncomeBeforeComparing() {
        String s = tools.createSession("2026", "single").sessionId();
        var r = tools.compareFilingStatuses(s);
        assertThat(r.status()).isEqualTo("needs_facts");
        assertThat(r.projections()).isEmpty();
    }

    @Test
    void seTaxIsConstantWhileIncomeTaxFallsWithTheHigherStandardDeduction() {
        // Transcript scenario: delivery driver, ~6 months of data, $16,785 gross, 8,700 miles, TY2026.
        String s = tools.createSession("2026", "single").sessionId();
        tools.projectNetProfit(s, "2026-06-30", "16785", "8700", null, null, null);

        var r = tools.compareFilingStatuses(s);
        assertThat(r.status()).isEqualTo("ok");
        assertThat(r.projections())
                .extracting(FilingStatusProjection::filingStatus)
                .containsExactly("single", "mfj", "mfs");

        Map<String, FilingStatusProjection> byStatus = new HashMap<>();
        r.projections().forEach(p -> byStatus.put(p.filingStatus(), p));

        // SE tax is identical across all three — it is based on business profit, not filing status.
        BigDecimal seSingle = (BigDecimal) byStatus.get("single").selfEmploymentTax();
        assertThat((BigDecimal) byStatus.get("mfj").selfEmploymentTax()).isEqualByComparingTo(seSingle);
        assertThat((BigDecimal) byStatus.get("mfs").selfEmploymentTax()).isEqualByComparingTo(seSingle);

        // The MFJ standard deduction is larger, so its income tax is no higher than single's — and at
        // this income it wipes the income-tax slice out entirely (the hand-waved transcript missed this).
        assertThat((BigDecimal) byStatus.get("mfj").standardDeduction())
                .isGreaterThan((BigDecimal) byStatus.get("single").standardDeduction());
        assertThat((BigDecimal) byStatus.get("single").incomeTax()).isGreaterThan(BigDecimal.ZERO);
        assertThat((BigDecimal) byStatus.get("mfj").incomeTax()).isEqualByComparingTo("0");
    }
}
