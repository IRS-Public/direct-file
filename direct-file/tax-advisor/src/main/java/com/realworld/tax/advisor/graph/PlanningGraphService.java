package com.realworld.tax.advisor.graph;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.realworld.tax.advisor.config.TaxAdvisorProperties;
import com.realworld.tax.advisor.knowledge.TaxKnowledgeService;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import gov.irs.factgraph.FactDictionary;
import gov.irs.factgraph.Graph;
import gov.irs.factgraph.monads.Result;
import gov.irs.factgraph.persisters.InMemoryPersister;

import gov.irs.directfile.api.loaders.domain.TaxCompNode;
import gov.irs.directfile.api.loaders.domain.TaxDictionaryDigest;
import gov.irs.directfile.api.loaders.domain.TaxFact;
import gov.irs.directfile.api.loaders.processor.FactGraphLoader;
import gov.irs.directfile.api.loaders.processor.XmlProcessor;
import gov.irs.directfile.models.FactTypeWithItem;

/**
 * Loads the combined fact dictionary (production tax/ XMLs + planning tax-plan/ XMLs)
 * once at startup, then hands out per-session {@link Graph} instances backed by an
 * in-memory persister.
 *
 * <p>Each planning conversation gets its own session id and its own persister state.
 * Nothing is written to durable storage in this MVP — planning data lives only in
 * memory for the duration of the conversation. That keeps the FTI surface tiny and
 * lets the agent operate freely on what-if scenarios.
 */
@Service
public class PlanningGraphService {
    private static final Logger log = LoggerFactory.getLogger(PlanningGraphService.class);

    private static final String DOLLAR_WRAPPER = "gov.irs.factgraph.persisters.DollarWrapper";
    private static final String INT_WRAPPER = "gov.irs.factgraph.persisters.IntWrapper";
    private static final String RATIONAL_WRAPPER = "gov.irs.factgraph.persisters.RationalWrapper";

    private final ApplicationContext applicationContext;
    private final ObjectMapper objectMapper;
    private final TaxAdvisorProperties properties;
    private final TaxKnowledgeService taxKnowledge;

    private FactDictionary dictionary;
    private TaxDictionaryDigest digest;

    private final Map<String, SessionState> sessions = new ConcurrentHashMap<>();

    public PlanningGraphService(
            ApplicationContext applicationContext,
            ObjectMapper objectMapper,
            TaxAdvisorProperties properties,
            TaxKnowledgeService taxKnowledge) {
        this.applicationContext = applicationContext;
        this.objectMapper = objectMapper;
        this.properties = properties;
        this.taxKnowledge = taxKnowledge;
    }

    @PostConstruct
    void load() throws IOException {
        List<Resource> all = new ArrayList<>();
        for (String pattern : properties.factXmlPatterns()) {
            Resource[] matched = applicationContext.getResources(pattern);
            log.info("Pattern {} matched {} fact XML resources", pattern, matched.length);
            for (Resource r : matched) {
                all.add(r);
            }
        }
        if (all.isEmpty()) {
            throw new IllegalStateException("No fact XML resources found for patterns " + properties.factXmlPatterns());
        }

        this.digest = new XmlProcessor().process("combined", all.toArray(new Resource[0]));
        this.dictionary = new FactGraphLoader().createFactDictionary(digest);
        log.info(
                "Planning fact dictionary loaded: {} facts across {} patterns",
                digest.getFacts().size(),
                properties.factXmlPatterns().size());
    }

    /** Filing statuses recognized for status-scoped parameters (e.g. filing-status thresholds). */
    private static final Set<String> FILING_STATUSES = Set.of("single", "mfj", "mfs");

    /**
     * Optional dollar inputs initialized to 0 at session creation so the derived income-tax / total-tax
     * chain is computable for a pure self-employed filer with no other income. Each is overwritten when
     * the agent supplies a real value (see createSession).
     */
    private static final List<String> INCOME_ZERO_DEFAULTS = List.of(
            "/planning/otherTaxableIncome",
            "/planning/netCapitalGains",
            "/seSocialSecurityWagesFromW2",
            "/medicareWagesFromW2");

    /** Create a session for the given year, defaulting to the {@code single} filing status. */
    public String createSession(int taxYear) {
        return createSession(taxYear, "single");
    }

    public String createSession(int taxYear, String filingStatus) {
        String status = filingStatus == null || filingStatus.isBlank()
                ? "single"
                : filingStatus.trim().toLowerCase();
        if (!FILING_STATUSES.contains(status)) {
            throw new IllegalArgumentException("Unknown filing status '" + filingStatus + "'. Use one of "
                    + FILING_STATUSES + " (head-of-household / qualifying surviving spouse share the 'single'"
                    + " thresholds for these provisions).");
        }
        // Resolve the year's tax parameters first — this throws if the year has no published
        // parameters, so we never create a session that silently uses another year's values.
        List<TaxKnowledgeService.TaxParameter> params = taxKnowledge.taxParametersForYear(taxYear);
        String id = java.util.UUID.randomUUID().toString();
        sessions.put(id, new SessionState(taxYear, status, new LinkedHashMap<>(), new LinkedHashMap<>()));
        // Inject the year-indexed constants so SE-tax and safe-harbor math use the right year's values.
        // The fact-graph value type drives the persister wrapper and how the string is shaped:
        // int -> a JSON number; rational -> the "n/d" string; dollar (default) -> the string as-is.
        for (TaxKnowledgeService.TaxParameter p : params) {
            // Status-scoped parameters (e.g. the Additional Medicare threshold) are injected only into
            // a session whose filing status matches; status-agnostic parameters (filingStatus == null)
            // always inject.
            if (p.filingStatus() != null
                    && !status.equalsIgnoreCase(p.filingStatus().trim())) {
                continue;
            }
            String typeCode;
            Object value;
            switch (p.type() == null ? "dollar" : p.type().toLowerCase()) {
                case "int" -> {
                    typeCode = INT_WRAPPER;
                    value = Long.parseLong(p.value().trim());
                }
                case "rational" -> {
                    typeCode = RATIONAL_WRAPPER;
                    // The Rational persister serializes as {"n":<numerator>,"d":<denominator>};
                    // parameters are authored in the readable "n/d" form, so split here.
                    String[] nd = p.value().trim().split("/", 2);
                    if (nd.length != 2) {
                        throw new IllegalArgumentException(
                                "Rational parameter " + p.factPath() + " must be 'n/d', got: " + p.value());
                    }
                    value = Map.of("n", Integer.parseInt(nd[0].trim()), "d", Integer.parseInt(nd[1].trim()));
                }
                default -> {
                    typeCode = DOLLAR_WRAPPER;
                    value = p.value();
                }
            }
            writeFact(id, p.factPath(), typeCode, value);
        }
        // Zero-default the optional income inputs so the derived income-tax / total-tax chain is
        // computable from just the Schedule C inputs (the pure-gig case). Each is overwritten when
        // the agent supplies a real value: otherTaxableIncome via project_total_tax, netCapitalGains
        // via estimate_qbi_deduction, and the W-2 wage facts via calculate_se_tax /
        // calculate_additional_medicare. Without these defaults projectedAGI (hence total tax) would
        // stay incomplete until every optional input was set by hand.
        for (String zeroDefault : INCOME_ZERO_DEFAULTS) {
            writeFact(id, zeroDefault, DOLLAR_WRAPPER, "0");
        }
        return id;
    }

    /**
     * Create a new session for the same tax year but a different filing status, copying the source
     * session's INPUT facts. The injected year/filing-status parameters (standard deduction, brackets,
     * QBI and Additional Medicare thresholds, rates, …) are deliberately NOT copied — the new session
     * re-injects the rows for its own status. Used by compare_filing_statuses to project identical
     * income across statuses without the agent re-entering anything. Returns the new session id.
     */
    public String cloneSessionWithFilingStatus(String sourceSessionId, String filingStatus) {
        int year = taxYearOf(sourceSessionId);
        Set<String> paramPaths = new LinkedHashSet<>();
        for (TaxKnowledgeService.TaxParameter p : taxKnowledge.taxParametersForYear(year)) {
            paramPaths.add(p.factPath());
        }
        SessionState src = require(sourceSessionId);
        // The new session is freshly created and not yet shared with any other thread, so only the
        // source needs locking while we read its facts.
        String newSid = createSession(year, filingStatus);
        SessionState dst = require(newSid);
        synchronized (src) {
            src.facts.forEach((path, fact) -> {
                // FactTypeWithItem is effectively immutable (a typeCode + a JsonNode we never mutate),
                // so sharing the reference between sessions is safe.
                if (!paramPaths.contains(path)) {
                    dst.facts.put(path, fact);
                }
            });
        }
        return newSid;
    }

    /** Discard an in-memory session — e.g. the throwaway sessions a filing-status comparison spins up. */
    public void discardSession(String sessionId) {
        sessions.remove(sessionId);
    }

    public int taxYearOf(String sessionId) {
        return require(sessionId).taxYear();
    }

    public String filingStatusOf(String sessionId) {
        return require(sessionId).filingStatus();
    }

    public Graph graphFor(String sessionId) {
        SessionState state = require(sessionId);
        // Serialize under the session lock: building the graph iterates the facts map, and a
        // concurrent writeFact mutating it would corrupt serialization. Holding the lock here (and in
        // writeFact) is what prevents the transient "failed to build graph" faults under concurrent
        // tool calls on the same session.
        synchronized (state) {
            try {
                String json = objectMapper.writeValueAsString(state.facts);
                return new Graph(dictionary, InMemoryPersister.apply(json));
            } catch (Exception e) {
                // Log the underlying cause (and fact paths, not values) so build failures are
                // diagnosable; the cause was previously swallowed behind the generic message.
                log.error(
                        "Failed to build fact graph for session {} (fact paths: {})",
                        sessionId,
                        state.facts.keySet(),
                        e);
                // Distinct from an expired/unknown session (which require() reports): the session
                // exists, but its current facts could not be assembled into a graph — usually the
                // most recent write was malformed for its declared type.
                throw new IllegalStateException(
                        "Internal error building the fact graph for session " + sessionId
                                + " — the session still exists (this is not an expiry). The most recent fact write"
                                + " may be malformed for its type; re-check the last set_fact, or recreate the"
                                + " session if this persists.",
                        e);
            }
        }
    }

    /**
     * Write a fact to a session. {@code typeCode} is the persister type tag
     * (e.g. "gov.irs.factgraph.persisters.DollarWrapper",
     * "gov.irs.factgraph.persisters.BooleanWrapper"). {@code rawValue} is shaped to match.
     */
    public WriteResult writeFact(String sessionId, String path, String typeCode, Object rawValue) {
        SessionState state = require(sessionId);
        // The put and the subsequent graph build/save must be atomic w.r.t. other writers on this
        // session; graphFor re-acquires the same (reentrant) lock.
        synchronized (state) {
            // Snapshot the prior mapping so a write that the graph can't assemble (e.g. an invalid
            // persister typeCode, which makes the fact-graph's upickle abort) can be rolled back.
            // Without this, the bad entry lingers in state.facts and every later graphFor() for this
            // session fails too — one malformed set_fact would poison the whole session.
            FactTypeWithItem previous =
                    state.facts.put(path, new FactTypeWithItem(typeCode, objectMapper.valueToTree(rawValue)));
            try {
                Graph g = graphFor(sessionId);
                var saveResult = g.save();
                boolean ok = (boolean) saveResult._1();
                return new WriteResult(ok, ok ? List.of() : List.of("Save reported limit violation for " + path));
            } catch (RuntimeException e) {
                if (previous == null) {
                    state.facts.remove(path);
                } else {
                    state.facts.put(path, previous);
                }
                throw e;
            }
        }
    }

    public ReadResult readFact(String sessionId, String path) {
        Graph g = graphFor(sessionId);
        try {
            Result<Object> r = g.get(path);
            if (!r.hasValue() || !r.complete()) {
                String note = digest.getFacts().containsKey(path)
                        ? "Fact is known but not yet computable — depends on missing writable facts."
                        : "Unknown fact path.";
                return new ReadResult(path, null, null, false, note);
            }
            String typeName = r.typeName() == null ? null : r.typeName().trim();
            return new ReadResult(path, scalarize(r.get()), typeName, true, null);
        } catch (UnsupportedOperationException e) {
            return new ReadResult(path, null, null, false, "Unknown fact path: " + path);
        }
    }

    /**
     * Read a fact and coerce it to a plain {@link BigDecimal}, whatever its underlying type. Dollars
     * and ints convert directly; a {@code Rational} (which {@link #readFact} returns as the engine's
     * own type, rendering as "n/d") is divided out so numeric consumers — tool JSON payloads, tests —
     * get a clean number instead of an engine object. Returns {@code null} if the fact is not
     * computable. Note: the report deliberately still shows rationals as "n/d" via {@code readFact}.
     */
    public BigDecimal readDecimal(String sessionId, String path) {
        return toDecimal(readFact(sessionId, path).value());
    }

    private static BigDecimal toDecimal(Object v) {
        if (v == null) {
            return null;
        }
        if (v instanceof BigDecimal bd) {
            return bd;
        }
        if (v instanceof Number n) {
            return new BigDecimal(n.toString());
        }
        String s = v.toString().trim();
        int slash = s.indexOf('/');
        if (slash > 0) {
            BigDecimal num = new BigDecimal(s.substring(0, slash).trim());
            BigDecimal den = new BigDecimal(s.substring(slash + 1).trim());
            BigDecimal quotient = num.divide(den, 10, RoundingMode.HALF_UP).stripTrailingZeros();
            return new BigDecimal(quotient.toPlainString());
        }
        return new BigDecimal(s);
    }

    public Map<String, Object> sessionFacts(String sessionId) {
        SessionState state = require(sessionId);
        Map<String, Object> out = new LinkedHashMap<>();
        synchronized (state) {
            state.facts.forEach((path, fact) -> out.put(path, scalarizePersistedItem(fact)));
        }
        return out;
    }

    /**
     * Record a taxpayer-stated provenance note for a fact (e.g. "2024 1099-NEC, Uber"). This is
     * metadata only — it is never written into the fact graph and never verified; it is surfaced
     * in the export report as self-reported provenance. Blank notes are ignored.
     */
    public void setSourceNote(String sessionId, String path, String note) {
        if (note == null || note.isBlank()) {
            return;
        }
        SessionState state = require(sessionId);
        synchronized (state) {
            state.sourceNotes().put(path, note.trim());
        }
    }

    /** Taxpayer-stated provenance notes by fact path (see {@link #setSourceNote}). */
    public Map<String, String> sourceNotes(String sessionId) {
        SessionState state = require(sessionId);
        synchronized (state) {
            return new LinkedHashMap<>(state.sourceNotes());
        }
    }

    /**
     * One-level explanation: name + description + direct dependency paths and their
     * current resolved values. A full recursive walker is a trivial follow-up;
     * one level is already enough to power useful "why is this what it is?" answers.
     */
    public ExplainResult explain(String sessionId, String path) {
        TaxFact fact = digest.getFacts().get(path);
        if (fact == null) {
            return new ExplainResult(path, null, null, null, false, List.of());
        }
        ReadResult value = readFact(sessionId, path);

        List<String> depPaths = new ArrayList<>();
        collectDependencyPaths(fact.derived(), depPaths);
        collectDependencyPaths(fact.placeholder(), depPaths);

        List<ExplainResult.Dep> deps = new ArrayList<>();
        for (String dep : depPaths) {
            ReadResult dv = readFact(sessionId, dep);
            TaxFact df = digest.getFacts().get(dep);
            deps.add(new ExplainResult.Dep(
                    dep,
                    df == null ? null : df.name(),
                    df == null ? null : df.description(),
                    dv.value(),
                    dv.complete()));
        }
        return new ExplainResult(path, fact.name(), fact.description(), value.value(), value.complete(), deps);
    }

    /**
     * Transitive set of fact paths that {@code path} depends on (directly or indirectly), walking
     * {@code Dependency} nodes through the dictionary. Used to attribute a computed result to the
     * authorities behind the parameters in its computation. Excludes {@code path} itself and bottoms
     * out at writable facts (inputs and injected parameters), which have no derivation to recurse into.
     */
    public Set<String> dependencyClosure(String path) {
        Set<String> visited = new LinkedHashSet<>();
        TaxFact start = digest.getFacts().get(path);
        if (start == null) {
            return visited;
        }
        Deque<String> stack = new ArrayDeque<>();
        collectDirectDependencies(start, stack);
        while (!stack.isEmpty()) {
            String p = stack.pop();
            if (!visited.add(p)) {
                continue;
            }
            TaxFact f = digest.getFacts().get(p);
            if (f != null) {
                collectDirectDependencies(f, stack);
            }
        }
        return visited;
    }

    private void collectDirectDependencies(TaxFact fact, Deque<String> out) {
        List<String> direct = new ArrayList<>();
        collectDependencyPaths(fact.derived(), direct);
        collectDependencyPaths(fact.placeholder(), direct);
        out.addAll(direct);
    }

    private void collectDependencyPaths(TaxCompNode node, List<String> out) {
        if (node == null) {
            return;
        }
        if ("Dependency".equals(node.typeName())) {
            String p = node.options().get("path");
            if (p != null) {
                out.add(p);
            }
        }
        for (TaxCompNode child : node.children()) {
            collectDependencyPaths(child, out);
        }
    }

    public Map<String, String> writableFactCatalog() {
        Map<String, String> out = new HashMap<>();
        digest.getFacts().forEach((path, fact) -> {
            if (fact.writable() != null) {
                out.put(path, fact.name() == null ? fact.description() : fact.name());
            }
        });
        return out;
    }

    /** Coerce Scala types into JSON-friendly Java values for tool responses. */
    private Object scalarize(Object v) {
        if (v == null) {
            return null;
        }
        if (v instanceof scala.math.BigDecimal bd) {
            return bd.bigDecimal();
        }
        return v;
    }

    private Object scalarizePersistedItem(FactTypeWithItem fact) {
        if (fact == null || fact.item() == null || fact.item().isNull()) {
            return null;
        }
        var item = fact.item();
        if (item.isBoolean()) {
            return item.asBoolean();
        }
        if (item.isInt() || item.isLong()) {
            return item.asLong();
        }
        if (item.isFloat() || item.isDouble() || item.isBigDecimal()) {
            return item.decimalValue();
        }
        if (item.isTextual()) {
            return item.asText();
        }
        return objectMapper.convertValue(item, Object.class);
    }

    private SessionState require(String id) {
        SessionState s = sessions.get(id);
        if (s == null) {
            throw new IllegalArgumentException("Unknown or expired planning session: " + id
                    + ". Sessions are held in memory and are lost when the service restarts; "
                    + "call create_session to start a new one, then re-enter the facts.");
        }
        return s;
    }

    private record SessionState(
            int taxYear,
            String filingStatus,
            LinkedHashMap<String, FactTypeWithItem> facts,
            LinkedHashMap<String, String> sourceNotes) {}

    public record WriteResult(boolean ok, List<String> violations) {}

    // ReadResult/ExplainResult are returned by the get_fact/explain MCP tools, which publish an MCP
    // outputSchema (via @McpTool generateOutputSchema). The schema generator marks every String field
    // `required: string`, so a null string makes the result fail output-schema validation. Normalize
    // the descriptive strings to "" here (null `value` stays null — it maps to a permissive `{}`
    // schema). path is always supplied non-null by callers.
    public record ReadResult(String path, Object value, String typeName, boolean complete, String note) {
        public ReadResult {
            typeName = typeName == null ? "" : typeName;
            note = note == null ? "" : note;
        }
    }

    public record ExplainResult(
            String path, String name, String description, Object value, boolean complete, List<Dep> dependencies) {
        public ExplainResult {
            name = name == null ? "" : name;
            description = description == null ? "" : description;
            dependencies = dependencies == null ? List.of() : dependencies;
        }

        public record Dep(String path, String name, String description, Object value, boolean complete) {
            public Dep {
                name = name == null ? "" : name;
                description = description == null ? "" : description;
            }
        }
    }
}
