# Direct File — architecture & end-to-end design

> Supplements the repo-root `CLAUDE.md`. Read that first for the non-negotiable invariants.

## 1. The big picture

Direct File lets a taxpayer prepare and e-file a federal return for free. The system splits
into a **React/Vite client**, a set of **Spring Boot services**, and a shared **Scala fact
graph** that encodes the actual tax rules. Services are decoupled and communicate
asynchronously over **AWS SQS/SNS** (emulated locally by LocalStack); each owns its own
PostgreSQL schema. Submission to the IRS goes through the **MeF** (Modernized e-File) system.

```
            ┌─────────────┐      HTTPS      ┌──────────────────────┐
 taxpayer ─▶│  df-client  │ ──────────────▶ │  backend (directfile │
            │ (React/Vite)│                 │  -api)  :8080        │
            └─────────────┘                 └──────────┬───────────┘
                                                       │ fact graph + Postgres
                          SQS/SNS (LocalStack)         │
            ┌──────────────────────────────────────────┼───────────────────────┐
            ▼                     ▼                     ▼                        ▼
      ┌──────────┐         ┌──────────┐          ┌──────────────┐        ┌──────────────┐
      │  submit  │ ─MeF──▶ │   MeF    │ ──ack──▶ │    status    │        │ email-service│
      │  :8083   │         │ (IRS)    │          │    :8082     │        │              │
      └──────────┘         └──────────┘          └──────────────┘        └──────────────┘

      ┌──────────────┐   exported facts (JWT)   ┌──────────────────────────────┐
      │  state-api   │ ◀──────────────────────▶ │ state tax agencies / partners │
      └──────────────┘                          └──────────────────────────────┘

      ┌──────────────────────────────────────────────────────────────────────┐
      │ tax-advisor :8090 — conversational tax-PLANNING MCP server (new).  │
      │ Reuses the fact graph; not part of the filing critical path.          │
      └──────────────────────────────────────────────────────────────────────┘
```

## 2. Monorepo layout (`direct-file/`)

| Path | What it is |
|------|-----------|
| `boms/irs-spring-boot-starter-parent/` | The shared parent POM: platform baseline, managed dependency versions, build plugins (Spotless/PMD/SpotBugs/JaCoCo). Every service inherits it. |
| `libs/data-models/` | Shared DTOs, records, enums, and the **versioned SQS/SNS message envelopes**. Must stay un-opinionated (no web stack — see CLAUDE.md invariant 1). |
| `libs/loaders/` | Fact-dictionary XML loading + digest types + `FactGraphLoader`/`XmlProcessor`. Extracted from backend so other services can build the graph without the backend fat jar. |
| `libs/starters/` | First-party `irs-spring-boot-starter-*` (boilerplate, validation, test, openfeature). |
| `backend/` (`directfile-api`) | The main filing API. Owns user/tax-return data (Postgres + Liquibase), drives the fact graph, generates PDFs, publishes submission requests. |
| `submit/` | Bundles accepted returns and transmits to IRS **MeF**. Depends on proprietary MeF SDK jars (not in this repo). |
| `status/` | Consumes MeF acknowledgements, tracks submission/acknowledgement state, publishes status changes. Also MeF-SDK-dependent. |
| `state-api/` | Serves exported tax facts to state agencies; JWT-authenticated; Postgres + Redis. |
| `email-service/` | Sends transactional email; consumes email messages off the queue; own Postgres. |
| `tax-advisor/` | **Tax-planning MCP server** (deep dive below). |
| `df-client/` | React + Vite + TypeScript taxpayer UI. |
| `tax-knowledge/` | YAML knowledge artifacts (topics, evidence maps, conflict rules, citations, year-indexed tax parameters) consumed by tax-advisor. |
| `config/`, `docker/`, `monitoring/`, `scripts/` | Shared config, Docker assets, Prometheus/Grafana/OTel, helper scripts. |

The fact graph engine itself (`gov.irs:factgraph_3`, Scala 3) is a **separate repo** published
to local `~/.m2` via its own `make publish`. Treat it as an external dependency here.

## 3. The fact graph (central concept)

Everything tax-related is modeled as **facts** in a graph defined by **fact-dictionary XML**.
Facts have types backed by **persister wrappers** in `gov.irs.factgraph.persisters.*`
(`DollarWrapper`, `IntWrapper`, `RationalWrapper`, `BooleanWrapper`, `EnumWrapper`,
`DayWrapper`, `StringWrapper`, `Ein/TinWrapper`, …). Derived facts are computed from writable
facts via declarative rules in the XML.

Operational notes that bite:
- Serialization is **Scala uPickle**. A fact persisted with an unknown `$type` tag causes a
  hard `upickle.core.Abort: invalid tag for tagged object` deep in the engine. Validate
  type codes **before** they reach the graph (tax-advisor does this in `set_fact`).
- The engine is partly **lazy** — a bad value may not blow up until `save()`/`get()`, not at
  graph construction. Wrap mutations so failures roll back (see `PlanningGraphService.writeFact`).
- Numbers come back as engine types (e.g. a `Rational` renders `"n/d"`); coerce explicitly
  when a plain `BigDecimal` is needed.

## 4. tax-advisor (deep dive — the actively developed service)

Purpose: a **conversational tax-planning** backend for self-employed/gig filers. It extends
the production fact dictionary with planning facts (`tax-plan/*.xml`) and exposes **MCP tools**
that an LLM gateway calls to drive an interview → estimate flow. It is **not** in the filing
critical path and keeps no durable taxpayer data — planning sessions live in memory only.

Key types:
- `TaxAdvisorApplication` — Spring Boot entry point.
- `graph/PlanningGraphService` — loads the combined dictionary (production `tax/*.xml` +
  planning `tax-plan/*.xml`) once at startup; hands out per-session in-memory `Graph`s; owns
  `writeFact`/`readFact`. Each session = a `UUID` + a `LinkedHashMap<path, FactTypeWithItem>`,
  rebuilt into a `Graph(dictionary, InMemoryPersister.apply(json))` on demand under a session lock.
- `knowledge/TaxKnowledgeService` — loads the `tax-knowledge/` YAML (questions, evidence maps,
  conflict rules, citations, year-indexed parameters). Uses its **own** Jackson 2 YAML mapper.
- `mcp/PlanningTools` — the `@McpTool`-annotated methods exposed over MCP: `create_session`
  (takes a `filing_status`: single/mfj/mfs, driving filing-status thresholds), `get_fact`,
  `set_fact`, `explain`, `cite`, `calculate_se_tax`, `calculate_additional_medicare` (Form 8959
  0.9% surtax), `estimate_qbi_deduction` (Form 8995 / §199A 20% deduction, simple method),
  `project_net_profit`, `project_total_tax` (the full net-profit → AGI → taxable income → income tax
  + SE + Additional Medicare ladder; total tax is **derived**, not an agent guess — see decisions.md),
  `compare_filing_statuses` (re-runs the session's income under single/MFJ/MFS so "does my filing
  status matter?" is computed, not estimated; filing status is fixed at `create_session`),
  `estimate_quarterly_payment`, `plan_questions`, `export_plan`. Each returns
  a typed record and (except `plan_questions`) publishes an MCP `outputSchema` + matching
  `structuredContent` via `generateOutputSchema = true`; the Spring AI annotation scanner registers
  them (no `MethodToolCallbackProvider`). Filing-status-dependent constants are status-scoped
  `*-tax-parameters.yaml` rows (a `filing_status` field) injected only for the session's status.
- `config/JacksonConfig` — the explicit Jackson 2 `ObjectMapper` bean (CLAUDE.md invariant 3).
- `config/TaxAdvisorProperties` — `tax-advisor.*` config (tax-knowledge root, fact XML patterns).

Transports (two profiles, same tools):
- **default** — reactive WebFlux/Netty, **Streamable HTTP** at `POST/GET /mcp` (spec 2025-03-26+),
  session via `Mcp-Session-Id`. Network-accessible; `/actuator/health` for probes.
- **stdio** (`--spring.profiles.active=stdio`) — no HTTP listener; JSON-RPC over stdin/stdout for
  desktop MCP hosts (Claude Desktop, Cursor). stdout must stay clean (CLAUDE.md invariant 4).

Why Jackson 2 here specifically: `set_fact` does `objectMapper.valueToTree(rawValue)` to build a
`FactTypeWithItem(typeCode, JsonNode)`, and `data-models`' `FactTypeWithItem.item` is a Jackson 2
`com.fasterxml.jackson.databind.JsonNode`. Migrating this service to Jackson 3 would break that
interop unless the shared record changes too — out of scope, hence the explicit Jackson 2 bean.

## 5. Inter-service messaging

`libs/data-models` defines **versioned message envelopes** (`message/dispatch`, `message/status`,
`message/confirmation`, `message/email`, `message/pending`, …). The pattern is a versioned wrapper
so producers/consumers can evolve payloads independently. Services publish/consume these over
SQS/SNS. The rough filing flow: backend publishes a submission → `submit` transmits to MeF →
`status` ingests MeF acknowledgements and publishes status changes → backend updates the return;
`email-service` consumes email messages to notify the taxpayer. (LocalStack provides SQS/SNS/KMS
locally.)

## 6. Cross-cutting

- **Persistence:** Postgres per service, schema-migrated with **Liquibase**. `state-api` and
  `backend` also use **Redis**.
- **Security/crypto:** AWS KMS + the AWS Encryption SDK; `data-models` carries an
  `EncryptionAutoConfiguration` (needs a local wrapping key env var for some tests).
- **Observability:** Actuator endpoints, OpenTelemetry collector, Prometheus + Grafana.
- **Feature flags:** OpenFeature (`irs-spring-boot-starter-openfeature`).
