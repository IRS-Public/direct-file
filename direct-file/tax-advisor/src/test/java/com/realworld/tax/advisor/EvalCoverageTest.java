package com.realworld.tax.advisor;

import java.util.LinkedHashSet;
import java.util.Set;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Coverage gate for the golden-scenario eval suite — the in-repo stand-in for the article's
 * "track the score over time": it cannot enforce an external trend line, but it can keep coverage from
 * silently SHRINKING. If a future change drops a calc tool from the scenarios (or thins the suite), this
 * fails, so a regression in eval breadth is caught at build time rather than discovered in production.
 *
 * <p>Pure file scan — no Spring context needed.
 */
class EvalCoverageTest {

    private static final Set<String> REQUIRED_TOOL_COVERAGE =
            Set.of("calculate_se_tax", "estimate_qbi_deduction", "calculate_additional_medicare", "project_total_tax");

    @Test
    void everyCoreCalculationToolIsExercisedByAtLeastOneScenario() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        Set<String> toolsExercised = new LinkedHashSet<>();
        int scenarios = 0;

        for (Resource fixture : new PathMatchingResourcePatternResolver().getResources("classpath*:/evals/*.json")) {
            JsonNode scenario = mapper.readTree(fixture.getInputStream());
            scenarios++;
            for (JsonNode step : scenario.get("steps")) {
                toolsExercised.add(step.get("tool").asText());
            }
        }

        assertThat(scenarios)
                .as("golden-scenario eval count should not shrink below the established floor")
                .isGreaterThanOrEqualTo(8);
        assertThat(toolsExercised)
                .as("every core calculation tool must be covered by a golden scenario (coverage must not shrink)")
                .containsAll(REQUIRED_TOOL_COVERAGE);
    }
}
