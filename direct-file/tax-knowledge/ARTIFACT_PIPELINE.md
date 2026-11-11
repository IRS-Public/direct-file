# Artifact Production Pipeline

This pipeline describes how agents and tax domain specialists turn IRS and state source documents into backend-ready artifacts.

The core architecture is:

```text
authoritative corpus
  -> extraction and extraction QA
  -> stable source chunks
  -> relevance classification
  -> source-backed artifact drafts
  -> human review and provenance validation
  -> approved runtime packages
```

The corpus should be broad enough to cover the tax-preparation domain. Generated runtime behavior should be narrow, cited, reviewed, and compiled only from approved artifacts.

## 1. Source Corpus Ingestion

The `tax-research-agent` creates a source catalog from official agency pages, PDFs, HTML instructions, schemas, business rules, release memos, and file inventories.

Output:
- `corpora/<agency>-<tax-year>/source-catalog.yaml`
- `corpora/<agency>-<tax-year>/pdf-manifest.json`
- downloaded source PDFs under `corpora/<agency>-<tax-year>/downloads/`

Automation:
- Run `tools/download_irs_pdfs.py` against the IRS static PDF directory.
- Start with a reviewed product list for the target domain, then expand intentionally.
- Store PDF hashes in the manifest so downstream segmentation can detect source changes.
- For full federal coverage, use broad corpus mode from `corpora/irs-2025/corpus-scope.yaml`; for prototype iteration, use the reviewed individual-income seed list.

Human check:
- Tax specialist verifies the legal source set is authoritative and complete for the intended domain.
- Engineering owner verifies that implementation sources, such as MeF schemas and business rules, match the active runtime filing target.
- Tax specialist reviews missing or unexpected publication revisions before segmentation begins.

## 2. Extraction QA

The `document-understanding-agent` verifies that source extraction is good enough for downstream citation and rule drafting.

Output:
- `corpora/<agency>-<tax-year>/extraction-comparison.json`

Automation:
- Use PDFBox text extraction as the primary deterministic extraction.
- When PDF text is weak, use a vision/OCR model out-of-band to produce page-marked text with the same `IRS_SOURCE_PAGE` markers.
- Run `tools/compare_extractions.py` to compare PDFBox text against the vision/OCR extraction and flag pages for review.

Human check:
- Reviewer inspects low-similarity pages before they can become source chunks for approved artifacts.
- If both extraction methods disagree, source chunks remain draft-only until manually corrected.

## 3. Source Segmentation

The `tax-research-agent` and `document-understanding-agent` split source documents into stable citation chunks.

Output:
- `corpora/<agency>-<tax-year>/text/*.txt`
- `sources/<agency>/<tax-year>/*.yaml`

Automation:
- Run `utils/pdf-to-yaml` `PdfToSourceText` to extract page-marked text from downloaded PDFs.
- Run `tools/segment_irs_sources.py` to create stable chunks with source URL, page numbers, PDF hash, text hash, and source IDs.

Human check:
- Tax specialist confirms chunks preserve context and do not overstate source language.
- Reviewer verifies that chunk page ranges and headings are usable as citations.

## 4. Relevance Classification

The `tax-research-agent` and `rule-modeling-agent` classify chunks by tax topic, artifact target, jurisdiction, taxpayer type, and fact graph impact.

Output:
- `relevance/<jurisdiction>/<tax-year>/source-relevance.yaml`

Automation:
- Run `tools/classify_source_chunks.py` with reviewed classification rules.
- Agents may refine classifications, but each classification remains draft until reviewed.

Human check:
- Domain owner confirms chunks classified as fact graph, validation, interview, evidence, PDF config, scenario, or explanation inputs.
- Irrelevant chunks are retained in the corpus but excluded from generation.

## 5. Runtime Resource Target Mapping

The `release-agent` and tax platform engineer classify checked-in runtime resources by source dependency and generation feasibility.

Output:
- `runtime-resources/direct-file-resource-map.yaml`
- `RUNTIME_RESOURCE_DEPENDENCY_MAP.md`

Automation:
- Inventory `backend/src/main/resources` and `tax-advisor/src/main/resources`.
- Mark each resource group as direct IRS-corpus dependent, indirectly tax-dependent, derived, platform-only, or non-tax infrastructure.

Human check:
- Engineering owner confirms which runtime files are generation targets.
- Tax owner confirms source-dependent resource groups are covered by the authoritative corpus.
- Product owner confirms unsupported-scope artifacts and blockers are not treated as pure tax-law derivations.

## 6. Concept And Topic Modeling

The `rule-modeling-agent` proposes tax topics, gateway facts, opened facts, and affected forms.

Output:
- `topics/<jurisdiction>/<tax-year>/*.yaml`

Human check:
- Domain owner approves topic boundaries and branch applicability.

## 7. Rule Drafting

The `rule-modeling-agent` drafts rule models from reviewed source chunks and expert requirements.

Output:
- `rules/<jurisdiction>/<tax-year>/*.yaml`

Human check:
- Tax expert approves interpretation.
- Engineer approves type, fact path, and compiler/runtime feasibility.

## 8. FactGraph Artifact Drafting

The `rule-modeling-agent` and `release-agent` draft fact graph XML, validation XML, and scenario tests from reviewed source chunks and approved rule models.

Output:
- `factgraph/<jurisdiction>/<tax-year>/*.yaml`
- draft patches for `backend/src/main/resources/tax/*.xml`
- draft patches for `tax-advisor/src/main/resources/tax-plan/*.xml`
- regenerated draft `backend/src/main/resources/factgraphservice/xmlFactPaths`

Automation:
- Generate fact graph work items from rules with `source_refs`, fact paths, expected outputs, and scenario coverage.
- Validate provenance with `tools/validate_artifact_provenance.py`.
- Validate draft XML against `backend/src/main/resources/tax/FactDictionaryModule.rng`.
- Regenerate fact path indexes from approved XML.

Human check:
- Tax expert approves source interpretation.
- Engineer approves fact path design, data types, graph dependencies, and generated tests.
- MeF/export engineer approves export and e-file validation changes.
- No fact graph artifact can be approved without exact `source_refs`.

## 9. PDF Configuration Drafting

The `document-understanding-agent` and `release-agent` draft PDF field-to-fact mappings for generated filing PDFs.

Output:
- draft patches for `backend/src/main/resources/pdf/<tax-year>/<form>/<language>/configuration.yml`
- PDF field mapping review packets

Automation:
- Extract fillable PDF field names and page text from IRS form PDFs.
- Match field labels, line numbers, and approved fact paths.
- Use vision/OCR extraction as a sanity check when PDF metadata or text extraction is weak.

Human check:
- Forms/PDF engineer verifies field paths and generated output.
- Tax specialist verifies line-to-fact semantics.
- Bilingual content reviewer verifies non-English configurations.

## 10. Interview Authoring

The `procedure-interview-agent` drafts gateway and detail questions with `asks_when` and `skip_when` gates.

Output:
- `questions/<jurisdiction>/<tax-year>/*.yaml`

Human check:
- Content designer approves wording.
- Tax expert approves applicability.

## 11. Evidence Mapping

The `document-understanding-agent` maps documents and imported data to topic signals and candidate facts.

Output:
- `evidence/<jurisdiction>/<tax-year>/*.yaml`

Human check:
- Tax expert confirms evidence is sufficient only as a signal unless explicitly allowed as a fact source.

## 12. Conflict Rules

The `reviewer-agent` and `scenario-test-agent` draft contradictions between documents, profile, answers, and facts.

Output:
- `conflicts/<jurisdiction>/<tax-year>/*.yaml`

Human check:
- Tax expert and product owner approve severity and user-facing resolution.

## 13. Scenario Generation

The `scenario-test-agent` drafts ordinary, boundary, negative, and adversarial scenarios.

Output:
- `scenarios/<jurisdiction>/<tax-year>/*.yaml`

Human check:
- Tax expert approves expected outcomes.
- Engineer wires scenarios into automated tests.

## 14. Review And Release

The `reviewer-agent` checks citations, dependencies, missing tests, unsafe AI behavior, and contradictions. The `release-agent` packages approved artifacts.

Output:
- `reviews/<jurisdiction>/<tax-year>/*.md`
- approved implementation patches for source-dependent runtime artifacts
- regenerated derived indexes

Human check:
- Tax owner, compliance reviewer, product/content owner, and engineering owner approve before runtime use.
- Provenance validator has zero errors for reviewed or approved artifacts.
