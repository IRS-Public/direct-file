package com.realworld.tax.advisor.telemetry;

import java.lang.reflect.RecordComponent;
import java.time.Duration;

import io.micrometer.core.instrument.MeterRegistry;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.mcp.annotation.McpTool;
import org.springframework.stereotype.Component;

/**
 * Privacy-preserving telemetry for MCP tool calls — the "production creates evidence" pillar of the
 * self-improvement loop (see {@code .claude/docs/findings.md}), adapted to this service's hard
 * constraint that it persists <b>no taxpayer data</b>.
 *
 * <p>A single {@code @Around} advice wraps every {@code @McpTool} method and records only three
 * things: the <b>tool name</b> (static), the <b>outcome</b> ({@code ok} / {@code needs_facts} /
 * {@code error}), and, on failure, the <b>exception class name</b>. It deliberately never touches the
 * method arguments or the result's field values — so dollar amounts, fact paths, session contents, and
 * even exception <i>messages</i> (which can carry a session id or path) never reach a meter or a log
 * line. What it does capture is exactly the signal the recent chat-transcript findings needed:
 * <i>how the client LLM uses the tools and where it misfires</i> — e.g. how often
 * {@code estimate_quarterly_payment} is called before income is set ({@code needs_facts}), or how often
 * a write fails validation ({@code error}).
 *
 * <p>Surfaced as Micrometer counters ({@code taxadvisor.tool.calls{tool,outcome}},
 * {@code taxadvisor.tool.errors{tool,errorClass}}) and a timer, visible at
 * {@code /actuator/metrics}; plus one structured INFO log line per call. In the {@code stdio} profile
 * logging is file-only, so stdout stays JSON-RPC-clean (CLAUDE.md invariant 4).
 */
@Aspect
@Component
public class ToolCallTelemetry {

    private static final Logger log = LoggerFactory.getLogger(ToolCallTelemetry.class);

    private final MeterRegistry meters;

    public ToolCallTelemetry(MeterRegistry meters) {
        this.meters = meters;
    }

    @Around("@annotation(mcpTool)")
    public Object recordToolCall(ProceedingJoinPoint pjp, McpTool mcpTool) throws Throwable {
        String tool = mcpTool.name().isBlank() ? pjp.getSignature().getName() : mcpTool.name();
        long startNanos = System.nanoTime();
        String outcome = "ok";
        String errorClass = "";
        try {
            Object result = pjp.proceed();
            outcome = outcomeOf(result);
            return result;
        } catch (Throwable ex) {
            outcome = "error";
            // Class name only — never the message, which can carry a session id or fact path.
            errorClass = ex.getClass().getSimpleName();
            throw ex;
        } finally {
            meters.counter("taxadvisor.tool.calls", "tool", tool, "outcome", outcome)
                    .increment();
            if (!errorClass.isEmpty()) {
                meters.counter("taxadvisor.tool.errors", "tool", tool, "errorClass", errorClass)
                        .increment();
            }
            meters.timer("taxadvisor.tool.latency", "tool", tool)
                    .record(Duration.ofNanos(System.nanoTime() - startNanos));
            // PII-free structured event: tool + outcome (+ errorClass). No args, no field values.
            if (errorClass.isEmpty()) {
                log.info("tool_call tool={} outcome={}", tool, outcome);
            } else {
                log.info("tool_call tool={} outcome={} errorClass={}", tool, outcome, errorClass);
            }
        }
    }

    /**
     * Derive the outcome from a result record's {@code status} component when it has one
     * ({@code "ok"} / {@code "needs_facts"}); everything else is {@code ok}. Reads only the status
     * string — never any other component — so no taxpayer value is inspected.
     */
    private static String outcomeOf(Object result) {
        if (result == null || !result.getClass().isRecord()) {
            return "ok";
        }
        for (RecordComponent c : result.getClass().getRecordComponents()) {
            if ("status".equals(c.getName()) && c.getType() == String.class) {
                try {
                    Object v = c.getAccessor().invoke(result);
                    if (v instanceof String s && !s.isBlank()) {
                        return s;
                    }
                } catch (ReflectiveOperationException ignored) {
                    // fall through to default
                }
            }
        }
        return "ok";
    }
}
