# Direct File — Claude coding-agent instructions

IRS Direct File: a multi-module monorepo for free, guided federal tax filing. The
authoritative tax logic lives in a **fact graph** (a Scala 3 rules engine); the Java
Spring Boot services load that graph and expose filing, submission, status, email,
state-integration, and (new) conversational tax-**planning** capabilities. A React/Vite
client (`df-client/`) is the taxpayer UI.

The Maven code lives one directory down, under `direct-file/`. Paths below are written
relative to the repo root (e.g. `direct-file/tax-advisor/...`).

Supplemental detail (read these before non-trivial work):
- @.claude/docs/architecture.md — end-to-end design, service topology, the fact graph, the planning service, shared libs.
- @.claude/docs/operations.md — toolchain, build order, running services, profiles/ports, Docker, MCP transports.
- @.claude/docs/decisions.md — why non-obvious engineering choices were made (decision log).
- @.claude/docs/tech-debt.md — known gaps, limitations, and follow-ups.
- @.claude/docs/findings.md — production signal → finding → eval → fix ledger (the self-improvement loop).

---

## Platform baseline

- **Spring Boot 4.1.x / Spring Framework 7** (Jakarta EE 11), **Java 25** language level,
  built on **JDK 26**. All Java services inherit one shared parent POM:
  `direct-file/boms/irs-spring-boot-starter-parent/pom.xml`.
- The parent POM is **shared by every service** (backend, state-api, submit, status,
  email-service, tax-advisor). A dependency/version change there ripples to all of
  them — when you touch it, you must consider every consumer, not just the one you care
  about. Validate as widely as you can build (see operations.md).
- Dependency versions are centralized in the parent POM `<properties>` + `dependencyManagement`.
  Do not pin versions in a child POM unless the dependency is genuinely service-local.

## Architecture invariants — do not regress these

These were established deliberately (often the hard way). Preserve them; if you believe one
must change, call it out explicitly rather than quietly undoing it.

1. **Libraries stay un-opinionated about web/app type.** `libs/data-models` (and any lib)
   must **not** depend on `spring-boot-starter-web` / `-webmvc` / `-webflux`. Pulling a
   servlet starter drags `DispatcherServlet` onto every consumer's classpath and forces
   Spring Boot into SERVLET mode — which silently breaks reactive apps. data-models uses
   the lightweight `org.springframework:spring-web` (for `HttpStatus`) + explicit
   `jackson-databind`, nothing more. Keep it that way.

2. **tax-advisor is a reactive WebFlux app serving MCP over Streamable HTTP.**
   - Web stack: `spring-boot-starter-webflux` + `spring-ai-starter-mcp-server-webflux`
     (Netty, **not** Tomcat). If you see it boot on Tomcat, a servlet starter leaked onto
     the classpath (usually via a transitive dep) — fix the dep, don't force the type.
   - Transport: `spring.ai.mcp.server.protocol: STREAMABLE`, single endpoint `/mcp`
     (POST + GET SSE, session via the `Mcp-Session-Id` header). Do not reintroduce the old
     two-endpoint HTTP+SSE (`/mcp/sse` + `/mcp/message`).
   - Streamable HTTP needs **spring-ai ≥ 2.0.0-M8** (the Boot 4-aligned line). 1.0.0 lacks it.

3. **tax-advisor speaks Jackson 2, by an explicit bean.** Spring Boot 4 defaults JSON to
   **Jackson 3** (`tools.jackson...`), and no longer auto-configures a Jackson 2
   `com.fasterxml.jackson.databind.ObjectMapper`. The planning service must stay Jackson 2
   because the shared `data-models` `FactTypeWithItem` carries a Jackson 2 `JsonNode`, and
   `PlanningGraphService` produces those via `valueToTree(...)`. `config/JacksonConfig.java`
   re-declares the Jackson 2 `ObjectMapper` bean — keep it.

4. **stdio MCP transport requires clean stdout.** In the `stdio` profile, stdout carries
   only JSON-RPC frames. The real Apache `commons-logging` (pulled by Spring Framework 7
   now that `spring-jcl` is gone) does its own stdout discovery, so it is excluded from the
   fat jar and the API is supplied by `jcl-over-slf4j` (routes through SLF4J/Logback, which
   the stdio profile sends to a file). Don't remove that substitution.

5. **The fact graph is the source of truth; never invent tax law or persister types.**
   Fact values are written through the engine's persister wrappers under
   `gov.irs.factgraph.persisters.*` (e.g. `DollarWrapper`, `IntWrapper`, `EnumWrapper`).
   `set_fact` rejects any `typeCode` outside that package (an invalid tag makes the Scala
   uPickle layer hard-abort). Writes are atomic — a malformed write rolls back so it can't
   poison a session. Keep both guards.

## Build & test workflow

Full detail in operations.md; the essentials:

- **Build order matters.** The parent POM and several first-party artifacts are resolved
  from the local `~/.m2`. After editing the parent POM, reinstall it before building a
  service: `mvn -N install` in `direct-file/boms/irs-spring-boot-starter-parent`.
  First-party deps that must be installed locally: `factgraph_3` (standalone repo),
  `loaders`, `data-models`, the `irs-spring-boot-starter-*` artifacts.
- **Per-service build:** `mvn clean install` (or `package`) inside the service dir.
- **Static analysis is part of the build** and gates `compile`/`package`: SpotBugs +
  findsecbugs, PMD, and **Spotless** (Palantir Java format, sorted POMs, import order). To
  iterate fast you can skip them with `-Dspotbugs.skip=true -Dpmd.skip=true
  -Dspotless.check.skip=true`, but the final build must pass them. Use `spotless:apply` to
  auto-format rather than hand-fixing.
- **Always finish with the real build** (tests + analysis) before declaring done. For
  tax-advisor also smoke-boot the jar and hit `/actuator/health` and the `/mcp`
  handshake — context-loading tests don't exercise the HTTP transport.

## Conventions

- Match the surrounding code's style, naming, and **comment density**. This codebase favors
  explanatory comments that capture *why* (especially around the Boot 4 / fact-graph
  gotchas) — keep that, don't strip it.
- Java is formatted by Spotless/Palantir; import order is `java, , gov.irs, gov.irs.factgraph,
  gov.irs.directfile, #` (static last). Don't fight the formatter.
- Prefer adding a managed version in the parent POM over an inline version in a child.
- When a change is forced by a framework/library behavior, leave a short comment citing the
  reason (that's the existing norm and it's how these invariants stay discoverable).

## Spring Boot 4 migration cheat-sheet

Recurring breakages when touching these services (full mapping in architecture.md):
- **Jackson 3 is the default**; Jackson 2 beans are no longer auto-configured (see invariant 3).
- **Test slices moved into per-tech modules.** `@DataJpaTest`→`spring-boot-data-jpa-test`,
  `@WebMvcTest`/`@AutoConfigureMockMvc`→`spring-boot-webmvc-test`, `TestEntityManager`→
  `o.s.b.jpa.test.autoconfigure`, `@AutoConfigureTestDatabase`→`o.s.b.jdbc.test.autoconfigure`,
  `SecurityAutoConfiguration`→`o.s.b.security.autoconfigure` (no `.servlet`).
- **Starter renames:** `-web`→`-webmvc`, `-web-services`→`-webservices`, `-aop`→`-aspectj`,
  oauth2 starters → `-security-oauth2-*`.
- **Dependency management dropped** for `spring-retry` (Framework 7 provides retry) and
  **Testcontainers** (the parent now imports `testcontainers-bom`).
- **`spring-jcl` removed**; `commons-logging` comes in for real now (see invariant 4).
- `@MockBean`/`@SpyBean` → `@MockitoBean`/`@MockitoSpyBean` (none currently in the repo).

## Known constraints

- `submit/` and `status/` depend on **proprietary MeF SDK jars** (`gov.irs.mef.*`,
  `gov.irs.a2a.mef.*`) not present in this repo — they cannot be fully built here. Don't
  treat their compile failures as regressions you introduced.
- `spring-ai 2.0.0-M8` is a **milestone** (pre-GA). It works on Boot 4.1; if stability is
  required, `spring-ai 1.1.x` GA also has Streamable HTTP but targets the Boot 3 line.
