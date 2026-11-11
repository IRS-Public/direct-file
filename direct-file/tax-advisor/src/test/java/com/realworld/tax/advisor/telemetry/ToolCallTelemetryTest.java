package com.realworld.tax.advisor.telemetry;

import com.realworld.tax.advisor.mcp.PlanningTools;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proves the tool-call telemetry aspect actually intercepts MCP tool calls (the AOP proxy is wired),
 * records the right {tool, outcome} signal — including the misuse outcomes the transcript findings cared
 * about (needs_facts, error) — and leaks no value-bearing tags (the privacy guard).
 */
@SpringBootTest
class ToolCallTelemetryTest {

    @Autowired
    PlanningTools tools;

    @Autowired
    MeterRegistry meters;

    private double calls(String tool, String outcome) {
        Counter c = meters.find("taxadvisor.tool.calls")
                .tag("tool", tool)
                .tag("outcome", outcome)
                .counter();
        return c == null ? 0.0 : c.count();
    }

    private double errors(String tool, String errorClass) {
        Counter c = meters.find("taxadvisor.tool.errors")
                .tag("tool", tool)
                .tag("errorClass", errorClass)
                .counter();
        return c == null ? 0.0 : c.count();
    }

    @Test
    void recordsOkNeedsFactsAndErrorOutcomes() {
        // Baselines — the MeterRegistry is shared across the test context, so assert on deltas.
        double okBefore = calls("calculate_se_tax", "ok");
        double needsBefore = calls("estimate_quarterly_payment", "needs_facts");
        double errBefore = errors("get_fact", "IllegalArgumentException");

        String s = tools.createSession("2025", "single").sessionId();
        tools.calculateSeTax(s, "60000", null, null, null, null); // -> ok

        // Quarterly on a fresh session has no prior-year facts -> needs_facts (a real misuse signal).
        String fresh = tools.createSession("2025", "single").sessionId();
        assertThat(tools.estimateQuarterlyPayment(fresh, "2025-08-20").status()).isEqualTo("needs_facts");

        // Unknown session -> the tool throws; the aspect records outcome=error + the exception class.
        try {
            tools.getFact("no-such-session", "/seTax");
        } catch (RuntimeException ignored) {
            // expected
        }

        assertThat(calls("calculate_se_tax", "ok")).isGreaterThan(okBefore);
        assertThat(calls("estimate_quarterly_payment", "needs_facts")).isGreaterThan(needsBefore);
        assertThat(errors("get_fact", "IllegalArgumentException")).isGreaterThan(errBefore);
    }

    @Test
    void carriesNoValueBearingTags() {
        // Drive at least one call so the meter exists.
        tools.createSession("2025", "single");

        // Privacy guard: the only tags on the call counters are the static {tool, outcome} — never a
        // dollar amount, fact path, or session id. If a future change tags a meter with a value, this fails.
        for (Counter c : meters.find("taxadvisor.tool.calls").counters()) {
            assertThat(c.getId().getTags().stream().map(Tag::getKey)).containsOnly("tool", "outcome");
        }
    }
}
