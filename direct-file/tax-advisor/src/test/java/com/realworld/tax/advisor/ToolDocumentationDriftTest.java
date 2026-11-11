package com.realworld.tax.advisor;

import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import com.realworld.tax.advisor.mcp.PlanningTools;
import org.junit.jupiter.api.Test;
import org.springframework.ai.mcp.annotation.McpTool;
import org.springframework.ai.tool.annotation.Tool;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Mechanical knowledge-base freshness check: the README's tool inventory must list every MCP tool
 * the service actually exposes. Documentation drifts the instant a new {@code @Tool} ships without a
 * README entry (this exact gap happened twice while adding the Form 8959 and QBI tools), and a stale
 * tool list is worse than none for an agent reading the repo as its source of truth.
 *
 * <p>This promotes "keep the README tool list current" from a convention into a build gate. It reads
 * the in-module {@code README.md} (surefire runs with the module directory as the working dir) and
 * reflects over {@link PlanningTools} for {@code @Tool} names, so the source of truth for "what tools
 * exist" stays the code.
 */
class ToolDocumentationDriftTest {

    @Test
    void everyMcpToolIsListedInTheReadme() throws Exception {
        String readme = Files.readString(Path.of("README.md"));

        List<String> undocumented = new ArrayList<>();
        for (Method m : PlanningTools.class.getDeclaredMethods()) {
            // Tools register via either @Tool (MethodToolCallbackProvider) or @McpTool (annotation scanner).
            Tool tool = m.getAnnotation(Tool.class);
            McpTool mcpTool = m.getAnnotation(McpTool.class);
            String name;
            if (tool != null) {
                name = tool.name().isBlank() ? m.getName() : tool.name();
            } else if (mcpTool != null) {
                name = mcpTool.name().isBlank() ? m.getName() : mcpTool.name();
            } else {
                continue;
            }
            // Expect the wire name in backticks, matching the README's tool table format.
            if (!readme.contains("`" + name + "`")) {
                undocumented.add(name);
            }
        }

        assertThat(undocumented)
                .as(
                        "These @Tool methods on PlanningTools are missing from tax-advisor/README.md's"
                                + " tool inventory: %s. Add a row to the '## Tools' table (wire name in"
                                + " backticks) so the repo's tool list stays in sync with the code.",
                        undocumented)
                .isEmpty();
    }
}
