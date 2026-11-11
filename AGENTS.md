# AGENTS.md — Direct File

Cross-tool entry point for coding agents (Codex, Cursor, and others that read `AGENTS.md`).
This is a **map, not a manual**: it points to the sources of truth rather than restating them.
Claude Code reads `CLAUDE.md`, which carries the same guidance in fuller form — the two are kept
in sync deliberately. Start here, then follow the pointers.

IRS Direct File: a multi-module monorepo for free, guided federal tax filing. Authoritative tax
logic lives in a **fact graph** (a Scala 3 rules engine); Java Spring Boot services load it and
expose filing, submission, status, email, state-integration, and conversational tax-**planning**
(tax-advisor) capabilities. A React/Vite client (`df-client/`) is the taxpayer UI. The Maven
code lives one directory down, under `direct-file/`.

## Sources of truth (read before non-trivial work)

- **[CLAUDE.md](CLAUDE.md)** — platform baseline, the architecture invariants (below), build/test
  workflow, conventions, and the Spring Boot 4 migration cheat-sheet. The fullest guidance.
- **[.claude/docs/architecture.md](.claude/docs/architecture.md)** — end-to-end design: service
  topology, the fact graph, the tax-advisor deep dive, inter-service messaging.
- **[.claude/docs/operations.md](.claude/docs/operations.md)** — toolchain, build order, running
  services and MCP transports, profiles/ports, Docker, buildability caveats.
- **Per-service `README.md`** (e.g. [direct-file/tax-advisor/README.md](direct-file/tax-advisor/README.md))
  — the local source of truth for that service, including its MCP tool inventory.
- **[.claude/docs/decisions.md](.claude/docs/decisions.md)** — why non-obvious choices were made
  (the rationale that would otherwise be lost in chat threads).
- **[.claude/docs/tech-debt.md](.claude/docs/tech-debt.md)** — known gaps, limitations, and
  follow-ups, versioned in-repo so they're visible to every agent.

## Non-negotiable invariants (the short list; details in CLAUDE.md)

Several of these are enforced **mechanically** (structural tests) so a regression fails the build,
not a review. When in doubt, prefer enforcing a rule in code over restating it in prose.

1. **Libraries stay un-opinionated about app type.** `libs/*` must not depend on a web stack
   (`spring-boot-starter-web` / `-webmvc` / `-webflux`). Enforced by
   `WebStackFreeConstraintTest` in `libs/data-models`.
2. **tax-advisor is reactive WebFlux serving MCP over Streamable HTTP** (`/mcp`, Netty) — never
   reintroduce the servlet stack or the old HTTP+SSE two-endpoint transport.
3. **tax-advisor speaks Jackson 2 via an explicit bean** (`config/JacksonConfig`); Boot 4
   defaults JSON to Jackson 3.
4. **stdio MCP transport needs clean stdout** — `jcl-over-slf4j` substitutes for the real
   commons-logging so its output doesn't corrupt the JSON-RPC stream.
5. **The fact graph is the source of truth** — never invent tax law or persister types; validate
   inputs before they reach the engine; keep tool errors actionable.

## Build & test (essentials; full detail in operations.md)

- After editing the shared parent POM, reinstall it before building a service:
  `mvn -N install` in `direct-file/boms/irs-spring-boot-starter-parent`.
- Per-service: `mvn clean install` inside the service dir. Static analysis (SpotBugs, PMD,
  Spotless) gates the build; use `mvn spotless:apply` to auto-format rather than hand-fixing.
- The parent POM is **shared by every service** — a change there ripples to all; validate widely.

## Known constraints

- `submit/` and `status/` depend on proprietary MeF SDK jars not in this repo and cannot be fully
  built here — their compile failures are not regressions you introduced.
