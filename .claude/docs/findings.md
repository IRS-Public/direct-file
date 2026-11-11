# Findings ledger — production signal → finding → eval → fix

Append-only record of the **self-improvement loop** for tax-advisor, adapted from the OpenAI/Thrive
"self-improving tax agents" pattern (production use → structured findings → tailored evals → scoped,
human-reviewed fix). Newest last.

**Why this exists.** tax-advisor is a deterministic fact-graph calculator, not a learned extraction
agent, so we do **not** copy that loop wholesale (there is no field-extraction accuracy to climb, and we
persist no taxpayer data). What *does* transfer: our "practitioners" are the **client-app team and tax
SMEs**, our production signal is **how the client LLM uses the MCP tools** (and where it misuses them),
and every signal that recurs becomes a **regression eval** plus a scoped fix. The fix half of the loop is
a coding agent (Claude Code / Codex) working against those evals with the build gates as the success
condition — see `operations.md`.

**How to use.** When a signal arrives (a client-app report, a chat transcript, a tax-SME review, a
telemetry anomaly), add an entry. Group recurring signals under one finding. A finding is only actionable
once it has (a) a clear failure statement, (b) at least one eval that fails before the fix, and (c) a
bounded change. Ambiguous or judgment-laden cases (real tax-law questions) route to a human, not the loop
— we never invent tax law (CLAUDE.md invariant 5).

Entry template:

```
## FIND-NNN — <one-line title>
- **Signal:** where it came from (transcript, client report, SME, telemetry) + what was observed.
- **Finding:** the failure, stated precisely. What class is it? (tool-misuse / modeling gap / stale
  constant / schema / UX-affordance / genuinely-ambiguous→human)
- **Eval:** the test(s) that pin it (must fail before the fix).
- **Fix:** the change + commit.
- **Status:** open | shipped | routed-to-human.
```

---

## FIND-001 — create_session structuredContent did not match its MCP outputSchema
- **Signal:** Client-app team reported `create_session` failing MCP output-schema validation when
  `filingStatus` was passed ("structuredContent does not match tool outputSchema").
- **Finding:** Schema/contract class. The `@Tool` path emitted no `outputSchema`; tools that did publish
  one (`@McpTool`) tripped spring-ai schema-gen bugs (null required strings, `@JsonProperty` ignored).
  Inconsistent structured output across the 12 tools.
- **Eval:** `PlanningAgentEvalTest` (golden scenarios run through the typed tool surface, serialized to
  the same shape as `structuredContent`); per-tool conformance verified over the live `/mcp` transport.
- **Fix:** Migrated all tools to the `@McpTool` path with `generateOutputSchema=true`; null-safe compact
  constructors on shared `ReadResult`/`ExplainResult`; `Object` for heterogeneous fact values;
  `plan_questions` documented as the schemaless exception. See `decisions.md` (MCP transport section).
- **Status:** shipped.

## FIND-002 — agent invented the total-tax / balance-due figure
- **Signal:** Chat transcript — the AI presented a "projected balance due at filing" of $5,334 that did
  not equal its own breakdown ($441 income tax + $3,689 SE tax), and later produced a different $4,130.
- **Finding:** Tool-design class (the worst kind: the service *laundered* an LLM guess into a sealed,
  authoritative-looking export). `projectedCurrentYearTax` and `taxableIncomeBeforeQBIDeduction` were
  `Writable` facts the agent had to estimate; QBI was also over-deducted because the agent passed taxable
  income too high, so the (correct) income cap never bound.
- **Eval:** `TotalTaxConsistencyTest` — asserts `projectedTotalTax == incomeTax + seTax + AdditionalMedicare`
  and that QBI is capped, on the transcript scenario. Eval fixtures re-pointed to the derived model.
- **Fix:** Modeled ordinary income tax in the fact graph (standard deduction + 7 brackets), made total tax
  **derived**; added `project_total_tax`; `income-tax-parameters.yaml` for 2024–2026. Commit `7d254e9`.
- **Status:** shipped.

## FIND-003 — agent hand-waved the filing-status comparison
- **Signal:** Chat transcript — asked "would filing status make a difference?", the AI estimated a
  "moderate effect" and a guessed income-tax figure instead of computing it (and missed that MFJ's
  standard deduction zeroes the income tax at that income).
- **Finding:** Tool-misuse + missing-affordance class. No tool computed a cross-status comparison, and
  filing status is fixed at `create_session`, so the agent had no cheap correct path and improvised.
- **Eval:** `CompareFilingStatusesTest` — SE tax constant across statuses; MFJ income tax = 0 at the
  transcript income; needs-facts before income is set.
- **Fix:** `compare_filing_statuses` tool (clones session inputs across single/MFJ/MFS); filing-status
  guidance added to the MCP server `instructions` and `create_session`. Commit `ad74777`.
- **Status:** shipped.

## FIND-004 — agent led with the wrong deduction questions and didn't defer to the server
- **Signal:** Chat transcript — for a delivery driver the AI asked about "gas, maintenance, phone"
  expenses (which the standard mileage rate already covers — double-counting risk) instead of business
  miles, and answered tax questions from its own priors rather than calling the tools.
- **Finding:** Tool-misuse + knowledge-coverage class. The server gave no signal to defer, and the gig
  case (1099-K, platform fees, mileage-vs-actual) was under-modeled in tax-knowledge.
- **Eval:** `TaxKnowledgePlanningIntegrationTest` (1099-K → SE signal → gig detail questions; conflict on
  denied SE income); the deference is steered by the server `instructions` (verified in the handshake).
- **Fix:** Server `instructions` + directive `plan_questions` description; gig tax-knowledge (1099-K
  evidence map, platform-fee/supplies/prior-year questions, anti-double-count help text). Commits
  `5ccd5b6`, `d00126f`.
- **Status:** shipped.
