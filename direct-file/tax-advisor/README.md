# tax-advisor

A tax-planning agent backend that extends the Direct File Fact Graph with
self-employment, Schedule SE, and quarterly-estimate facts, and exposes them
through a [Spring AI](https://docs.spring.io/spring-ai/reference/) MCP
(Model Context Protocol) server so an authorized LLM gateway can drive a
conversational tax-planning experience.

## What's here

```
src/main/java/com/realworld/tax/advisor/
  TaxAdvisorApplication.java               # Spring Boot main
  config/TaxAdvisorProperties.java         # @ConfigurationProperties
  config/McpServerConfig.java               # registers @Tool methods with Spring AI's MCP server
  graph/PlanningGraphService.java           # loads combined dictionary, manages sessions
  knowledge/TaxKnowledgeService.java        # loads tax-knowledge artifacts, evaluates planning gates
  mcp/PlanningTools.java                    # @Tool-annotated methods exposed via MCP

src/main/resources/
  application.yaml                          # Streamable HTTP transport (default profile)
  application-stdio.yaml                    # STDIO transport (profile=stdio)
  tax-plan/selfEmployment.xml               # planning fact module

src/test/java/.../QuarterlyEstimateIntegrationTest.java
src/test/java/.../TaxKnowledgePlanningIntegrationTest.java
```

The MCP plumbing — JSON-RPC framing, capabilities negotiation, tool discovery,
JSON Schema generation from method signatures, Streamable HTTP / STDIO transports —
is provided by `spring-ai-starter-mcp-server-webflux` (reactive Streamable HTTP,
which transitively carries the core mcp-server + STDIO support). Tools are plain
`@Tool`-annotated Java methods on the `PlanningTools` Spring bean.

The planning fact module declaratively encodes:

- TY2024 constants: 12.4% SS, 2.9% Medicare, 92.35% wage multiplier, $168,600
  SS wage base, $0.67/mi standard mileage, $400 SE-tax threshold.
- Schedule C: gross receipts, vehicle deduction (standard mileage method),
  platform fees, supplies, net profit clipped at zero.
- Schedule SE: net earnings (× 92.35%), SS portion (capped against the wage
  base remaining after W-2 wages), Medicare portion, total SE tax,
  deductible half-of-SE adjustment.
- Estimated tax safe harbor per IRC §6654: lesser of (100%/110% prior-year
  tax) or (90% projected current-year tax); next quarterly payment derived
  from remaining balance / remaining quarters.

The agent never computes tax math — all derivations live in
`selfEmployment.xml`. Tools read/write facts and explain dependencies.

The `plan_questions` tool is the first bridge from authored tax-knowledge
artifacts into runtime planning. It loads YAML artifacts from `../tax-knowledge`
by default, or from `DF_TAX_KNOWLEDGE_ROOT` if set. The tool evaluates:

- prior session facts and explicit answer facts
- document evidence, such as `form_w2` or `form_1099_nec`
- profile signals, such as prior-year topics
- question `asks_when` / `skip_when` gates
- conflict rules that require review before continuing

It returns candidate facts that require taxpayer confirmation, review conflicts,
and the next applicable questions. It does not write facts into a return.

## Tools

Spring AI exposes the following tools at the MCP `tools/list` endpoint. Names
match the wire format; argument shapes correspond to the Java parameter names
on `PlanningTools` (camelCase, not snake_case).

| Tool                          | Purpose                                                |
| ----------------------------- | ------------------------------------------------------ |
| `create_session`              | Allocate a new in-memory planning session (year + filing status) |
| `get_fact`                    | Read a fact from a session's graph                     |
| `set_fact`                    | Write a value to a writable fact                       |
| `calculate_se_tax`            | Schedule C/SE tax from full-year figures               |
| `calculate_additional_medicare` | Form 8959 0.9% Additional Medicare Tax (wage + SE portions) |
| `estimate_qbi_deduction`      | Form 8995 / §199A 20% QBI deduction (taxable-income cap derived) |
| `project_net_profit`          | Project full-year net profit + SE tax from YTD figures |
| `project_total_tax`           | Full net-profit → AGI → taxable income → income tax + SE + Additional Medicare (total tax derived, not guessed) |
| `compare_filing_statuses`     | Project total tax under single / MFJ / MFS on the same income, in one call |
| `explain`                     | One-level derivation explanation for a fact            |
| `cite`                        | Legal authority behind a fact + plain-language explanation |
| `estimate_quarterly_payment`  | IRC §6654 safe-harbor quarterly recommendation         |
| `export_plan`                 | Sealed, printable summary the taxpayer keeps (nothing stored) |
| `plan_questions`              | Plan next interview questions from tax-knowledge YAML  |

### Structured output

Every tool is registered via the `@McpTool` annotation path with `generateOutputSchema = true`, so
the server publishes an MCP `outputSchema` for each and returns matching `structuredContent` (MCP
spec 2025-06-18+). Tools return typed records; their **output field names are camelCase** (the record
component names), e.g. `create_session` returns `{ sessionId, taxYear, filingStatus,
provisionalWarning }`. Clients that validate structured output should validate against the advertised
schema and **not** pin a closed (`additionalProperties: false`) schema of their own — tool outputs
evolve additively.

Two conventions keep the generated schema and content in agreement (and dodge spring-ai schema-gen
bugs): heterogeneous/sometimes-absent fact values are typed `Object` (permissive schema, so a number
or `null` both validate), and descriptive strings are always present (empty string when not
applicable, e.g. `provisionalWarning`, `note`, `aboveThresholdWarning`).

> Contract note: this superseded the earlier `Map`-shaped outputs that used snake_case keys
> (`filing_status`, `self_employment_tax`, …). Consumers must use the camelCase field names.

The one exception is **`plan_questions`** (`generateOutputSchema = false`): its result is an open,
evolving interview-planning structure whose nested records carry business-significant null fields, so
it is deliberately left without a strict schema (no schema means no validation to fail).

## Build prerequisites

This module depends on two things the open-source Direct File repo does not
publish to Maven Central:

1. **`gov.irs:factgraph_3`** — the Scala 3 engine, lives in the standalone
   fact-graph repo ([`../../../fact-graph/`](../../../fact-graph/)) and ships via sbt.
2. **`gov.irs.directfile:loaders`** — the shared XML loader extracted from
   the backend, lives in [`../libs/loaders/`](../libs/loaders/).

### One-time local setup

```bash
# 1. Install sbt + Scala (see ../../ONBOARDING.md). On macOS:
brew install sbt

# 2. Publish the fact graph to your local Maven repo:
cd ../../../fact-graph
sbt publishM2          # writes to ~/.m2/repository/gov/irs/factgraph_3/...

# 3. Install Direct File's BOMs and shared libs:
cd ../boms && ../backend/mvnw install -N
cd ../libs/data-models && ../../backend/mvnw install
cd ../loaders && ../../backend/mvnw install

# 4. Build the plan service:
cd ../tax-advisor && ../backend/mvnw test
```

## Running

### Streamable HTTP transport (default — network-accessible)

```bash
../backend/mvnw spring-boot:run
```

The service runs on reactive WebFlux/Netty, listens on port 8090, and publishes a
single MCP endpoint (Streamable HTTP, MCP spec 2025-03-26+):

- `POST /mcp` — JSON-RPC requests; the response is either a JSON body or, for
  streamed results, a `text/event-stream`
- `GET  /mcp` — opens the server→client SSE stream for an established session
  (session id carried in the `Mcp-Session-Id` header from `initialize`)

### STDIO transport (subprocess of a desktop MCP host)

```bash
../backend/mvnw spring-boot:run -Dspring-boot.run.profiles=stdio
```

With `stdio` active, the Spring Boot web server is disabled, stdout is
reserved for the JSON-RPC stream, and application logs go to
`~/.tax-advisor/tax-advisor.log`. Wire up in e.g. Claude Desktop's
config:

```json
{
  "mcpServers": {
    "tax-advisor": {
      "command": "java",
      "args": [
        "-jar",
        "/path/to/tax-advisor/target/tax-advisor-0.0.1-SNAPSHOT.jar",
        "--spring.profiles.active=stdio"
      ]
    }
  }
}
```

### Sanity-checking the HTTP endpoint

Streamable HTTP exchanges JSON-RPC over plain `POST /mcp`, so a raw `curl` can
drive the handshake. `initialize` returns an `Mcp-Session-Id` header that
subsequent requests must echo back:

```bash
# 1) initialize (note the Mcp-Session-Id response header)
curl -i -X POST http://localhost:8090/mcp \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"1"}}}'

# 2) reuse the session id for notifications/initialized, then tools/list, tools/call …
curl -X POST http://localhost:8090/mcp \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -H 'Mcp-Session-Id: <id-from-step-1>' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

# Or point the modelcontextprotocol/inspector (transport: streamable-http) at
#   http://localhost:8090/mcp
```

End-to-end smoke testing is covered by the integration tests
(`QuarterlyEstimateIntegrationTest`, `TaxKnowledgePlanningIntegrationTest`),
which invoke the same `@Tool` methods that the MCP server exposes.

Golden-scenario **evals** live in `src/test/resources/evals/*.json` and are run by
`PlanningAgentEvalTest`: each file is a full-run scenario (a filing situation + a sequence of
tool calls with expected output fields), driven through the real MCP tool surface as JSON — the
deterministic regression check for what an agent actually receives. Add a scenario by dropping a
new JSON file in that directory; no Java changes needed.

## Wiring to an LLM

This service is the *MCP server* side. An LLM gateway (Azure OpenAI Gov,
Bedrock GovCloud, on-prem model fronted by Spring AI's `ChatClient`, a
desktop client like Claude Desktop, etc.) acts as the MCP *client*. After
the standard MCP handshake it calls `tools/list`, then `tools/call` to
invoke `create_session` → `set_fact` → `estimate_quarterly_payment` in
response to user turns.

**Important boundaries** (see the architectural notes that produced this
scaffold):

- The model runs server-side behind an authorized egress allowlist.
- Even server-side, prefer passing fact *paths* rather than values where
  the model only needs to reason about completeness.
- This MVP keeps planning sessions in memory only — nothing is persisted
  that would qualify as FTI under §6103. Once a session writes facts into
  a filed return (out of scope here), full FedRAMP-High obligations attach.
- The durable record is **taxpayer-held, not server-held**. `export_plan`
  renders the session as a self-contained, SHA-256-sealed Markdown summary
  that the agent hands back to the taxpayer to save or print. The service
  retains nothing, so this avoids a server-side FTI audit store while still
  giving the taxpayer a reproducible, tamper-evident record. The hash is
  tamper-evidence (content unchanged), not a signature (who produced it).
  The report labels inputs **self-reported and unverified**: it traces the
  arithmetic from the figures given, it does not confirm them against a
  1099 or bank record — source-document verification is a separate concern
  delegated elsewhere, deliberately not built into this planner.
- **Citations are derived, not hand-mapped.** Each year-parameter carries a
  `source_id`; the citation registry (`tax-knowledge/sources/federal/citations.yaml`)
  resolves each id to a formal citation (e.g. `26 U.S.C. § 6654`), an official
  URL, and a friendly plain-language explanation. A computed result cites every
  statutory constant in its dependency closure, so `export_plan` (citations on by
  default) and the `cite` tool attribute figures to authorities straight from the
  computation graph — no per-fact citation table to maintain. Adding a new tax
  year's parameter with a new `source_id` requires a matching registry entry
  (enforced by `CitationRegistryTest`).
- **Provisional parameters are flagged, not trusted silently.** A parameter may be
  marked `provisional: true` (a value published as a draft pending the official
  IRS/SSA announcement — e.g. the 2026 mileage rate and wage base). Such a year is
  still usable, but every tool response carries a `provisional_warning` naming the
  unverified values, and the export shows a banner plus a `⚠ provisional` marker on
  those rows — so a draft constant is never presented as a final figure.

## Known limitations (MVP)

- Single-business Schedule C only. Multi-business (per-platform Schedule Cs)
  needs a `Collection` wrapper around the SE facts.
- No Additional Medicare 0.9% surtax (Form 8959).
- No QBI deduction (Section 199A).
- One-level `explain` only — recursive walker is a follow-up.
- `plan_questions` currently evaluates a small declarative condition subset:
  fact equality, evidence presence/attributes, and profile membership.
- TY2025 quarterly deadlines hardcoded inline in `PlanningTools`. Move to a
  year-keyed constant.
- No auth on the MCP endpoints. In production these must sit behind the
  same auth boundary as the rest of Direct File.
