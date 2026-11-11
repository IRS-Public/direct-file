package com.realworld.tax.advisor;

import com.realworld.tax.advisor.graph.PlanningGraphService;
import com.realworld.tax.advisor.mcp.PlanningTools;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Guards the set_fact write path against malformed persister type codes — the failure mode
 * behind the {@code upickle.core.Abort: invalid tag for tagged object} error an MCP client hit
 * by passing an invented typeCode (e.g. {@code us.gov.irs.df.plan.FilingStatusPersister}) instead
 * of {@code type="enum"}.
 */
@SpringBootTest
class FactWriteValidationTest {

    @Autowired
    PlanningGraphService graph;

    @Autowired
    PlanningTools tools;

    @Test
    void setFactRejectsAnInventedPersisterTypeCodeWithAnActionableMessage() {
        String sid = graph.createSession(2025);

        assertThatThrownBy(() -> tools.setFact(
                        sid,
                        "/planning/priorYearTotalTax",
                        null,
                        "us.gov.irs.df.plan.FilingStatusPersister",
                        "single",
                        null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("gov.irs.factgraph.persisters.")
                .hasMessageContaining("enum");

        // The rejected write never touched the graph, so the session is still usable.
        tools.setFact(sid, "/planning/priorYearTotalTax", "dollar", null, "3800", null);
        assertThat((Object) graph.readFact(sid, "/planning/priorYearTotalTax").value())
                .isNotNull();
    }

    @Test
    void aWriteThatFailsGraphAssemblyIsRolledBackAndDoesNotPoisonTheSession() {
        String sid = graph.createSession(2025);
        tools.setFact(sid, "/planning/priorYearTotalTax", "dollar", null, "3800", null);

        // A typeCode under the persisters package passes the set_fact guard but is not a real
        // persister, so the fact graph's upickle aborts when it assembles the session.
        assertThatThrownBy(() -> graph.writeFact(
                        sid, "/planning/priorYearAGI", "gov.irs.factgraph.persisters.FilingStatusPersister", "single"))
                .isInstanceOf(RuntimeException.class);

        // The earlier good fact still reads back — the bad write was rolled back rather than left
        // wedged in the session's fact map (which would break every later graph build).
        assertThat((Object) graph.readFact(sid, "/planning/priorYearTotalTax").value())
                .isNotNull();

        // And the session still accepts new well-formed writes.
        tools.setFact(sid, "/planning/priorYearAGI", "dollar", null, "58000", null);
        assertThat((Object) graph.readFact(sid, "/planning/priorYearAGI").value())
                .isNotNull();
    }
}
