package com.realworld.tax.advisor;

import java.math.BigDecimal;

import com.realworld.tax.advisor.mcp.PlanningTools;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regression for the defect a real chat transcript surfaced: the projected total tax used to be an
 * agent-supplied guess, so the "projected balance due at filing" was a number the service never
 * computed (a hallucinated $5,534 that did not equal income tax + SE tax). Now total tax is DERIVED,
 * so it is internally consistent with its parts and the balance due is just total minus payments.
 *
 * <p>Scenario is the transcript's: a single delivery driver, TY2026, ~6 months of data — $18,360
 * gross, 6,700 business miles, $450 platform fees, no W-2.
 */
@SpringBootTest
class TotalTaxConsistencyTest {

    @Autowired
    PlanningTools tools;

    @Test
    void derivedTotalTaxEqualsItsPartsAndQbiIsCapped() {
        String sid = tools.createSession("2026", "single").sessionId();
        // Six months of year-to-date figures, annualized straight-line (factor 12/6 = 2).
        tools.projectNetProfit(sid, "2026-06-30", "18360", "6700", "450", null, null);

        var t = tools.projectTotalTax(sid, null, null);

        BigDecimal netProfit = (BigDecimal) t.netProfit();
        BigDecimal agi = (BigDecimal) t.adjustedGrossIncome();
        BigDecimal incomeTax = (BigDecimal) t.incomeTax();
        BigDecimal seTax = (BigDecimal) t.selfEmploymentTax();
        BigDecimal additionalMedicare = (BigDecimal) t.additionalMedicareTax();
        BigDecimal total = (BigDecimal) t.projectedTotalTax();

        // Annualized net profit matches the transcript: $36,720 gross − $9,715 mileage − $900 fees.
        assertThat(netProfit).isEqualByComparingTo("26105");
        // AGI = net profit − deductible half of SE tax.
        assertThat(agi).isEqualByComparingTo("24260");

        // THE FIX: the total is exactly income tax + SE tax + Additional Medicare — not a phantom number
        // that fails to equal its own breakdown (the transcript's $5,534 ≠ $441 + $3,689).
        assertThat(total).isEqualByComparingTo(incomeTax.add(seTax).add(additionalMedicare));

        // QBI is correctly capped at 20% of taxable income before QBI. With a ~$16,100 standard deduction,
        // taxable income before QBI is only ~$8,160, so the income cap (~$1,632) binds far below the
        // ~$4,852 uncapped component the transcript wrongly deducted.
        BigDecimal qbiDeduction = (BigDecimal) t.qbiDeduction();
        assertThat(qbiDeduction).isLessThan(new BigDecimal("4852"));

        // The balance due is total minus payments already made — derived, not independently guessed.
        tools.setFact(sid, "/planning/priorYearTotalTax", "dollar", null, "780", null);
        tools.setFact(sid, "/planning/priorYearAGI", "dollar", null, "11900", null);
        tools.setFact(sid, "/planning/ytdWithholding", "dollar", null, "0", null);
        tools.setFact(sid, "/planning/ytdEstimatedPaymentsMade", "dollar", null, "200", null);

        var q = tools.estimateQuarterlyPayment(sid, "2026-06-08");
        assertThat(q.status()).isEqualTo("ok");
        assertThat((BigDecimal) q.projectedBalanceDueAtFiling())
                .isEqualByComparingTo(total.subtract(new BigDecimal("200")));
        // And the projected total the quarterly tool reports is the same derived figure.
        assertThat((BigDecimal) q.projectedTotalTax()).isEqualByComparingTo(total);
    }
}
