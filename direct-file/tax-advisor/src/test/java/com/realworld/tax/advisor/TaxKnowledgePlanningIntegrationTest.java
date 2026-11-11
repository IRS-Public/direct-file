package com.realworld.tax.advisor;

import java.util.List;
import java.util.Map;

import com.realworld.tax.advisor.graph.PlanningGraphService;
import com.realworld.tax.advisor.knowledge.TaxKnowledgeService;
import com.realworld.tax.advisor.mcp.PlanningTools;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class TaxKnowledgePlanningIntegrationTest {

    @Autowired
    PlanningTools tools;

    @Autowired
    PlanningGraphService graph;

    @Test
    void documentEvidenceProducesCandidateFactsAndConflictReviewItems() {
        Object result = tools.planQuestions(
                null,
                null,
                null,
                Map.of("/hasSelfEmploymentIncome", Map.of("value", false, "status", "confirmed")),
                List.<Object>of(Map.of("document_type", "form_1099_nec", "nonemployee_compensation", "12000")),
                null,
                null,
                null);

        TaxKnowledgeService.PlanResult plan = (TaxKnowledgeService.PlanResult) result;

        assertThat(plan.candidateFacts())
                .anySatisfy(candidate -> {
                    assertThat(candidate.path()).isEqualTo("/hasSelfEmploymentIncome");
                    assertThat(candidate.value()).isEqualTo(true);
                    assertThat(candidate.requiresConfirmation()).isTrue();
                })
                .anySatisfy(candidate -> {
                    assertThat(candidate.path()).isEqualTo("/seGrossReceipts");
                    assertThat(candidate.value()).isEqualTo("12000");
                });
        assertThat(plan.conflicts())
                .extracting(TaxKnowledgeService.ReviewConflict::conflictId)
                .contains("no_self_employment_but_1099_nec_present");
        assertThat(plan.questions())
                .extracting(TaxKnowledgeService.PlannedQuestion::questionId)
                .doesNotContain("uses_vehicle_for_business", "se_vehicle_business_miles");
    }

    @Test
    void priorAnswersGateDetailQuestions() {
        Object result = tools.planQuestions(
                null,
                null,
                null,
                Map.of(
                        "/hasSelfEmploymentIncome", Map.of("value", true, "status", "confirmed"),
                        "/usesVehicleForBusiness", Map.of("value", true, "status", "confirmed")),
                null,
                null,
                null,
                null);

        TaxKnowledgeService.PlanResult plan = (TaxKnowledgeService.PlanResult) result;

        assertThat(plan.questions())
                .extracting(TaxKnowledgeService.PlannedQuestion::questionId)
                .contains("se_vehicle_business_miles")
                .doesNotContain("has_self_employment_income", "uses_vehicle_for_business");
    }

    @Test
    void sessionFactsAreTreatedAsConfirmedAnswers() {
        String sessionId = setFactSessionWithSelfEmploymentAnswer(false);

        Object result = tools.planQuestions(
                sessionId, null, null, null, null, Map.of("prior_year_topics", List.of("self_employment")), null, null);

        TaxKnowledgeService.PlanResult plan = (TaxKnowledgeService.PlanResult) result;

        assertThat(plan.conflicts())
                .extracting(TaxKnowledgeService.ReviewConflict::conflictId)
                .contains("prior_year_schedule_c_but_current_year_denied");
        assertThat(plan.questions())
                .extracting(TaxKnowledgeService.PlannedQuestion::questionId)
                .doesNotContain("has_self_employment_income", "uses_vehicle_for_business");
    }

    @Test
    void gigDriver1099kDrivesSeSignalThenUnlocksGigDetailQuestions() {
        // A delivery driver's platform issues a Form 1099-K: it should signal self-employment and
        // pre-fill candidate facts to confirm (not silently assume them).
        var withDoc = tools.planQuestions(
                null,
                2025,
                null,
                null,
                List.<Object>of(Map.of("document_type", "form_1099_k", "gross_amount", "24000")),
                null,
                null,
                null);
        assertThat(withDoc.evidenceSignals())
                .anySatisfy(signal -> assertThat(signal.topicId()).isEqualTo("self_employment"));
        assertThat(withDoc.candidateFacts())
                .anySatisfy(candidate -> {
                    assertThat(candidate.path()).isEqualTo("/hasSelfEmploymentIncome");
                    assertThat(candidate.value()).isEqualTo(true);
                    assertThat(candidate.requiresConfirmation()).isTrue();
                })
                .anySatisfy(candidate -> {
                    assertThat(candidate.path()).isEqualTo("/seGrossReceipts");
                    assertThat(candidate.value()).isEqualTo("24000");
                });

        // Once gig income is confirmed, the gig detail questions (fees, supplies, quarterly anchor) unlock.
        var confirmed = tools.planQuestions(
                null,
                2025,
                null,
                Map.of("/hasSelfEmploymentIncome", Map.of("value", true, "status", "confirmed")),
                null,
                null,
                null,
                null);
        assertThat(confirmed.questions())
                .extracting(TaxKnowledgeService.PlannedQuestion::questionId)
                .contains(
                        "se_platform_fees",
                        "se_supplies_and_other_expenses",
                        "se_prior_year_total_tax",
                        "uses_vehicle_for_business");

        // Denying gig income while a 1099-K is present raises a review conflict.
        var denied = tools.planQuestions(
                null,
                2025,
                null,
                Map.of("/hasSelfEmploymentIncome", Map.of("value", false, "status", "confirmed")),
                List.<Object>of(Map.of("document_type", "form_1099_k")),
                null,
                null,
                null);
        assertThat(denied.conflicts())
                .extracting(TaxKnowledgeService.ReviewConflict::conflictId)
                .contains("no_self_employment_but_1099_k_present");
    }

    private String setFactSessionWithSelfEmploymentAnswer(boolean hasSelfEmployment) {
        String sessionId = graph.createSession(2025);
        tools.setFact(
                sessionId, "/hasSelfEmploymentIncome", "boolean", null, Boolean.toString(hasSelfEmployment), null);
        return sessionId;
    }
}
