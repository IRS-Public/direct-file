package com.realworld.tax.advisor.report;

import com.realworld.tax.advisor.graph.PlanningGraphService;
import com.realworld.tax.advisor.mcp.PlanningTools;
import com.realworld.tax.advisor.report.PlanReportService.PlanReport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The taxpayer-held export: a self-contained, SHA-256-sealed planning summary the service hands
 * back rather than storing. These tests prove the artifact (a) carries the three required sections
 * with their provenance and the self-reported/unverified labelling, and (b) is genuinely tamper-
 * evident — recomputing the documented hash over the body reproduces the seal.
 */
@SpringBootTest
class PlanReportTest {

    @Autowired
    PlanningGraphService graph;

    @Autowired
    PlanningTools tools;

    @Autowired
    PlanReportService reportService;

    /** A gig-worker session whose SE-tax and quarterly figures are all computed before export. */
    private String seededSession() {
        String sid = tools.createSession("2025", null).sessionId();
        tools.calculateSeTax(sid, "40000", "10000", "3000", "1000", "0");
        tools.setFact(sid, "/planning/priorYearTotalTax", "dollar", null, "3800", "2024 Form 1040, line 24");
        tools.setFact(sid, "/planning/priorYearAGI", "dollar", null, "58000", null);
        // projectedCurrentYearTax is derived (income + SE + Additional Medicare) from the calculate_se_tax
        // inputs above — no longer an agent-entered fact.
        tools.setFact(sid, "/planning/ytdWithholding", "dollar", null, "400", null);
        tools.setFact(sid, "/planning/ytdEstimatedPaymentsMade", "dollar", null, "1800", null);
        // Populates /planning/remainingQuarters so the suggested-payment result row renders.
        tools.estimateQuarterlyPayment(sid, "2025-08-20");
        return sid;
    }

    @Test
    void reportCarriesTheThreeSectionsWithProvenanceAndDisclaimer() {
        PlanReport report = reportService.generate(seededSession());
        String md = report.markdown();

        assertThat(report.taxYear()).isEqualTo(2025);
        assertThat(md).contains("Tax Year 2025");

        // Honest about what it is and is not.
        assertThat(md).contains("planning estimate, not a filed tax return");
        assertThat(md).contains("self-reported");
        assertThat(md).contains("not stored by the service");

        // Three sections present.
        assertThat(md).contains("## Your inputs (self-reported, unverified)");
        assertThat(md).contains("## Tax-year parameters used");
        assertThat(md).contains("## Results");

        // Inputs and results are traceable.
        assertThat(md).contains("Gross receipts"); // a self-reported input
        assertThat(md).contains("Self-employment tax"); // a computed result
        assertThat(md).contains("computed from:"); // one-level derivation shown

        // A taxpayer-stated source note rides through to the inputs table.
        assertThat(md).contains("2024 Form 1040, line 24");

        // With citations on (the default), authorities resolve to formal citations, each result
        // names the basis behind it, and a friendly plain-language Sources section is appended.
        assertThat(md).contains("26 U.S.C. § 6654");
        assertThat(md).contains("based on:");
        assertThat(md).contains("## Sources & plain-language");
        assertThat(md).contains("In plain terms:");

        // 2025 is finalized, so no provisional banner.
        assertThat(md).doesNotContain("Provisional values");
    }

    @Test
    void flagsProvisionalParametersInTheReportForADraftYear() {
        String sid = tools.createSession("2026", null).sessionId();
        tools.calculateSeTax(sid, "40000", "10000", "0", "0", "0");
        String md = reportService.generate(sid).markdown();

        // 2026's draft constants surface as a banner and are marked in the parameter table.
        assertThat(md).contains("Provisional values for 2026");
        assertThat(md).contains("⚠ provisional");
    }

    @Test
    void citationsCanBeOmittedAndLeaveTheRawSourceIds() {
        String sid = seededSession();
        String without = reportService.generate(sid, false).markdown();
        String with = reportService.generate(sid, true).markdown();

        // Off: no citation prose, raw source ids retained in the parameter table.
        assertThat(without).doesNotContain("## Sources & plain-language");
        assertThat(without).doesNotContain("based on:");
        assertThat(without).contains("irc_6654");

        // On: the same session gains the citation layer.
        assertThat(with).contains("## Sources & plain-language");
        assertThat(with).contains("26 U.S.C. § 6654");
    }

    @Test
    void citeToolExplainsAuthorityInPlainLanguageFromTheComputation() {
        String sid = seededSession();

        // Self-employment tax flows from the Schedule SE rates and the SSA wage base, so those are
        // the authorities the cite tool surfaces — derived from the computation, not hand-mapped.
        var seTax = tools.cite(sid, "/seTax");
        assertThat(seTax.status()).isEqualTo("ok");
        assertThat(seTax.authorities()).isNotEmpty();
        assertThat(seTax.authorities()).anySatisfy(a -> {
            assertThat(a.citation()).contains("Schedule SE");
            assertThat(a.plainLanguage()).isNotBlank();
            assertThat(a.url()).startsWith("http");
        });

        // The safe-harbor target is governed by IRC § 6654.
        var safeHarbor = tools.cite(sid, "/planning/safeHarborTarget");
        assertThat(safeHarbor.authorities())
                .anySatisfy(a -> assertThat(a.citation()).contains("§ 6654"));
    }

    @Test
    void hashIsTamperEvidentOverTheDocumentedBody() {
        PlanReport report = reportService.generate(seededSession());
        String md = report.markdown();

        // Seal is present and well-formed.
        assertThat(md).contains("## Integrity");
        assertThat(md).contains(report.sha256());
        assertThat(report.sha256()).matches("[0-9a-f]{64}");

        // Re-run the exact verification the footer documents: hash everything before the
        // integrity delimiter; it must reproduce the seal.
        int idx = md.indexOf(PlanReportService.INTEGRITY_DELIMITER);
        assertThat(idx).isPositive();
        String body = md.substring(0, idx);
        assertThat(PlanReportService.sha256Hex(body)).isEqualTo(report.sha256());

        // Any edit to the body breaks the seal.
        assertThat(PlanReportService.sha256Hex(body + " ")).isNotEqualTo(report.sha256());
    }

    @Test
    void exportPlanToolReturnsTheArtifactWithoutPersisting() {
        PlanningTools.ExportPlanResult out = tools.exportPlan(seededSession(), null);

        assertThat(out.status()).isEqualTo("ok");
        assertThat(out.taxYear()).isEqualTo(2025);
        assertThat(out.hashAlgorithm()).isEqualTo("SHA-256");
        assertThat(out.sha256()).matches("[0-9a-f]{64}");
        assertThat(out.reportMarkdown()).contains("Tax Year 2025");
    }
}
