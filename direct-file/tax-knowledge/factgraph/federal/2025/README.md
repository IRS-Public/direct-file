# Federal 2025 FactGraph Draft Artifacts

This directory is for source-backed fact graph work items generated from reviewed IRS source chunks.

Generated artifacts must cite `source_refs` with `source_id`, `chunk_id`, `pages`, and `text_sha256`.
Draft XML is not runtime-approved until tax and engineering reviewers approve the cited interpretation,
fact paths, generated scenarios, and regression results.

Expected runtime targets include:

- `backend/src/main/resources/tax/*.xml`
- `tax-advisor/src/main/resources/tax-plan/*.xml`
- the derived index `backend/src/main/resources/factgraphservice/xmlFactPaths`

Use `runtime-resources/direct-file-resource-map.yaml` to decide whether a target is directly source-dependent,
indirectly tax-dependent, derived, platform-only, or outside the corpus generation path.
