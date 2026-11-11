# IRS 2025 Prototype Pipeline Run

Run date: 2026-05-26
Updated: 2026-05-27 to include reviewed carry-forward Pub. 538.

Scope: seed federal individual-income publication list in `corpora/irs-2025/publication-products.txt`.

## Executed Stages

1. IRS PDF ingestion
   - Requested seed products: 27
   - Matched and downloaded: 23
   - IRS directory pages scanned: 63
   - Download output size: 38 MB
   - Carry-forward publication included: `p538` (`0122 Publ 538 (PDF)`)
   - Missing from this 2025 publication run: `p505`, `p535`, `p536`, `p926`

2. PDF text extraction
   - Extracted text files: 23
   - Output size: 6.7 MB
   - PDFBox reported font Unicode warnings on some PDFs; this is a candidate for the vision/OCR comparison stage.

3. Source segmentation
   - Generated source YAML files: 23
   - Known citation chunks: 1,181
   - Output size: 6.8 MB

4. Relevance classification
   - Generated relevance records: 2,463
   - Output: `relevance/federal/2025/source-relevance.yaml`

   Topic counts:
   - `credits_and_deductions`: 803
   - `w2_income`: 309
   - `retirement_income`: 304
   - `dependents`: 294
   - `self_employment`: 223
   - `investment_income`: 209
   - `filing_status`: 208
   - `social_security`: 70
   - `digital_assets`: 43

5. Fact graph work item generation
   - Generated work items: 1
   - Output: `factgraph/federal/2025/generated-factgraph-work-items.yaml`
   - Rule covered: `se_standard_mileage_vehicle_deduction_ty2025`
   - Selected source refs are now weighted toward the rule's declared source products: `p334` and `p463`
   - Runtime targets identified:
     - `backend/src/main/resources/tax/*.xml`
     - `tax-advisor/src/main/resources/tax-plan/*.xml`
     - `backend/src/main/resources/factgraphservice/xmlFactPaths`

6. Provenance validation
   - Files checked: 7
   - Errors: 0
   - Warnings: 5 draft artifacts still use high-level `source_ids` without exact `source_refs`.

## Generated Outputs

- `corpora/irs-2025/pdf-manifest.json`
- `corpora/irs-2025/downloads/*.pdf`
- `corpora/irs-2025/text/*.txt`
- `sources/irs/2025/*.yaml`
- `relevance/federal/2025/source-relevance.yaml`
- `factgraph/federal/2025/generated-factgraph-work-items.yaml`

Raw PDFs and extracted text are local pipeline products and should remain outside normal source review unless intentionally promoted.

## Interpretation

This run proves the pipeline can now move from IRS PDFs to source chunks, relevance records, and source-backed fact graph work items.

The generated fact graph work item is not runtime XML yet. It is the review packet that should precede runtime XML generation. The next generator should turn approved work items into draft XML patches and then regenerate `factgraphservice/xmlFactPaths`.
