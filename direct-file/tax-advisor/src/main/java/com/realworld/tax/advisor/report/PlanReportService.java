package com.realworld.tax.advisor.report;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.NumberFormat;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import com.realworld.tax.advisor.citation.CitationService;
import com.realworld.tax.advisor.graph.PlanningGraphService;
import com.realworld.tax.advisor.graph.PlanningGraphService.ExplainResult;
import com.realworld.tax.advisor.knowledge.TaxKnowledgeService;
import com.realworld.tax.advisor.knowledge.TaxKnowledgeService.Citation;
import com.realworld.tax.advisor.knowledge.TaxKnowledgeService.TaxParameter;
import org.springframework.stereotype.Service;

/**
 * Renders a self-contained, human-readable planning report from a live session and seals it with a
 * SHA-256 content hash. The artifact is meant to be handed to the taxpayer to keep — the service
 * persists nothing, so this report is the only durable record of a planning conversation, and the
 * taxpayer (not the IRS-side system) holds it. That keeps the service stateless and outside the
 * FTI-retention surface while still giving the taxpayer something they can save, print, and re-verify.
 *
 * <p>The report distinguishes three things, because an auditable document must:
 * <ul>
 *   <li><b>Your inputs</b> — values the taxpayer supplied, explicitly labelled self-reported and
 *       <i>unverified</i>: this tool traces arithmetic, it does not confirm a figure against a 1099.</li>
 *   <li><b>Tax-year parameters</b> — the statutory constants used (mileage rate, wage base, FICA
 *       rates, safe-harbor percentages) with their IRS source ids, so every fixed number is traceable.</li>
 *   <li><b>Results</b> — each computed figure with the one-level derivation that produced it.</li>
 * </ul>
 *
 * <p>The SHA-256 is tamper-evidence, not a cryptographic signature: there is no key infrastructure
 * here, so it proves the document was not altered after generation, not who generated it.
 */
@Service
public class PlanReportService {

    /** Marks the start of the integrity section; the hash covers everything before it. */
    static final String INTEGRITY_DELIMITER = "\n\n---\n\n## Integrity\n\n";

    /** Markdown table cell separator. */
    private static final String CELL = " | ";

    private static final NumberFormat CURRENCY = NumberFormat.getCurrencyInstance(Locale.US);

    /**
     * Result facts rendered (in this order) when they are computable for the session. A SE-only
     * session shows just the Schedule SE rows; a full quarterly session shows the §6654 rows too.
     * Facts that lack a {@code <Name>} in the dictionary get a friendly label here.
     */
    private static final List<ResultLine> RESULT_LINES = List.of(
            new ResultLine("/seNetProfit", null),
            new ResultLine("/seNetEarnings", null),
            new ResultLine("/seSocialSecurityTax", "Social Security portion of SE tax"),
            new ResultLine("/seMedicareTax", "Medicare portion of SE tax"),
            new ResultLine("/seTax", null),
            new ResultLine("/deductibleHalfOfSETax", null),
            new ResultLine("/additionalMedicareTax", "Additional Medicare Tax (Form 8959)"),
            new ResultLine("/planning/projectedAGI", "Projected AGI (Form 1040 Line 11)"),
            new ResultLine("/qbiDeduction", "QBI deduction (Form 8995)"),
            new ResultLine("/planning/taxableIncome", "Projected taxable income (Form 1040 Line 15)"),
            new ResultLine("/incomeTax/projectedIncomeTax", "Projected income tax (ordinary rates)"),
            new ResultLine("/planning/projectedCurrentYearTax", "Projected total federal tax"),
            new ResultLine("/planning/safeHarborTarget", null),
            new ResultLine("/planning/remainingPaymentDue", null),
            new ResultLine("/planning/projectedBalanceDueAtFiling", null),
            new ResultLine("/planning/nextQuarterlyPaymentSuggested", null));

    private final PlanningGraphService graph;
    private final TaxKnowledgeService taxKnowledge;
    private final CitationService citations;

    public PlanReportService(PlanningGraphService graph, TaxKnowledgeService taxKnowledge, CitationService citations) {
        this.graph = graph;
        this.taxKnowledge = taxKnowledge;
        this.citations = citations;
    }

    /** Build the sealed report with legal citations and plain-language explanations included. */
    public PlanReport generate(String sessionId) {
        return generate(sessionId, true);
    }

    /**
     * Build the sealed report for {@code sessionId}. When {@code includeCitations} is true, each
     * result names the authorities behind it, the parameter table shows formal citations, and a
     * plain-language "Sources" section is appended. Throws {@link IllegalArgumentException} if the
     * session is unknown/expired (surfaced verbatim to the agent so it can re-create the session).
     */
    public PlanReport generate(String sessionId, boolean includeCitations) {
        int taxYear = graph.taxYearOf(sessionId);
        List<TaxParameter> params = taxKnowledge.taxParametersForYear(taxYear);
        Set<String> paramPaths = new LinkedHashSet<>();
        for (TaxParameter p : params) {
            paramPaths.add(p.factPath());
        }

        // Inputs are the facts written into the session that are not injected year-parameters.
        Map<String, Object> sessionFacts = graph.sessionFacts(sessionId);
        List<String> inputPaths = new ArrayList<>();
        for (String path : sessionFacts.keySet()) {
            if (!paramPaths.contains(path)) {
                inputPaths.add(path);
            }
        }

        Map<String, String> sourceNotes = graph.sourceNotes(sessionId);
        String generatedAt = Instant.now().truncatedTo(ChronoUnit.SECONDS).toString();
        String body = renderBody(sessionId, taxYear, generatedAt, inputPaths, sourceNotes, params, includeCitations);
        String sha256 = sha256Hex(body);
        String markdown = body + INTEGRITY_DELIMITER + renderIntegrity(sha256);
        return new PlanReport(markdown, sha256, generatedAt, taxYear);
    }

    private String renderBody(
            String sessionId,
            int taxYear,
            String generatedAt,
            List<String> inputPaths,
            Map<String, String> sourceNotes,
            List<TaxParameter> params,
            boolean includeCitations) {
        StringBuilder sb = new StringBuilder();
        sb.append("# Self-Employment Tax Planning Summary — Tax Year ")
                .append(taxYear)
                .append(" (federal)\n\n");
        sb.append("Generated (UTC): ").append(generatedAt).append("\n\n");
        sb.append("> **This is a planning estimate, not a filed tax return.** The figures below are\n")
                .append("> based on values you provided. Those values are **self-reported and have not been\n")
                .append("> verified** against source documents (1099s, bank records, mileage logs); this\n")
                .append("> summary traces the arithmetic from your inputs, it does not confirm the inputs\n")
                .append("> are correct. Income tax here is an **ordinary-rate estimate** — it applies the\n")
                .append("> standard deduction, the §199A QBI deduction, and the regular tax brackets, and\n")
                .append("> includes self-employment tax and the Additional Medicare surtax, but it omits\n")
                .append("> tax credits, capital-gains/qualified-dividend rates, the NIIT, the AMT, itemized\n")
                .append("> deductions, and state tax. This document is generated on demand and is\n")
                .append("> **not stored by the service**; keep your own copy.\n\n");

        // Loudly flag any provisional (draft, unverified) constants so a year whose parameters are
        // not yet finalized (e.g. before the IRS/SSA publish the new rates) is never read as final.
        List<String> provisional = new ArrayList<>();
        for (TaxParameter p : params) {
            if (p.provisional()) {
                provisional.add(orPath(p.name(), p.factPath()));
            }
        }
        if (!provisional.isEmpty()) {
            sb.append("> ⚠ **Provisional values for ")
                    .append(taxYear)
                    .append(".** These constants are drafts pending official confirmation and may change: ")
                    .append(String.join(", ", provisional))
                    .append(". Any figure that depends on them is an estimate, not a final amount.\n\n");
        }

        sb.append("## Your inputs (self-reported, unverified)\n\n");
        if (inputPaths.isEmpty()) {
            sb.append("_No inputs were entered in this session._\n\n");
        } else {
            sb.append("| Item | Value | Source (as stated, unverified) |\n| --- | --- | --- |\n");
            for (String path : inputPaths) {
                ExplainResult e = graph.explain(sessionId, path);
                sb.append("| ")
                        .append(orPath(e.name(), path))
                        .append(CELL)
                        .append(formatValue(e.value()))
                        .append(CELL)
                        .append(blankToDash(sourceNotes.get(path)))
                        .append(" |\n");
            }
            sb.append("\n");
        }

        // Authorities cited anywhere below, in first-seen order, resolved in the Sources section.
        Set<String> citedSourceIds = new LinkedHashSet<>();

        sb.append("## Tax-year parameters used\n\n");
        sb.append("Statutory constants for ")
                .append(taxYear)
                .append(", sourced from the tax-knowledge base and injected at session creation.\n\n");
        String authorityHeader = includeCitations ? "Authority" : "IRS source";
        sb.append("| Parameter | Value | ").append(authorityHeader).append(" | Note |\n| --- | --- | --- | --- |\n");
        for (TaxParameter p : params) {
            String authorityCell;
            if (includeCitations) {
                authorityCell = citationText(p.sourceId());
                if (p.sourceId() != null) {
                    citedSourceIds.add(p.sourceId());
                }
            } else {
                authorityCell = blankToDash(p.sourceId());
            }
            String valueCell = p.provisional() ? formatParamValue(p) + " ⚠ provisional" : formatParamValue(p);
            sb.append("| ")
                    .append(orPath(p.name(), p.factPath()))
                    .append(CELL)
                    .append(valueCell)
                    .append(CELL)
                    .append(authorityCell)
                    .append(CELL)
                    .append(blankToDash(collapseWhitespace(p.note())))
                    .append(" |\n");
        }
        sb.append("\n");

        sb.append("## Results\n\n");
        int rendered = 0;
        for (ResultLine line : RESULT_LINES) {
            ExplainResult e = graph.explain(sessionId, line.path());
            if (!e.complete()) {
                continue;
            }
            rendered++;
            sb.append("- **")
                    .append(line.labelOverride() != null ? line.labelOverride() : orPath(e.name(), line.path()))
                    .append(": ")
                    .append(formatValue(e.value()))
                    .append("**\n");
            String derivation = renderDerivation(e.dependencies());
            if (!derivation.isEmpty()) {
                sb.append("  - computed from: ").append(derivation).append("\n");
            }
            if (includeCitations) {
                List<Citation> resultCitations = citations.citationsForFact(params, line.path());
                if (!resultCitations.isEmpty()) {
                    List<String> formal = new ArrayList<>();
                    for (Citation c : resultCitations) {
                        formal.add(c.citation());
                        citedSourceIds.add(c.sourceId());
                    }
                    sb.append("  - based on: ")
                            .append(String.join("; ", formal))
                            .append("\n");
                }
            }
        }
        if (rendered == 0) {
            sb.append("_No results have been computed yet — enter inputs via the planning tools first._\n");
        }

        if (includeCitations && !citedSourceIds.isEmpty()) {
            sb.append("\n").append(renderSources(citedSourceIds));
        }

        return sb.toString();
    }

    /**
     * Plain-language sources appendix: each cited authority once, with its formal citation, title,
     * a friendly explanation, and an official link. Turns the dry source ids above into something a
     * taxpayer can actually read.
     */
    private String renderSources(Set<String> sourceIds) {
        StringBuilder sb = new StringBuilder();
        sb.append("## Sources & plain-language\n\n");
        sb.append("The authorities behind the numbers above, in everyday terms.\n\n");
        for (String id : sourceIds) {
            Citation c = taxKnowledge.citation(id);
            if (c == null) {
                continue;
            }
            sb.append("- **").append(orPath(c.citation(), id)).append("**");
            if (c.title() != null && !c.title().isBlank()) {
                sb.append(" — ").append(c.title());
            }
            sb.append("\n");
            if (c.plainLanguage() != null && !c.plainLanguage().isBlank()) {
                sb.append("  - In plain terms: ").append(c.plainLanguage()).append("\n");
            }
            if (c.url() != null && !c.url().isBlank()) {
                sb.append("  - Read it: ").append(c.url()).append("\n");
            }
        }
        return sb.toString();
    }

    /** Formal citation for a source id, falling back to the raw id if it isn't in the registry. */
    private String citationText(String sourceId) {
        if (sourceId == null || sourceId.isBlank()) {
            return "—";
        }
        Citation c = taxKnowledge.citation(sourceId);
        return (c == null || c.citation() == null || c.citation().isBlank()) ? sourceId : c.citation();
    }

    /**
     * One-level derivation: each distinct computable dependency as "name = value". A fact built from
     * a multi-branch {@code Switch} lists the same dependency once per branch, so de-duplicate by
     * path (keeping first-seen order) to avoid repeating the inputs in the rendered line.
     */
    private static String renderDerivation(List<ExplainResult.Dep> deps) {
        Set<String> seen = new LinkedHashSet<>();
        List<String> parts = new ArrayList<>();
        for (ExplainResult.Dep dep : deps) {
            if (dep.complete() && seen.add(dep.path())) {
                parts.add(orPath(dep.name(), dep.path()) + " = " + formatValue(dep.value()));
            }
        }
        return String.join(", ", parts);
    }

    /** Tamper-evidence footer: the seal plus the exact procedure to re-verify it. */
    private static String renderIntegrity(String sha256) {
        return "SHA-256 of this document (every byte above the `---` that precedes this section): `"
                + sha256 + "`\n\n"
                + "To verify this report was not altered: delete everything from the `---` line just\n"
                + "above through the end of the document, then compute the SHA-256 of the remaining\n"
                + "UTF-8 text. It must equal the hash above. This is tamper-evidence, not a signature —\n"
                + "it shows the content is unchanged, not who produced it.\n";
    }

    private static String orPath(String name, String path) {
        return (name == null || name.isBlank()) ? path : name;
    }

    private static String blankToDash(String s) {
        return (s == null || s.isBlank()) ? "—" : s;
    }

    /** Collapse newlines/runs of whitespace to single spaces so folded-scalar notes stay on one table row. */
    private static String collapseWhitespace(String s) {
        return s == null ? null : s.strip().replaceAll("\\s+", " ");
    }

    /** Dollars/decimals render as currency; whole-number inputs (e.g. miles) as plain integers. */
    static String formatValue(Object value) {
        if (value == null) {
            return "—";
        }
        if (value instanceof BigDecimal bd) {
            return CURRENCY.format(bd);
        }
        if (value instanceof Boolean b) {
            return b ? "yes" : "no";
        }
        if (value instanceof Number n) {
            return n.toString();
        }
        return value.toString();
    }

    private static String formatParamValue(TaxParameter p) {
        String type = p.type() == null ? "" : p.type().toLowerCase(Locale.ROOT);
        String raw = p.value() == null ? "" : p.value().trim();
        if ("dollar".equals(type)) {
            try {
                return CURRENCY.format(new BigDecimal(raw));
            } catch (NumberFormatException ignored) {
                return raw;
            }
        }
        if ("rational".equals(type)) {
            int slash = raw.indexOf('/');
            if (slash > 0) {
                try {
                    BigDecimal num = new BigDecimal(raw.substring(0, slash).trim());
                    BigDecimal den = new BigDecimal(raw.substring(slash + 1).trim());
                    return num.divide(den, 6, RoundingMode.HALF_UP)
                            .stripTrailingZeros()
                            .toPlainString();
                } catch (NumberFormatException ignored) {
                    return raw;
                }
            }
        }
        return raw;
    }

    static String sha256Hex(String content) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(content.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(Character.forDigit((b >> 4) & 0xF, 16)).append(Character.forDigit(b & 0xF, 16));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is mandated by the JLS to be present on every JVM.
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private record ResultLine(String path, String labelOverride) {}

    public record PlanReport(String markdown, String sha256, String generatedAt, int taxYear) {}
}
