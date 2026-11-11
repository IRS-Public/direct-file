#!/usr/bin/env python3
"""Generate draft fact graph work items from rules and classified source chunks.

This is intentionally conservative. It does not write runtime XML. It creates
source-backed work items that tax and engineering reviewers can use to approve
or reject generated XML patches later.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import pathlib
import re
import sys
from dataclasses import dataclass
from typing import Any

from classify_source_chunks import parse_source_chunks, render_mapping


CONFIDENCE_SCORE = {"high": 4, "medium": 2, "low": 1}
KEYWORD_STOPWORDS = {
    "and",
    "for",
    "from",
    "irs",
    "line",
    "rule",
    "the",
    "this",
    "with",
}


@dataclass(frozen=True)
class RuleModel:
    rule_id: str
    tax_year: int
    jurisdiction: str
    status: str
    rule_type: str | None
    topic_id: str
    source_ids: list[str]
    inputs: list[str]
    output: str | None
    logic_summary: str | None
    logic_expression: str | None
    scenario_ids: list[str]
    notes: list[str]


@dataclass(frozen=True)
class RelevanceEntry:
    relevance_id: str
    source_ref: dict[str, Any]
    topic_ids: list[str]
    artifact_targets: list[str]
    confidence: str
    matched_terms: list[str]
    owner: str | None
    status: str


def unquote(value: str) -> str:
    value = value.strip()
    if value == "null":
        return ""
    if len(value) >= 2 and value[0] == '"' and value[-1] == '"':
        return value[1:-1].replace('\\"', '"').replace("\\\\", "\\")
    return value


def top_level_value(text: str, key: str, default: str = "") -> str:
    match = re.search(rf"^{re.escape(key)}:\s*(.+?)\s*$", text, re.MULTILINE)
    return unquote(match.group(1)) if match else default


def top_level_list(text: str, key: str) -> list[str]:
    match = re.search(rf"^{re.escape(key)}:\s*\n(?P<body>(?:  - .+\n)+)", text, re.MULTILINE)
    if not match:
        return []
    return [unquote(line.strip()[2:]) for line in match.group("body").splitlines() if line.strip().startswith("- ")]


def nested_value(text: str, parent: str, key: str) -> str | None:
    match = re.search(
        rf"^\s*{re.escape(parent)}:\s*\n(?P<body>(?:\s{{2,}}.+\n)+)",
        text,
        re.MULTILINE,
    )
    if not match:
        return None
    value_match = re.search(rf"^\s+{re.escape(key)}:\s*(.+?)\s*$", match.group("body"), re.MULTILINE)
    return unquote(value_match.group(1)) if value_match else None


def parse_rule_file(path: pathlib.Path) -> RuleModel:
    text = path.read_text(encoding="utf-8")
    tax_year = int(top_level_value(text, "tax_year", "0") or "0")
    return RuleModel(
        rule_id=top_level_value(text, "rule_id", path.stem),
        tax_year=tax_year,
        jurisdiction=top_level_value(text, "jurisdiction", "federal"),
        status=top_level_value(text, "status", "draft"),
        rule_type=top_level_value(text, "rule_type", "") or None,
        topic_id=top_level_value(text, "topic_id", ""),
        source_ids=top_level_list(text, "source_ids"),
        inputs=top_level_list(text, "inputs"),
        output=top_level_value(text, "output", "") or None,
        logic_summary=nested_value(text, "logic", "summary"),
        logic_expression=nested_value(text, "logic", "expression"),
        scenario_ids=top_level_list(text, "scenario_ids"),
        notes=top_level_list(text, "notes"),
    )


def parse_rules(rules_dir: pathlib.Path) -> list[RuleModel]:
    return [parse_rule_file(path) for path in sorted(rules_dir.glob("*.yaml"))]


def parse_relevance(path: pathlib.Path) -> list[RelevanceEntry]:
    entries: list[RelevanceEntry] = []
    current: dict[str, Any] | None = None
    section: str | None = None

    def finish() -> None:
        nonlocal current
        if not current:
            return
        entries.append(
            RelevanceEntry(
                relevance_id=current["relevance_id"],
                source_ref=current.get("source_ref", {}),
                topic_ids=list(current.get("topic_ids", [])),
                artifact_targets=list(current.get("artifact_targets", [])),
                confidence=current.get("confidence", "low"),
                matched_terms=list(current.get("matched_terms", [])),
                owner=current.get("owner"),
                status=current.get("status", "draft"),
            )
        )
        current = None

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        stripped = raw_line.strip()
        if not stripped:
            continue
        if stripped.startswith("- relevance_id:"):
            finish()
            current = {"relevance_id": unquote(stripped.split(":", 1)[1])}
            section = None
            continue
        if current is None:
            continue
        if stripped == "source_ref:":
            current["source_ref"] = {}
            section = "source_ref"
        elif stripped in {"topic_ids:", "artifact_targets:", "matched_terms:"}:
            section = stripped[:-1]
            current[section] = []
        elif stripped == "pages:" and section == "source_ref":
            section = "source_ref_pages"
            current["source_ref"]["pages"] = []
        elif stripped.startswith("- ") and section in {"topic_ids", "artifact_targets", "matched_terms"}:
            current[section].append(unquote(stripped[2:]))
        elif stripped.startswith("- ") and section == "source_ref_pages":
            current["source_ref"].setdefault("pages", []).append(int(stripped[2:]))
        elif section == "source_ref_pages" and ":" in stripped:
            section = "source_ref"
            key, value = stripped.split(":", 1)
            current["source_ref"][key] = unquote(value)
        elif section == "source_ref" and ":" in stripped:
            key, value = stripped.split(":", 1)
            current["source_ref"][key] = unquote(value)
        elif ":" in stripped:
            key, value = stripped.split(":", 1)
            current[key] = unquote(value)
            section = None

    finish()
    return entries


def load_chunk_texts(sources_dir: pathlib.Path) -> dict[str, str]:
    chunks: dict[str, str] = {}
    for path in sorted(sources_dir.glob("*.yaml")):
        for chunk in parse_source_chunks(path):
            chunks[chunk.chunk_id] = chunk.text
    return chunks


def keywords_for_rule(rule: RuleModel) -> set[str]:
    haystack = " ".join(
        part
        for part in [
            rule.rule_id,
            rule.topic_id,
            rule.output or "",
            rule.logic_summary or "",
            rule.logic_expression or "",
            " ".join(rule.inputs),
        ]
        if part
    ).lower()
    tokens = {
        token
        for token in re.split(r"[^a-z0-9.]+", haystack)
        if len(token) >= 3 and token not in KEYWORD_STOPWORDS
    }
    phrases = set()
    if "standard" in tokens and "mileage" in tokens:
        phrases.add("standard mileage")
    if "business" in tokens and "miles" in tokens:
        phrases.add("business miles")
    if "self" in tokens and "employment" in tokens:
        phrases.add("self-employment")
    return tokens | phrases


def declared_product_ids(rule: RuleModel) -> set[str]:
    product_ids: set[str] = set()
    for source_id in rule.source_ids:
        direct = re.search(r"irs_(p\d+[a-z]?)_\d{4}", source_id)
        if direct:
            product_ids.add(direct.group(1))
            continue
        publication = re.search(r"publication_(\d+[a-z]?)_\d{4}", source_id)
        if publication:
            product_ids.add(f"p{publication.group(1)}")
    return product_ids


def product_id_from_source_ref(entry: RelevanceEntry) -> str | None:
    source_id = str(entry.source_ref.get("source_id", ""))
    match = re.search(r"irs_(p\d+[a-z]?)_\d{4}", source_id)
    return match.group(1) if match else None


def score_candidate(rule: RuleModel, entry: RelevanceEntry, chunk_text: str) -> int:
    if rule.topic_id not in entry.topic_ids or "factgraph" not in entry.artifact_targets:
        return -1
    keywords = keywords_for_rule(rule)
    preferred_products = declared_product_ids(rule)
    matched_text = " ".join(entry.matched_terms).lower()
    source_text = chunk_text.lower()
    score = CONFIDENCE_SCORE.get(entry.confidence, 0)
    if preferred_products and product_id_from_source_ref(entry) in preferred_products:
        score += 25
    for keyword in keywords:
        if keyword in matched_text:
            score += 6
        elif keyword in source_text:
            score += 2
    if any(term.lower() in source_text for term in entry.matched_terms):
        score += 1
    return score


def select_source_refs(
    rule: RuleModel,
    relevance_entries: list[RelevanceEntry],
    chunk_texts: dict[str, str],
    max_refs: int,
) -> list[dict[str, Any]]:
    ranked: list[tuple[int, RelevanceEntry]] = []
    for entry in relevance_entries:
        chunk_id = str(entry.source_ref.get("chunk_id", ""))
        score = score_candidate(rule, entry, chunk_texts.get(chunk_id, ""))
        if score >= 0:
            ranked.append((score, entry))
    ranked.sort(key=lambda item: (-item[0], item[1].source_ref.get("source_id", ""), item[1].source_ref.get("chunk_id", "")))

    refs: list[dict[str, Any]] = []
    seen_chunks: set[str] = set()
    for score, entry in ranked:
        chunk_id = str(entry.source_ref.get("chunk_id", ""))
        if not chunk_id or chunk_id in seen_chunks:
            continue
        seen_chunks.add(chunk_id)
        refs.append(
            {
                "source_id": entry.source_ref.get("source_id"),
                "chunk_id": chunk_id,
                "pages": entry.source_ref.get("pages", []),
                "text_sha256": entry.source_ref.get("text_sha256"),
                "relevance_id": entry.relevance_id,
                "confidence": entry.confidence,
                "matched_terms": entry.matched_terms,
                "selection_score": score,
            }
        )
        if len(refs) >= max_refs:
            break
    return refs


def artifact_id_for_rule(rule: RuleModel) -> str:
    digest = hashlib.sha1(rule.rule_id.encode("utf-8")).hexdigest()[:8]
    return f"fg_{rule.rule_id}_{digest}"


def draft_changes_for_rule(rule: RuleModel) -> list[dict[str, Any]]:
    changes: list[dict[str, Any]] = []
    if rule.output:
        changes.append(
            {
                "target": "backend/src/main/resources/tax/*.xml",
                "change_type": "draft_or_update_fact",
                "fact_path": rule.output,
                "rationale": rule.logic_summary or "Generated from reviewed rule model.",
            }
        )
        changes.append(
            {
                "target": "tax-advisor/src/main/resources/tax-plan/*.xml",
                "change_type": "draft_or_update_planning_fact",
                "fact_path": rule.output,
                "rationale": "Planning graph target if the rule is in planning scope.",
            }
        )
    return changes


def generate_work_items(args: argparse.Namespace) -> dict[str, Any]:
    rules = parse_rules(args.rules_dir)
    relevance_entries = parse_relevance(args.relevance)
    chunk_texts = load_chunk_texts(args.sources_dir)
    artifacts: list[dict[str, Any]] = []

    for rule in rules:
        if args.topic and rule.topic_id != args.topic:
            continue
        source_refs = select_source_refs(rule, relevance_entries, chunk_texts, args.max_refs)
        artifacts.append(
            {
                "artifact_id": artifact_id_for_rule(rule),
                "tax_year": rule.tax_year or args.tax_year,
                "jurisdiction": rule.jurisdiction or args.jurisdiction,
                "status": "draft",
                "rule_ids": [rule.rule_id],
                "rule_type": rule.rule_type,
                "topic_id": rule.topic_id,
                "generated_files": [
                    "backend/src/main/resources/tax/*.xml",
                    "tax-advisor/src/main/resources/tax-plan/*.xml",
                    "backend/src/main/resources/factgraphservice/xmlFactPaths",
                ],
                "fact_paths": {
                    "inputs": rule.inputs,
                    "output": rule.output,
                },
                "source_refs": source_refs,
                "draft_changes": draft_changes_for_rule(rule),
                "scenario_ids": rule.scenario_ids,
                "reviewers": [
                    "domain_specialist_for_rule",
                    "tax_platform_engineer",
                    "product_owner_for_scope_if_needed",
                ],
                "notes": rule.notes
                + [
                    "Generated work item only. Runtime XML patches require tax and engineering review.",
                    "Source refs were selected from deterministic relevance classification and need reviewer confirmation.",
                ],
            }
        )

    return {
        "tax_year": args.tax_year,
        "jurisdiction": args.jurisdiction,
        "status": "draft",
        "generated_at": dt.datetime.now(dt.UTC).isoformat(),
        "inputs": {
            "rules_dir": str(args.rules_dir),
            "relevance": str(args.relevance),
            "sources_dir": str(args.sources_dir),
            "runtime_resource_map": str(args.runtime_resource_map) if args.runtime_resource_map else None,
        },
        "artifacts": artifacts,
    }


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tax-year", type=int, required=True)
    parser.add_argument("--jurisdiction", default="federal")
    parser.add_argument("--rules-dir", type=pathlib.Path, required=True)
    parser.add_argument("--relevance", type=pathlib.Path, required=True)
    parser.add_argument("--sources-dir", type=pathlib.Path, required=True)
    parser.add_argument("--runtime-resource-map", type=pathlib.Path)
    parser.add_argument("--output", type=pathlib.Path, required=True)
    parser.add_argument("--topic", help="Optional topic id filter.")
    parser.add_argument("--max-refs", type=int, default=8)
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    document = generate_work_items(args)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text("\n".join(render_mapping(document)) + "\n", encoding="utf-8")
    print(f"Fact graph work item generation complete: generated={len(document['artifacts'])} output={args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
