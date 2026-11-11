package gov.irs.directfile.models;

import java.util.List;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Architectural constraint, enforced mechanically rather than only documented.
 *
 * <p>data-models is a plain shared library and must stay <em>un-opinionated</em> about the
 * web/application type of the services that consume it. If it pulls a servlet web stack
 * ({@code spring-boot-starter-web} / {@code -webmvc}) or a reactive one ({@code -webflux}), it drags
 * {@code DispatcherServlet} / {@code DispatcherHandler} / an embedded servlet container onto every
 * consumer's classpath. That forces Spring Boot's web-application-type detection and silently breaks
 * reactive apps — tax-advisor (WebFlux + Streamable HTTP MCP) hit exactly this and booted on
 * Tomcat with a dead {@code /mcp} router until the leaked starter was removed.
 *
 * <p>The lightweight {@code org.springframework:spring-web} jar that data-models legitimately depends
 * on for {@code HttpStatus} is fine: it carries none of the markers below. This test is the
 * machine-readable form of the "libraries stay un-opinionated about app type" invariant in CLAUDE.md —
 * a regression that re-adds a web starter fails the build here with an actionable message instead of
 * surfacing later as a confusing runtime fault in a downstream service.
 */
class WebStackFreeConstraintTest {

    /** Classes that only exist when a full web-application stack is on the classpath. */
    private static final List<String> WEB_APPLICATION_MARKERS = List.of(
            "org.springframework.web.servlet.DispatcherServlet", // spring-webmvc (servlet web stack)
            "org.springframework.web.reactive.DispatcherHandler", // spring-webflux (reactive web stack)
            "org.apache.catalina.startup.Tomcat"); // embedded Tomcat container

    @Test
    void dataModelsDoesNotPullAWebApplicationStack() {
        for (String marker : WEB_APPLICATION_MARKERS) {
            assertThat(isOnClasspath(marker))
                    .as(
                            "data-models must not depend on a web stack, but %s is on its classpath. A"
                                    + " spring-boot-starter-web/-webmvc/-webflux dependency has leaked in — remove it"
                                    + " (use the lightweight org.springframework:spring-web if you only need HTTP"
                                    + " types). See CLAUDE.md: libraries stay un-opinionated about app type.",
                            marker)
                    .isFalse();
        }
    }

    private static boolean isOnClasspath(String className) {
        try {
            Class.forName(className, false, WebStackFreeConstraintTest.class.getClassLoader());
            return true;
        } catch (ClassNotFoundException e) {
            return false;
        }
    }
}
