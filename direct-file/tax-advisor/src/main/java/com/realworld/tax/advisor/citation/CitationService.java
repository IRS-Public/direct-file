package com.realworld.tax.advisor.citation;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import com.realworld.tax.advisor.graph.PlanningGraphService;
import com.realworld.tax.advisor.knowledge.TaxKnowledgeService;
import com.realworld.tax.advisor.knowledge.TaxKnowledgeService.Citation;
import com.realworld.tax.advisor.knowledge.TaxKnowledgeService.TaxParameter;
import org.springframework.stereotype.Service;

/**
 * Attributes a computed result to the legal authorities behind it, derived from the actual
 * computation rather than a hand-maintained map. A result depends (transitively) on year-parameters,
 * and each parameter carries a {@code source_id}; the union of those source_ids — resolved through
 * the citation registry — is what governs the result. So self-employment tax automatically cites the
 * Schedule SE instructions and the SSA wage base because its value flows from those parameters.
 *
 * <p>This only surfaces authorities that are tied to a parameter. Purely structural arithmetic with
 * no statutory constant (e.g. halving a number) contributes no citation, which is the honest outcome.
 */
@Service
public class CitationService {

    private final PlanningGraphService graph;
    private final TaxKnowledgeService taxKnowledge;

    public CitationService(PlanningGraphService graph, TaxKnowledgeService taxKnowledge) {
        this.graph = graph;
        this.taxKnowledge = taxKnowledge;
    }

    /** Governing source_ids for a fact, loading the year's parameters first. */
    public List<String> sourceIdsForFact(int taxYear, String factPath) {
        return sourceIdsForFact(taxKnowledge.taxParametersForYear(taxYear), factPath);
    }

    /**
     * Governing source_ids for a fact, given the year's already-loaded parameters. The fact's own
     * path is included in the closure so that reading a parameter directly cites that parameter.
     * Order follows the parameter list (deterministic); duplicates are removed.
     */
    public List<String> sourceIdsForFact(List<TaxParameter> params, String factPath) {
        Set<String> closure = graph.dependencyClosure(factPath);
        closure.add(factPath);
        List<String> out = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        for (TaxParameter p : params) {
            if (closure.contains(p.factPath()) && p.sourceId() != null && seen.add(p.sourceId())) {
                out.add(p.sourceId());
            }
        }
        return out;
    }

    /** Resolved citations governing a fact (year overload). */
    public List<Citation> citationsForFact(int taxYear, String factPath) {
        return resolve(sourceIdsForFact(taxYear, factPath));
    }

    /** Resolved citations governing a fact (parameters supplied). */
    public List<Citation> citationsForFact(List<TaxParameter> params, String factPath) {
        return resolve(sourceIdsForFact(params, factPath));
    }

    /** Resolve source_ids to citations, dropping any id not present in the registry. */
    public List<Citation> resolve(Collection<String> sourceIds) {
        List<Citation> out = new ArrayList<>();
        for (String id : sourceIds) {
            Citation c = taxKnowledge.citation(id);
            if (c != null) {
                out.add(c);
            }
        }
        return out;
    }
}
