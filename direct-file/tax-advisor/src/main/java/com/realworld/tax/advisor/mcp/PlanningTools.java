package com.realworld.tax.advisor.mcp;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.realworld.tax.advisor.citation.CitationService;
import com.realworld.tax.advisor.graph.PlanningGraphService;
import com.realworld.tax.advisor.graph.PlanningGraphService.ReadResult;
import com.realworld.tax.advisor.knowledge.TaxKnowledgeService;
import com.realworld.tax.advisor.knowledge.TaxKnowledgeService.Citation;
import com.realworld.tax.advisor.report.PlanReportService;
import com.realworld.tax.advisor.report.PlanReportService.PlanReport;
import org.springframework.ai.mcp.annotation.McpTool;
import org.springframework.ai.mcp.annotation.McpToolParam;
import org.springframework.stereotype.Component;

/**
 * Spring AI MCP tools exposed by tax-advisor.
 *
 * <p>Every method is annotated with {@code @McpTool} and is auto-registered with the MCP server by
 * Spring AI's annotation scanner. {@code generateOutputSchema = true} makes the server publish an MCP
 * {@code outputSchema} for each tool and return matching {@code structuredContent}; tools therefore
 * return typed records (not {@code Map}). plan_questions is the one exception
 * ({@code generateOutputSchema = false}) — its result is an open interview-planning structure whose
 * nested records carry business-significant null fields, so it is left without a strict schema.
 *
 * <p>Wire-format note: both the input parameter names and the output record field names are the Java
 * camelCase identifiers ({@code sessionId}, {@code filingStatus}). No {@code @JsonProperty} renames —
 * Spring AI's schema generator ignores them, which would desync the schema from the serialized
 * content. Result records keep all descriptive strings non-null (empty when absent) and type
 * heterogeneous/nullable fact values as {@code Object} so the generated schema validates.
 */
@Component
public class PlanningTools {

    private static final String WRAPPER_PREFIX = "gov.irs.factgraph.persisters.";
    private static final String DOLLAR_WRAPPER = WRAPPER_PREFIX + "DollarWrapper";
    private static final String INT_WRAPPER = WRAPPER_PREFIX + "IntWrapper";
    private static final String RATIONAL_WRAPPER = WRAPPER_PREFIX + "RationalWrapper";

    private static final Map<String, String> TYPE_ALIASES = Map.of(
            "dollar", DOLLAR_WRAPPER,
            "int", INT_WRAPPER,
            "boolean", WRAPPER_PREFIX + "BooleanWrapper",
            "string", WRAPPER_PREFIX + "StringWrapper",
            "day", WRAPPER_PREFIX + "DayWrapper",
            "enum", WRAPPER_PREFIX + "EnumWrapper",
            "ein", WRAPPER_PREFIX + "EinWrapper",
            "tin", WRAPPER_PREFIX + "TinWrapper");

    /** Shared description for the {@code sessionId} tool parameter (returned by {@code create_session}). */
    private static final String SESSION_ID_DESCRIPTION = "Planning session id from create_session.";

    /** Key for the status field returned in the plan_questions confirmed-fact wrapper. */
    private static final String STATUS_KEY = "status";

    /** Self-employment tax fact path, read by several tools. */
    private static final String SE_TAX_PATH = "/seTax";

    /** Schedule C net-profit fact path, read by several tools. */
    private static final String SE_NET_PROFIT_PATH = "/seNetProfit";

    /** Derived projected current-year total tax (income tax + SE tax + Additional Medicare). */
    private static final String PROJECTED_TOTAL_TAX_PATH = "/planning/projectedCurrentYearTax";

    /** Form 8959 Additional Medicare Tax fact path, read by several tools. */
    private static final String ADDITIONAL_MEDICARE_TAX_PATH = "/additionalMedicareTax";

    private static final List<RequiredFact> REQUIRED_FACTS = List.of(
            new RequiredFact(
                    "/planning/priorYearTotalTax",
                    "Total federal tax from your prior-year return (Form 1040, Line 24)."),
            new RequiredFact(
                    "/planning/priorYearAGI",
                    "Adjusted gross income from your prior-year return (Form 1040, Line 11)."),
            new RequiredFact(
                    "/planning/ytdWithholding",
                    "Federal income tax already withheld by employers or platforms so far this year."),
            new RequiredFact(
                    "/planning/ytdEstimatedPaymentsMade",
                    "Quarterly estimated tax payments you've already made this year."));

    // Projected current-year total tax is no longer an agent-supplied required fact — it is derived
    // (income tax + SE tax + Additional Medicare). But it only computes once the Schedule C inputs are
    // set, so the quarterly tool checks it is complete and, if not, points the agent to run the income
    // projection first rather than silently treating a missing total as zero.
    private static final RequiredFact PROJECTED_TAX_PREREQUISITE = new RequiredFact(
            PROJECTED_TOTAL_TAX_PATH,
            "Run project_total_tax (or project_net_profit / calculate_se_tax) first so the projected"
                    + " current-year total tax can be computed from your income — it is no longer entered by hand.");

    private final PlanningGraphService graph;
    private final TaxKnowledgeService taxKnowledge;
    private final PlanReportService reportService;
    private final CitationService citationService;

    public PlanningTools(
            PlanningGraphService graph,
            TaxKnowledgeService taxKnowledge,
            PlanReportService reportService,
            CitationService citationService) {
        this.graph = graph;
        this.taxKnowledge = taxKnowledge;
        this.reportService = reportService;
        this.citationService = citationService;
    }

    // create_session uses the @McpTool annotation path (not @Tool) so Spring AI publishes a real MCP
    // outputSchema and matching structuredContent for it. This coexists with the @Tool tools: the
    // annotation scanner registers @McpTool methods, while McpServerConfig's MethodToolCallbackProvider
    // registers the @Tool methods on the same bean.
    @McpTool(
            name = "create_session",
            description = "Create a new in-memory planning session for a tax year and return its id. "
                    + "The session is seeded with that year's indexed tax constants (standard mileage "
                    + "rate, Social Security wage base) from tax-knowledge; if a year has no published "
                    + "constants the call fails rather than silently using another year's rates. All "
                    + "subsequent tool calls require this id. Sessions are not persisted and live only "
                    + "for the duration of the server process — if a later call reports an "
                    + "unknown/expired session, call this again and re-enter the facts.",
            generateOutputSchema = true)
    public CreateSessionResult createSession(
            @McpToolParam(
                            description = "Tax year to plan for, e.g. \"2025\". Defaults to the current calendar year.",
                            required = false)
                    String taxYear,
            @McpToolParam(
                            description = "Filing status: single | mfj | mfs. Defaults to single. Drives"
                                    + " filing-status thresholds (standard deduction, income-tax brackets, QBI"
                                    + " and Additional Medicare thresholds). Self-employment tax does NOT depend"
                                    + " on it. For a quick set-aside estimate it is fine to default to single and"
                                    + " tell the taxpayer you assumed it; status is fixed for the life of the"
                                    + " session, so to change it (or to compare) create a new session or call"
                                    + " compare_filing_statuses — do not estimate the difference by hand."
                                    + " Head-of-household and qualifying surviving spouse use the 'single'"
                                    + " thresholds for these provisions.",
                            required = false)
                    String filingStatus) {
        int year = (taxYear == null || taxYear.isBlank())
                ? java.time.Year.now().getValue()
                : Integer.parseInt(taxYear.trim());
        String sessionId = graph.createSession(year, filingStatus);
        String warning = taxKnowledge.provisionalWarning(year);
        return new CreateSessionResult(
                sessionId, year, graph.filingStatusOf(sessionId), warning == null ? "" : warning);
    }

    /**
     * Structured result of {@code create_session}. Returned as a typed record (via the {@code @McpTool}
     * path with {@code generateOutputSchema=true}) so the server publishes an accurate MCP
     * {@code outputSchema} and matching {@code structuredContent} that strict clients can validate.
     *
     * <p>Two deliberate choices avoid spring-ai's known schema-generation pitfalls: no
     * {@code @JsonProperty} renames (the schema generator ignores them, which would desync schema
     * field names from the serialized content), so the wire names are the record component names; and
     * {@code provisionalWarning} is always present (empty string when the year is finalized) rather
     * than nullable, since generators tend to mark every property required.
     */
    public record CreateSessionResult(String sessionId, int taxYear, String filingStatus, String provisionalWarning) {}

    @McpTool(
            name = "get_fact",
            description = "Read a single fact from a planning session's fact graph. Returns the "
                    + "current value if computable, or a 'not yet computable' note listing why.",
            generateOutputSchema = true)
    public ReadResult getFact(
            @McpToolParam(description = SESSION_ID_DESCRIPTION) String sessionId,
            @McpToolParam(description = "Fact path, e.g. /seTax or /planning/safeHarborTarget.") String path) {
        return graph.readFact(sessionId, path);
    }

    @McpTool(
            generateOutputSchema = true,
            name = "set_fact",
            description = "Write a value to a writable fact in a planning session. Specify the "
                    + "type via 'type' (short alias: dollar/int/boolean/string/day/enum/ein/tin) "
                    + "or 'typeCode' (full Scala class name). Optionally pass 'source' to record "
                    + "where the value came from as stated by the taxpayer. Returns whether the "
                    + "write was accepted by the fact graph's validation pass.")
    public PlanningGraphService.WriteResult setFact(
            @McpToolParam(description = SESSION_ID_DESCRIPTION) String sessionId,
            @McpToolParam(description = "Fact path, e.g. /planning/priorYearTotalTax.") String path,
            @McpToolParam(
                            description = "Short type alias: dollar | int | boolean | string | day | enum | ein | tin. "
                                    + "Either 'type' or 'typeCode' must be supplied.",
                            required = false)
                    String type,
            @McpToolParam(
                            description = "Full Scala persister type code, used when 'type' is not one of the aliases.",
                            required = false)
                    String typeCode,
            @McpToolParam(
                            description = "Value to write, as a string: e.g. \"608\" (dollar), "
                                    + "\"2025-04-15\" (day), \"true\" (boolean).")
                    String value,
            @McpToolParam(
                            description = "Optional free-text provenance as stated by the taxpayer, e.g. "
                                    + "\"2024 1099-NEC box 1, Uber\". Recorded for the export report and "
                                    + "shown there as self-reported; it is not verified and never enters "
                                    + "the tax math.",
                            required = false)
                    String source) {

        String resolvedTypeCode = typeCode;
        if (resolvedTypeCode == null || resolvedTypeCode.isBlank()) {
            if (type == null) {
                throw new IllegalArgumentException("Must supply 'type' or 'typeCode'.");
            }
            resolvedTypeCode = TYPE_ALIASES.get(type.toLowerCase());
            if (resolvedTypeCode == null) {
                throw new IllegalArgumentException("Unknown type alias: " + type);
            }
        }

        // Every real fact-graph persister lives under gov.irs.factgraph.persisters. A client-supplied
        // typeCode outside that package (e.g. an LLM-invented "us.gov.irs.df.plan.FilingStatusPersister")
        // would otherwise reach the graph and trigger an opaque upickle "invalid tag" abort that also
        // poisons the session. Reject it here with a message the caller can act on. Enums — including
        // filing status — use the EnumWrapper persister, reachable via type="enum".
        if (!resolvedTypeCode.startsWith(WRAPPER_PREFIX)) {
            throw new IllegalArgumentException("Unknown persister typeCode '" + resolvedTypeCode
                    + "'. Fact-graph persisters live under " + WRAPPER_PREFIX
                    + "; prefer the 'type' alias instead (one of " + TYPE_ALIASES.keySet()
                    + ") — e.g. type=\"enum\" for a filing-status fact.");
        }

        // The MCP client sends the value as a string; convert it to the JSON shape each persister
        // wrapper expects. DollarWrapper and the other string-backed wrappers read a string as-is;
        // IntWrapper expects a JSON number and BooleanWrapper a JSON boolean.
        Object shaped = value;
        if (INT_WRAPPER.equals(resolvedTypeCode)) {
            shaped = Long.parseLong(value.trim());
        } else if ((WRAPPER_PREFIX + "BooleanWrapper").equals(resolvedTypeCode)) {
            shaped = Boolean.parseBoolean(value.trim());
        }

        PlanningGraphService.WriteResult result = graph.writeFact(sessionId, path, resolvedTypeCode, shaped);
        graph.setSourceNote(sessionId, path, source);
        return result;
    }

    @McpTool(
            generateOutputSchema = true,
            name = "calculate_se_tax",
            description = "Compute self-employment tax (Schedule SE) for a planning session from gross "
                    + "receipts and business expenses. Returns net profit, net earnings (92.35% of "
                    + "profit), the Social Security portion (capped at the annual wage base and reduced "
                    + "by any W-2 Social Security wages), the Medicare portion, total SE tax, and the "
                    + "deductible half. Use this to build the projected current-year tax that "
                    + "estimate_quarterly_payment needs.")
    public SeTaxResult calculateSeTax(
            @McpToolParam(description = SESSION_ID_DESCRIPTION) String sessionId,
            @McpToolParam(
                            description =
                                    "Gross self-employment receipts (Schedule C line 1), as a string, e.g. \"24000\".")
                    String grossReceipts,
            @McpToolParam(
                            description =
                                    "Business miles driven (standard-mileage method), as a whole number. Default 0.",
                            required = false)
                    String businessMiles,
            @McpToolParam(description = "Platform/commission fees withheld, as a string. Default 0.", required = false)
                    String platformFees,
            @McpToolParam(
                            description = "Supplies and other business expenses, as a string. Default 0.",
                            required = false)
                    String suppliesAndOther,
            @McpToolParam(
                            description = "Social Security wages already reported on W-2s this year, as a string. "
                                    + "Default 0.",
                            required = false)
                    String socialSecurityWagesFromW2) {

        // Populate the Schedule C / SE inputs; the fact graph derives the rest. These are full-year
        // actuals, so the annualization factor is 1/1 (no projection) — see project_net_profit for the
        // year-to-date path.
        graph.writeFact(sessionId, "/seGrossReceipts", DOLLAR_WRAPPER, dollarOrZero(grossReceipts));
        graph.writeFact(sessionId, "/seVehicleBusinessMiles", INT_WRAPPER, longOrZero(businessMiles));
        graph.writeFact(sessionId, "/sePlatformFees", DOLLAR_WRAPPER, dollarOrZero(platformFees));
        graph.writeFact(sessionId, "/seSuppliesAndOther", DOLLAR_WRAPPER, dollarOrZero(suppliesAndOther));
        graph.writeFact(
                sessionId, "/seSocialSecurityWagesFromW2", DOLLAR_WRAPPER, dollarOrZero(socialSecurityWagesFromW2));
        graph.writeFact(sessionId, "/seAnnualizationFactor", RATIONAL_WRAPPER, Map.of("n", 1, "d", 1));

        // Surface the tax year and the rate actually used, so a wrong-year session (e.g. planning
        // 2026 on a 2025 session) is visible rather than silently using stale constants.
        int year = graph.taxYearOf(sessionId);
        return new SeTaxResult(
                "ok",
                year,
                graph.readDecimal(sessionId, "/standardMileageRate"),
                graph.readFact(sessionId, SE_NET_PROFIT_PATH).value(),
                graph.readFact(sessionId, "/seNetEarnings").value(),
                graph.readFact(sessionId, "/seSocialSecurityTax").value(),
                graph.readFact(sessionId, "/seMedicareTax").value(),
                graph.readFact(sessionId, SE_TAX_PATH).value(),
                graph.readFact(sessionId, "/deductibleHalfOfSETax").value(),
                graph.explain(sessionId, SE_TAX_PATH),
                nullToEmpty(taxKnowledge.provisionalWarning(year)));
    }

    /**
     * Structured result of {@code calculate_se_tax}. Fact values are typed {@code Object} (they may be
     * a dollar number or null when incomplete; {@code Object} maps to a permissive schema), strings are
     * non-null, and the explanation tree is the null-safe {@link PlanningGraphService.ExplainResult}.
     */
    public record SeTaxResult(
            String status,
            int taxYear,
            Object standardMileageRate,
            Object netProfit,
            Object netEarningsFromSe,
            Object socialSecurityPortion,
            Object medicarePortion,
            Object selfEmploymentTax,
            Object deductibleHalf,
            PlanningGraphService.ExplainResult explanationTree,
            String provisionalWarning) {}

    @McpTool(
            generateOutputSchema = true,
            name = "calculate_additional_medicare",
            description = "Compute the 0.9% Additional Medicare Tax (Form 8959) for a planning session. "
                    + "Run calculate_se_tax or project_net_profit first so the session has self-employment "
                    + "net earnings; this tool then adds W-2 Medicare wages (box 5) and applies the session's "
                    + "filing-status threshold ($200K single / $250K MFJ / $125K MFS, set at create_session). "
                    + "The surtax hits combined Medicare wages + SE income above the threshold — wages are "
                    + "counted first, reducing the threshold left for SE income. Returns the wage portion, "
                    + "the self-employment portion, and the total (Form 8959 Line 18).")
    public AdditionalMedicareResult calculateAdditionalMedicare(
            @McpToolParam(description = SESSION_ID_DESCRIPTION) String sessionId,
            @McpToolParam(
                            description = "Medicare wages already reported on W-2 box 5 (wages subject to "
                                    + "Medicare), as a string. Default 0 for a purely self-employed taxpayer.",
                            required = false)
                    String medicareWagesFromW2) {
        graph.writeFact(sessionId, "/medicareWagesFromW2", DOLLAR_WRAPPER, dollarOrZero(medicareWagesFromW2));

        // The SE portion needs net earnings from a prior calculate_se_tax / project_net_profit call.
        // If they aren't populated yet, surface a note rather than silently returning a null SE portion.
        ReadResult netEarnings = graph.readFact(sessionId, "/seNetEarnings");
        String note = netEarnings.complete()
                ? ""
                : "Self-employment net earnings aren't set yet — run calculate_se_tax or project_net_profit"
                        + " first for the SE portion. The wage portion (if any) is still computed.";
        int year = graph.taxYearOf(sessionId);
        return new AdditionalMedicareResult(
                "ok",
                year,
                graph.filingStatusOf(sessionId),
                graph.readFact(sessionId, "/additionalMedicareThreshold").value(),
                graph.readFact(sessionId, "/medicareWagesFromW2").value(),
                netEarnings.value(),
                graph.readFact(sessionId, "/seIncomeSubjectToAdditionalMedicare")
                        .value(),
                graph.readFact(sessionId, "/additionalMedicareTaxOnSE").value(),
                graph.readFact(sessionId, "/wagesSubjectToAdditionalMedicare").value(),
                graph.readFact(sessionId, "/additionalMedicareTaxOnWages").value(),
                graph.readFact(sessionId, ADDITIONAL_MEDICARE_TAX_PATH).value(),
                graph.explain(sessionId, ADDITIONAL_MEDICARE_TAX_PATH),
                note,
                nullToEmpty(taxKnowledge.provisionalWarning(year)));
    }

    /** Structured result of {@code calculate_additional_medicare} (Form 8959). */
    public record AdditionalMedicareResult(
            String status,
            int taxYear,
            String filingStatus,
            Object additionalMedicareThreshold,
            Object medicareWagesFromW2,
            Object netEarningsFromSe,
            Object seIncomeOverThreshold,
            Object additionalMedicareTaxOnSe,
            Object wagesOverThreshold,
            Object additionalMedicareTaxOnWages,
            Object additionalMedicareTax,
            PlanningGraphService.ExplainResult explanationTree,
            String note,
            String provisionalWarning) {}

    @McpTool(
            generateOutputSchema = true,
            name = "estimate_qbi_deduction",
            description = "Estimate the 20% Qualified Business Income (QBI) deduction (Form 8995, IRC 199A) "
                    + "for a planning session. Run calculate_se_tax or project_net_profit first so the session "
                    + "has self-employment net profit; for a sole proprietor, QBI is that net profit minus the "
                    + "deductible half of SE tax. The deduction is the lesser of 20% of QBI and 20% of (taxable "
                    + "income minus net capital gains). Taxable income before QBI is now DERIVED by the graph "
                    + "(AGI minus the standard deduction) — you no longer pass it in, so the income cap binds on "
                    + "the computed figure rather than an estimate. This is the SIMPLE Form 8995 method, valid "
                    + "when taxable income is at or below the filing-status threshold; above it, Form 8995-A "
                    + "wage/property limits apply and the result is only an upper bound (flagged in the response).")
    public QbiResult estimateQbiDeduction(
            @McpToolParam(description = SESSION_ID_DESCRIPTION) String sessionId,
            @McpToolParam(
                            description = "Net capital gains, including qualified dividends, as a string. "
                                    + "Excluded from the income cap. Optional; defaults to 0 (set at "
                                    + "create_session). Pass a value only to override.",
                            required = false)
                    String netCapitalGains) {
        // Taxable income before QBI is derived (AGI − standard deduction), so this tool no longer writes
        // it. Net capital gains is zero-defaulted at session creation; only overwrite when supplied.
        if (netCapitalGains != null && !netCapitalGains.isBlank()) {
            graph.writeFact(sessionId, "/planning/netCapitalGains", DOLLAR_WRAPPER, dollarOrZero(netCapitalGains));
        }

        ReadResult netProfit = graph.readFact(sessionId, SE_NET_PROFIT_PATH);
        String note = netProfit.complete()
                ? ""
                : "Self-employment net profit isn't set yet — run calculate_se_tax or project_net_profit"
                        + " first so QBI can be computed from it.";
        ReadResult above = graph.readFact(sessionId, "/qbiAboveThreshold");
        String aboveWarning = Boolean.TRUE.equals(above.value())
                ? "Taxable income is above the filing-status threshold for the simple method, so Form 8995-A"
                        + " (specified-service-business, W-2-wage, and qualified-property limits) governs. The"
                        + " qbiDeduction shown is an UPPER BOUND and may be reduced or eliminated."
                : "";
        int year = graph.taxYearOf(sessionId);
        return new QbiResult(
                "ok",
                year,
                graph.filingStatusOf(sessionId),
                graph.readFact(sessionId, "/qualifiedBusinessIncome").value(),
                graph.readFact(sessionId, "/qbiComponent").value(),
                graph.readFact(sessionId, "/qbiIncomeLimit").value(),
                graph.readFact(sessionId, "/qbiDeduction").value(),
                graph.readFact(sessionId, "/qbiThreshold").value(),
                above.value(),
                aboveWarning,
                graph.explain(sessionId, "/qbiDeduction"),
                note,
                nullToEmpty(taxKnowledge.provisionalWarning(year)));
    }

    /** Structured result of {@code estimate_qbi_deduction} (Form 8995). */
    public record QbiResult(
            String status,
            int taxYear,
            String filingStatus,
            Object qualifiedBusinessIncome,
            Object qbiComponent,
            Object qbiIncomeLimit,
            Object qbiDeduction,
            Object qbiThreshold,
            Object aboveThreshold,
            String aboveThresholdWarning,
            PlanningGraphService.ExplainResult explanationTree,
            String note,
            String provisionalWarning) {}

    @McpTool(
            generateOutputSchema = true,
            name = "project_total_tax",
            description = "Project full-year total federal tax for a self-employed planning session: the "
                    + "whole ladder from net profit to AGI to taxable income to income tax, plus SE tax and "
                    + "the Additional Medicare surtax. Run calculate_se_tax or project_net_profit first so the "
                    + "session has self-employment net profit. Income tax is computed in-graph from the year's "
                    + "standard deduction, ordinary brackets, and the QBI deduction — you do NOT estimate any "
                    + "of it. Call this instead of working out total tax yourself; it is also exactly what feeds "
                    + "the projected balance due in estimate_quarterly_payment. Scope: ordinary income only (no "
                    + "credits, capital-gains/qualified-dividend rates, NIIT, or AMT); income besides this "
                    + "Schedule C enters via otherOrdinaryIncome.")
    public TotalTaxResult projectTotalTax(
            @McpToolParam(description = SESSION_ID_DESCRIPTION) String sessionId,
            @McpToolParam(
                            description = "Ordinary income other than this self-employment (e.g. W-2 box 1 wages, "
                                    + "interest), as a string. Optional; defaults to 0. Pass a value for a taxpayer "
                                    + "who also has a W-2 or other ordinary income.",
                            required = false)
                    String otherOrdinaryIncome,
            @McpToolParam(
                            description = "Net capital gains incl. qualified dividends, as a string. Optional; "
                                    + "defaults to 0. Excluded from the QBI income cap.",
                            required = false)
                    String netCapitalGains) {
        // Both optional inputs are zero-defaulted at session creation; only overwrite when supplied.
        if (otherOrdinaryIncome != null && !otherOrdinaryIncome.isBlank()) {
            graph.writeFact(
                    sessionId, "/planning/otherTaxableIncome", DOLLAR_WRAPPER, dollarOrZero(otherOrdinaryIncome));
        }
        if (netCapitalGains != null && !netCapitalGains.isBlank()) {
            graph.writeFact(sessionId, "/planning/netCapitalGains", DOLLAR_WRAPPER, dollarOrZero(netCapitalGains));
        }

        ReadResult netProfit = graph.readFact(sessionId, SE_NET_PROFIT_PATH);
        String incomplete = netProfit.complete()
                ? ""
                : "Self-employment net profit isn't set yet — run calculate_se_tax or project_net_profit"
                        + " first so income tax and total tax can be computed. ";
        String note = incomplete
                + "projectedTotalTax is income tax + SE tax + Additional Medicare surtax. It excludes credits,"
                + " capital-gains/qualified-dividend rates, the NIIT, and AMT, so a return with those will"
                + " differ. Income tax is on taxable income after the standard and QBI deductions.";
        int year = graph.taxYearOf(sessionId);
        return new TotalTaxResult(
                "ok",
                year,
                graph.filingStatusOf(sessionId),
                graph.readFact(sessionId, SE_NET_PROFIT_PATH).value(),
                graph.readFact(sessionId, "/planning/otherTaxableIncome").value(),
                graph.readFact(sessionId, "/deductibleHalfOfSETax").value(),
                graph.readFact(sessionId, "/planning/projectedAGI").value(),
                graph.readFact(sessionId, "/standardDeduction").value(),
                graph.readFact(sessionId, "/qbiDeduction").value(),
                graph.readFact(sessionId, "/planning/taxableIncome").value(),
                graph.readFact(sessionId, "/incomeTax/projectedIncomeTax").value(),
                graph.readFact(sessionId, SE_TAX_PATH).value(),
                graph.readFact(sessionId, ADDITIONAL_MEDICARE_TAX_PATH).value(),
                graph.readFact(sessionId, PROJECTED_TOTAL_TAX_PATH).value(),
                note,
                graph.explain(sessionId, PROJECTED_TOTAL_TAX_PATH),
                nullToEmpty(taxKnowledge.provisionalWarning(year)));
    }

    /** Structured result of {@code project_total_tax}: the full net-profit-to-total-tax ladder. */
    public record TotalTaxResult(
            String status,
            int taxYear,
            String filingStatus,
            Object netProfit,
            Object otherOrdinaryIncome,
            Object deductibleHalfOfSeTax,
            Object adjustedGrossIncome,
            Object standardDeduction,
            Object qbiDeduction,
            Object taxableIncome,
            Object incomeTax,
            Object selfEmploymentTax,
            Object additionalMedicareTax,
            Object projectedTotalTax,
            String note,
            PlanningGraphService.ExplainResult explanationTree,
            String provisionalWarning) {}

    @McpTool(
            generateOutputSchema = true,
            name = "compare_filing_statuses",
            description = "Project this session's total tax under each filing status (single, married filing "
                    + "jointly, married filing separately) on identical income, in one call. Run "
                    + "calculate_se_tax or project_net_profit first so there is income to compare. Use this to "
                    + "answer 'would my filing status change what I owe?' with COMPUTED numbers rather than "
                    + "estimating: self-employment tax is the same under every status (it is based on business "
                    + "profit), so only income tax differs — through the standard deduction and bracket widths — "
                    + "plus the Additional Medicare surtax threshold, which is lower for MFS. A session's filing "
                    + "status is fixed at create_session, so this spins up throwaway sessions to compare; to "
                    + "actually switch, create a new session with the chosen status.")
    public CompareFilingStatusesResult compareFilingStatuses(
            @McpToolParam(description = SESSION_ID_DESCRIPTION) String sessionId) {
        int year = graph.taxYearOf(sessionId);
        if (!graph.readFact(sessionId, SE_NET_PROFIT_PATH).complete()) {
            return new CompareFilingStatusesResult(
                    "needs_facts",
                    year,
                    List.of(),
                    "Run calculate_se_tax or project_net_profit first so there is income to compare across"
                            + " filing statuses.",
                    nullToEmpty(taxKnowledge.provisionalWarning(year)));
        }
        List<FilingStatusProjection> projections = new ArrayList<>();
        for (String status : List.of("single", "mfj", "mfs")) {
            String sid = graph.cloneSessionWithFilingStatus(sessionId, status);
            try {
                projections.add(new FilingStatusProjection(
                        status,
                        graph.readFact(sid, "/standardDeduction").value(),
                        graph.readFact(sid, "/planning/taxableIncome").value(),
                        graph.readFact(sid, "/incomeTax/projectedIncomeTax").value(),
                        graph.readFact(sid, SE_TAX_PATH).value(),
                        graph.readFact(sid, ADDITIONAL_MEDICARE_TAX_PATH).value(),
                        graph.readFact(sid, PROJECTED_TOTAL_TAX_PATH).value()));
            } finally {
                // The comparison sessions are throwaway — don't leak them into the in-memory map.
                graph.discardSession(sid);
            }
        }
        return new CompareFilingStatusesResult(
                "ok",
                year,
                projections,
                "Self-employment tax (Social Security + Medicare) is identical across filing statuses; only"
                        + " income tax differs, through the standard deduction and bracket widths (the Additional"
                        + " Medicare surtax threshold also differs — lower for MFS). Married filing separately is"
                        + " rarely beneficial. These are estimates on identical inputs, not a recommendation of"
                        + " which status to file.",
                nullToEmpty(taxKnowledge.provisionalWarning(year)));
    }

    /** One filing status's projection within a {@code compare_filing_statuses} result. */
    public record FilingStatusProjection(
            String filingStatus,
            Object standardDeduction,
            Object taxableIncome,
            Object incomeTax,
            Object selfEmploymentTax,
            Object additionalMedicareTax,
            Object projectedTotalTax) {}

    /** Structured result of {@code compare_filing_statuses}: one projection per filing status. */
    public record CompareFilingStatusesResult(
            String status,
            int taxYear,
            List<FilingStatusProjection> projections,
            String note,
            String provisionalWarning) {}

    @McpTool(
            generateOutputSchema = true,
            name = "project_net_profit",
            description = "Project full-year self-employment net profit (and SE tax) from year-to-date "
                    + "raw numbers. Give the receipts, miles, fees, and supplies accumulated so far this "
                    + "year plus the asOfDate; the tool annualizes them straight-line (× 12 ÷ months of "
                    + "data) and runs the same Schedule C/SE math. Returns projected gross receipts, net "
                    + "profit, net earnings, and SE tax with a derivation chain. Assumes income is even "
                    + "across the year — for seasonal income or a known full-year figure, use "
                    + "calculate_se_tax with full-year numbers instead.")
    public ProjectNetProfitResult projectNetProfit(
            @McpToolParam(description = SESSION_ID_DESCRIPTION) String sessionId,
            @McpToolParam(
                            description = "ISO date (YYYY-MM-DD) the year-to-date figures run through. Required "
                                    + "because the fact graph has no clock; it sets how many months to annualize from.")
                    String asOfDate,
            @McpToolParam(description = "Year-to-date gross self-employment receipts, as a string, e.g. \"21000\".")
                    String ytdGrossReceipts,
            @McpToolParam(
                            description = "Year-to-date business miles driven, as a whole number. Default 0.",
                            required = false)
                    String ytdBusinessMiles,
            @McpToolParam(
                            description = "Year-to-date platform/commission fees, as a string. Default 0.",
                            required = false)
                    String ytdPlatformFees,
            @McpToolParam(
                            description = "Year-to-date supplies and other business expenses, as a string. Default 0.",
                            required = false)
                    String ytdSuppliesAndOther,
            @McpToolParam(
                            description = "Social Security wages already reported on W-2s this year, as a string. "
                                    + "Not annualized. Default 0.",
                            required = false)
                    String socialSecurityWagesFromW2) {

        int taxYear = graph.taxYearOf(sessionId);
        int monthsElapsed = monthsElapsedInTaxYear(taxYear, LocalDate.parse(asOfDate));

        // Write the year-to-date figures into the same Schedule C inputs, then set the annualization
        // factor so the graph projects them to a full year (12 / months of data).
        graph.writeFact(sessionId, "/seGrossReceipts", DOLLAR_WRAPPER, dollarOrZero(ytdGrossReceipts));
        graph.writeFact(sessionId, "/seVehicleBusinessMiles", INT_WRAPPER, longOrZero(ytdBusinessMiles));
        graph.writeFact(sessionId, "/sePlatformFees", DOLLAR_WRAPPER, dollarOrZero(ytdPlatformFees));
        graph.writeFact(sessionId, "/seSuppliesAndOther", DOLLAR_WRAPPER, dollarOrZero(ytdSuppliesAndOther));
        graph.writeFact(
                sessionId, "/seSocialSecurityWagesFromW2", DOLLAR_WRAPPER, dollarOrZero(socialSecurityWagesFromW2));
        graph.writeFact(sessionId, "/seMonthsElapsed", INT_WRAPPER, (long) monthsElapsed);
        graph.writeFact(sessionId, "/seAnnualizationFactor", RATIONAL_WRAPPER, Map.of("n", 12, "d", monthsElapsed));

        return new ProjectNetProfitResult(
                "ok",
                taxYear,
                graph.readDecimal(sessionId, "/standardMileageRate"),
                monthsElapsed,
                "12/" + monthsElapsed,
                dollarOrZero(ytdGrossReceipts),
                graph.readFact(sessionId, "/seEffectiveGrossReceipts").value(),
                graph.readFact(sessionId, SE_NET_PROFIT_PATH).value(),
                graph.readFact(sessionId, "/seNetEarnings").value(),
                graph.readFact(sessionId, SE_TAX_PATH).value(),
                graph.readFact(sessionId, "/deductibleHalfOfSETax").value(),
                "Projected figures annualize your year-to-date numbers assuming income is even across"
                        + " the year (straight-line). Seasonal income will differ. This projects"
                        + " self-employment tax only; it does not include income tax.",
                graph.explain(sessionId, SE_NET_PROFIT_PATH),
                nullToEmpty(taxKnowledge.provisionalWarning(taxYear)));
    }

    /** Structured result of {@code project_net_profit} (year-to-date projection). */
    public record ProjectNetProfitResult(
            String status,
            int taxYear,
            Object standardMileageRate,
            int monthsElapsed,
            String annualizationFactor,
            String ytdGrossReceipts,
            Object projectedGrossReceipts,
            Object projectedNetProfit,
            Object projectedNetEarningsFromSe,
            Object projectedSelfEmploymentTax,
            Object deductibleHalf,
            String note,
            PlanningGraphService.ExplainResult explanationTree,
            String provisionalWarning) {}

    @McpTool(
            name = "explain",
            description = "Explain how a fact's value was derived: returns the fact's name, "
                    + "description, computed value, and the values of every fact it directly "
                    + "depends on. Useful for grounding 'why is my number X?' answers.",
            generateOutputSchema = true)
    public PlanningGraphService.ExplainResult explain(
            @McpToolParam(description = SESSION_ID_DESCRIPTION) String sessionId,
            @McpToolParam(description = "Fact path to explain.") String path) {
        return graph.explain(sessionId, path);
    }

    @McpTool(
            generateOutputSchema = true,
            name = "cite",
            description = "Explain the legal basis for a fact: returns the authorities (IRC sections, "
                    + "IRS forms/instructions/publications) behind the fact's value, each with a formal "
                    + "citation, an official link, and a friendly plain-language explanation. Use to "
                    + "answer 'why / on what basis is this number what it is?'. Authorities are derived "
                    + "from the fact's actual computation, so a result cites every statutory constant it "
                    + "depends on.")
    public CiteResult cite(
            @McpToolParam(description = SESSION_ID_DESCRIPTION) String sessionId,
            @McpToolParam(
                            description =
                                    "Fact path to explain the basis for, e.g. /seTax or /planning/safeHarborTarget.")
                    String path) {
        int taxYear = graph.taxYearOf(sessionId);
        ReadResult value = graph.readFact(sessionId, path);

        List<Authority> authorities = new ArrayList<>();
        for (Citation c : citationService.citationsForFact(taxYear, path)) {
            authorities.add(new Authority(
                    nullToEmpty(c.sourceId()),
                    nullToEmpty(c.authority()),
                    nullToEmpty(c.citation()),
                    nullToEmpty(c.title()),
                    nullToEmpty(c.url()),
                    nullToEmpty(c.plainLanguage())));
        }
        String note = authorities.isEmpty()
                ? "No statutory authority is attached to this value — it is either a raw input you provided"
                        + " or pure arithmetic with no tax-law constant behind it."
                : "";
        return new CiteResult("ok", path, value.value(), authorities, note);
    }

    /** One legal authority behind a fact (a resolved citation), all strings non-null. */
    public record Authority(
            String sourceId, String authority, String citation, String title, String url, String plainLanguage) {}

    /** Structured result of {@code cite}. */
    public record CiteResult(String status, String path, Object value, List<Authority> authorities, String note) {}

    @McpTool(
            name = "export_plan",
            description = "Generate a self-contained, printable planning summary for the session and "
                    + "return it as Markdown sealed with a SHA-256 content hash. The summary lists the "
                    + "taxpayer's self-reported inputs, the year's statutory parameters with their IRS "
                    + "sources, and each computed result with its one-level derivation. By default it also "
                    + "cites the legal authority behind each result and appends a plain-language 'Sources' "
                    + "section; pass includeCitations=false to omit citations. The service stores nothing — "
                    + "this artifact is the taxpayer's own record to save or print; hand the Markdown to the "
                    + "user verbatim. Use after the relevant figures have been computed.",
            generateOutputSchema = true)
    public ExportPlanResult exportPlan(
            @McpToolParam(description = SESSION_ID_DESCRIPTION) String sessionId,
            @McpToolParam(
                            description = "Include legal citations and a plain-language Sources section. "
                                    + "Defaults to true.",
                            required = false)
                    Boolean includeCitations) {
        PlanReport report = reportService.generate(sessionId, includeCitations == null || includeCitations);
        return new ExportPlanResult(
                "ok",
                report.taxYear(),
                report.generatedAt().toString(),
                "SHA-256",
                report.sha256(),
                report.markdown(),
                "This report is not stored by the service. Give the reportMarkdown to the taxpayer to keep;"
                        + " the sha256 lets them later confirm the document was not altered.");
    }

    /** Structured result of {@code export_plan} (all fields non-null for output-schema conformance). */
    public record ExportPlanResult(
            String status,
            int taxYear,
            String generatedAt,
            String hashAlgorithm,
            String sha256,
            String reportMarkdown,
            String note) {}

    @McpTool(
            generateOutputSchema = true,
            name = "estimate_quarterly_payment",
            description = "Compute the next federal estimated tax payment for a self-employed "
                    + "taxpayer using IRC §6654 safe-harbor logic (lesser of 100%/110% prior-year "
                    + "tax or 90% projected current-year tax). Returns the recommended payment, "
                    + "next deadline, and a derivation chain. If required facts are missing, "
                    + "returns a 'needs_facts' response so the agent can gather them.")
    public QuarterlyPaymentResult estimateQuarterlyPayment(
            @McpToolParam(description = SESSION_ID_DESCRIPTION) String sessionId,
            @McpToolParam(description = "ISO date (YYYY-MM-DD). Required because the fact graph has no clock.")
                    String asOfDate) {

        LocalDate asOf = LocalDate.parse(asOfDate);

        // 1. Check that required writable facts are populated.
        List<MissingFact> missing = new ArrayList<>();
        for (RequiredFact rf : REQUIRED_FACTS) {
            ReadResult r = graph.readFact(sessionId, rf.path);
            if (!r.complete()) {
                missing.add(new MissingFact(rf.path, rf.prompt));
            }
        }
        // The projected total tax is derived, not entered — but it only resolves once the income inputs
        // are present. If it is still incomplete, surface that as a prerequisite to run first.
        if (!graph.readFact(sessionId, PROJECTED_TAX_PREREQUISITE.path).complete()) {
            missing.add(new MissingFact(PROJECTED_TAX_PREREQUISITE.path, PROJECTED_TAX_PREREQUISITE.prompt));
        }
        if (!missing.isEmpty()) {
            return new QuarterlyPaymentResult(
                    "needs_facts",
                    missing,
                    "Ask the user for these values, write each via set_fact, then call this tool again.",
                    null,
                    "",
                    "",
                    null,
                    null,
                    "",
                    null,
                    null,
                    "",
                    "");
        }

        // 2. Resolve the next deadline and remaining quarters for the session's tax year
        // (asOf only determines which of that year's deadlines are still ahead).
        List<Deadline> deadlines = deadlinesForTaxYear(graph.taxYearOf(sessionId));
        Deadline next = deadlines.stream()
                .filter(d -> !d.due.isBefore(asOf))
                .findFirst()
                .orElse(deadlines.get(deadlines.size() - 1));
        long remainingQuarters =
                deadlines.stream().filter(d -> !d.due.isBefore(asOf)).count();
        if (remainingQuarters == 0) {
            remainingQuarters = 1; // past the final (Jan 15) deadline — recommend a catch-up payment
        }

        graph.writeFact(sessionId, "/planning/remainingQuarters", INT_WRAPPER, remainingQuarters);

        // 3. Read the derived recommendation + supporting facts.
        ReadResult suggested = graph.readFact(sessionId, "/planning/nextQuarterlyPaymentSuggested");
        ReadResult safeHarbor = graph.readFact(sessionId, "/planning/safeHarborTarget");
        ReadResult ytdApplied = graph.readFact(sessionId, "/planning/ytdPaymentsApplied");
        ReadResult remainingDue = graph.readFact(sessionId, "/planning/remainingPaymentDue");
        ReadResult seTax = graph.readFact(sessionId, SE_TAX_PATH);
        ReadResult highIncomeRule = graph.readFact(sessionId, "/planning/highIncomeSafeHarborApplies");
        ReadResult projectedTax = graph.readFact(sessionId, PROJECTED_TOTAL_TAX_PATH);
        ReadResult balanceDueAtFiling = graph.readFact(sessionId, "/planning/projectedBalanceDueAtFiling");

        // Keep the two questions distinct: the safe-harbor recommendation ("least to prepay to avoid
        // the penalty") is not the same as what's actually owed for the year. derivation is a free-form
        // map surfaced under the permissive `derivation` Object field.
        Map<String, Object> derivation = new LinkedHashMap<>();
        derivation.put("selfEmploymentTax", seTax.value());
        derivation.put(
                "safeHarborRule",
                Boolean.TRUE.equals(highIncomeRule.value())
                        ? "110% of prior-year tax (AGI > $150,000)"
                        : "100% of prior-year tax");
        derivation.put("safeHarborTarget", safeHarbor.value());
        derivation.put("ytdPaymentsAlreadyApplied", ytdApplied.value());
        derivation.put("remainingDueThroughYearEnd", remainingDue.value());
        derivation.put("remainingQuarters", remainingQuarters);

        int year = graph.taxYearOf(sessionId);
        return new QuarterlyPaymentResult(
                "ok",
                List.of(),
                "",
                suggested.value(),
                next.due.toString(),
                next.quarter,
                projectedTax.value(),
                balanceDueAtFiling.value(),
                "recommendedPayment is the safe-harbor minimum that avoids the IRC §6654 underpayment"
                        + " penalty; it does NOT settle the year's tax. projectedBalanceDueAtFiling is what"
                        + " would still be owed at filing if no further payments are made beyond those already"
                        + " counted (negative = refund).",
                derivation,
                graph.explain(sessionId, "/planning/nextQuarterlyPaymentSuggested"),
                "https://www.irs.gov/payments/direct-pay",
                nullToEmpty(taxKnowledge.provisionalWarning(year)));
    }

    /** A required fact the agent must collect before estimate_quarterly_payment can run. */
    public record MissingFact(String path, String prompt) {}

    /**
     * Structured result of {@code estimate_quarterly_payment}. Two shapes share one record: with facts
     * missing, {@code status="needs_facts"}, {@code missingFacts} populated and the rest empty/null;
     * otherwise {@code status="ok"} with the recommendation. {@code derivation}/{@code explanationTree}
     * are typed {@code Object} (permissive schema) because they are absent in the needs-facts shape.
     */
    public record QuarterlyPaymentResult(
            String status,
            List<MissingFact> missingFacts,
            String hint,
            Object recommendedPayment,
            String nextDeadline,
            String quarter,
            Object projectedTotalTax,
            Object projectedBalanceDueAtFiling,
            String note,
            Object derivation,
            Object explanationTree,
            String paymentUrl,
            String provisionalWarning) {}

    // plan_questions deliberately does NOT publish an outputSchema (generateOutputSchema = false). Its
    // PlanResult is an open, evolving interview-planning structure whose nested records carry
    // business-logic-significant null fields (e.g. CandidateFact.sourceField, whose null-ness drives
    // withEvidence()). A generated schema marks every string required, so a null would make
    // structuredContent fail validation; and coercing those nulls to "" would change behavior. Omitting
    // the schema means no strict validation (and no validation failure) — the correct trade-off for an
    // open structure. The other 11 tools publish strict, conforming schemas.
    @McpTool(
            generateOutputSchema = false,
            name = "plan_questions",
            description = "Plan the next tax interview questions from IRS-backed tax-knowledge artifacts. "
                    + "Call this BEFORE asking the taxpayer any interview question, and ask what it "
                    + "returns in the order returned — do not invent your own questions; the sequencing "
                    + "encodes tax rules a general model gets wrong (e.g. it asks a driver for business "
                    + "miles, not gas/maintenance receipts, which the standard mileage rate already covers). "
                    + "Inputs may include current session facts, document evidence, prior-year profile "
                    + "data, and previous answers. Returns candidate facts that require confirmation, "
                    + "review conflicts, and the next applicable questions.")
    public TaxKnowledgeService.PlanResult planQuestions(
            @McpToolParam(
                            description =
                                    "Optional planning session id. If supplied, the session's facts are merged in.",
                            required = false)
                    String sessionId,
            @McpToolParam(description = "Tax year to plan for. Defaults to 2025.", required = false) Integer taxYear,
            @McpToolParam(description = "Jurisdiction. Defaults to 'federal'.", required = false) String jurisdiction,
            @McpToolParam(
                            description = "Optional fact map. Values may be raw values or {value, status}; "
                                    + "status defaults to confirmed.",
                            required = false)
                    Map<String, Object> facts,
            @McpToolParam(
                            description = "Document evidence. Items may be strings like 'form_w2' or objects with "
                                    + "documentType plus arbitrary fields.",
                            required = false)
                    List<Object> evidence,
            @McpToolParam(description = "Taxpayer profile signals, such as prior_year_topics.", required = false)
                    Map<String, Object> profile,
            @McpToolParam(description = "Include questions already answered in this session.", required = false)
                    Boolean includeAnswered,
            @McpToolParam(description = "Maximum applicable questions to return.", required = false) Integer limit) {

        Map<String, Object> mergedFacts = new LinkedHashMap<>();
        if (sessionId != null && !sessionId.isBlank()) {
            graph.sessionFacts(sessionId).forEach((path, value) -> mergedFacts.put(path, confirmed(value)));
        }
        if (facts != null) {
            mergedFacts.putAll(facts);
        }

        return taxKnowledge.plan(new TaxKnowledgeService.PlanRequest(
                taxYear == null ? 2025 : taxYear,
                jurisdiction == null ? "federal" : jurisdiction,
                mergedFacts,
                evidenceStates(evidence),
                profile == null ? Map.of() : profile,
                Boolean.TRUE.equals(includeAnswered),
                limit));
    }

    private static Map<String, Object> confirmed(Object value) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("value", value);
        out.put(STATUS_KEY, "confirmed");
        return out;
    }

    @SuppressWarnings("unchecked")
    private static List<TaxKnowledgeService.EvidenceState> evidenceStates(List<Object> evidence) {
        if (evidence == null) {
            return List.of();
        }
        List<TaxKnowledgeService.EvidenceState> states = new ArrayList<>();
        for (Object item : evidence) {
            if (item instanceof String documentType) {
                states.add(new TaxKnowledgeService.EvidenceState(documentType, Map.of()));
            } else if (item instanceof Map<?, ?> map) {
                Map<String, Object> attributes = new LinkedHashMap<>((Map<String, Object>) map);
                String documentType = (String) attributes.remove("document_type");
                if (documentType == null) {
                    documentType = (String) attributes.remove("documentType");
                }
                if (documentType != null) {
                    states.add(new TaxKnowledgeService.EvidenceState(documentType, attributes));
                }
            }
        }
        return states;
    }

    /**
     * Federal individual estimated-tax deadlines (IRC §6654) for {@code taxYear}: the Apr 15 / Jun 15 /
     * Sep 15 installments in that year and the Jan 15 installment in the next. Derived from the tax year
     * (which the session is created with) rather than hard-coded, and pushed to the next Monday when the
     * 15th lands on a weekend (federal-holiday shifts, e.g. Emancipation Day, are not modeled — treat
     * these as planning dates, not authoritative filing dates).
     */
    private static List<Deadline> deadlinesForTaxYear(int taxYear) {
        return List.of(
                new Deadline("Q1", weekdayOnOrAfter(LocalDate.of(taxYear, 4, 15))),
                new Deadline("Q2", weekdayOnOrAfter(LocalDate.of(taxYear, 6, 15))),
                new Deadline("Q3", weekdayOnOrAfter(LocalDate.of(taxYear, 9, 15))),
                new Deadline("Q4", weekdayOnOrAfter(LocalDate.of(taxYear + 1, 1, 15))));
    }

    /**
     * Months of {@code taxYear} elapsed as of {@code asOf} (1–12), used as the annualization basis.
     * The date must fall <em>within</em> the session's tax year. A date outside it is rejected rather
     * than clamped: clamping a later-year date to 12 months would silently turn the projection into a
     * no-op (factor 12/12 = 1) and return a full-year-sized number to a year-to-date user — a wrong
     * headline figure with no failure signal. For full-year actuals, use {@code calculate_se_tax}.
     */
    private static int monthsElapsedInTaxYear(int taxYear, LocalDate asOf) {
        if (asOf.getYear() != taxYear) {
            throw new IllegalArgumentException("asOfDate " + asOf + " is not within tax year " + taxYear
                    + ". project_net_profit annualizes year-to-date figures inside the planning year, so the "
                    + "date must fall in " + taxYear + ". Create the session for the year you are planning, or "
                    + "use calculate_se_tax if you already have full-year figures.");
        }
        return asOf.getMonthValue();
    }

    /** Push a date to the following Monday if it falls on a weekend. */
    private static LocalDate weekdayOnOrAfter(LocalDate d) {
        return switch (d.getDayOfWeek()) {
            case SATURDAY -> d.plusDays(2);
            case SUNDAY -> d.plusDays(1);
            default -> d;
        };
    }

    /** Dollar inputs are written as strings (DollarWrapper reads a string); blank means $0. */
    private static String dollarOrZero(String v) {
        return (v == null || v.isBlank()) ? "0" : v.trim();
    }

    /** Tool result strings must be non-null for MCP output-schema conformance (required: string). */
    private static String nullToEmpty(String v) {
        return v == null ? "" : v;
    }

    /** Int inputs (e.g. miles) are written as a JSON number; blank means 0. */
    private static long longOrZero(String v) {
        return (v == null || v.isBlank()) ? 0L : Long.parseLong(v.trim());
    }

    private record Deadline(String quarter, LocalDate due) {}

    private record RequiredFact(String path, String prompt) {}
}
