#!/usr/bin/env python3
"""Build the canonical, metadata-minimized official FGV question corpus.

The source PDFs remain outside the repository. Generated records keep provenance,
page locators, hashes, short excerpts, answer-key links and review gates. Historical
incidence remains disabled regardless of extraction or link confidence.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import fitz
from rapidfuzz.fuzz import WRatio, ratio, token_set_ratio

import official_fgv_extraction_core as extraction_core

SCHEMA_VERSION = "1.1.0"
POLICY = "OFFICIAL_CORPUS_SHADOW_ONLY"



CORE = extraction_core


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalize_ascii(value: str) -> str:
    value = unicodedata.normalize("NFKD", value)
    value = "".join(char for char in value if not unicodedata.combining(char))
    value = value.lower().replace("\u00ad", "")
    value = re.sub(r"[^a-z0-9+#./@-]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def clean_line(value: str) -> str:
    return " ".join(value.replace("\u00ad", "").replace("\uf0b7", " ").split())


def stable_id(prefix: str, *parts: str) -> str:
    digest = hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()[:20]
    return f"{prefix}:{digest}"


def detect_expected_question_count(cover_text: str) -> int | None:
    patterns = (
        r"(?:contendo|com)\s+(\d{2,3})\s*(?:\([^)]*\))?\s*quest(?:ões|oes)\s+objetivas",
        r"(\d{2,3})\s*(?:\([^)]*\))?\s*quest(?:ões|oes)\s+objetivas",
        r"caderno\s+contendo\s+(\d{2,3})",
    )
    for pattern in patterns:
        match = re.search(pattern, cover_text, flags=re.I)
        if match:
            count = int(match.group(1))
            if 10 <= count <= 150:
                return count
    return None


def detect_exam_kind(cover_text: str, expected_count: int | None) -> str:
    normalized = normalize_ascii(cover_text)
    has_objective = expected_count is not None or "questoes objetivas" in normalized
    has_discursive = any(term in normalized for term in ("prova discursiva", "questoes discursivas", "parecer tecnico"))
    if has_objective and has_discursive:
        return "MIXED"
    if has_objective:
        return "OBJECTIVE"
    if has_discursive:
        return "DISCURSIVE_ONLY"
    return "UNKNOWN"


def filename_title(path: str) -> str:
    value = Path(path).stem
    value = re.sub(r"^\d+_", "", value)
    value = re.sub(r"\b(?:tipo[- ]?0?1|t0?1|manha|tarde|branca|ok)\b", " ", value, flags=re.I)
    value = re.sub(r"(?:cns|cnm|ns|nm|e\d+)[a-z0-9-]*", " ", value, flags=re.I)
    return normalize_ascii(value)


def choose_cover_label(cover_text: str, fallback: str) -> str:
    target = filename_title(fallback)
    candidates: list[tuple[float, str]] = []
    for raw in cover_text.splitlines():
        line = clean_line(raw)
        normalized = normalize_ascii(line)
        if not (12 <= len(normalized) <= 220):
            continue
        if any(term in normalized for term in (
            "concurso publico", "informacoes gerais", "sua prova", "tempo", "nao sera permitido",
            "fgv conhecimento", "pagina", "nivel superior", "edital",
        )):
            continue
        score = max(token_set_ratio(target, normalized), WRatio(target, normalized))
        candidates.append((score, line))
    if not candidates:
        return Path(fallback).stem
    candidates.sort(key=lambda item: (item[0], len(item[1])), reverse=True)
    return candidates[0][1]


def alternative_profile(text: str) -> tuple[list[str], int, bool]:
    labels = re.findall(r"\(([A-E])\)", text)
    unique = sorted(set(labels))
    return unique, len(labels), unique == ["A", "B", "C", "D", "E"] and len(labels) == 5


@dataclass(frozen=True)
class KeyToken:
    kind: str
    value: str | int


def parse_key_token(line: str) -> KeyToken:
    normalized = clean_line(line).upper()
    if re.fullmatch(r"\d{1,3}", normalized):
        return KeyToken("NUMBER", int(normalized))
    if re.fullmatch(r"[A-E]|\*|X|ANULAD[AO]|NULA", normalized):
        answer = normalized if normalized in {"A", "B", "C", "D", "E"} else "*"
        return KeyToken("ANSWER", answer)
    return KeyToken("TEXT", clean_line(line))


def key_variant(heading: str) -> int | None:
    normalized = normalize_ascii(heading)
    matches = list(re.finditer(r"(?:prova\s+)?tipo\s*0?([1-4])\b", normalized))
    if matches:
        return int(matches[-1].group(1))
    match = re.search(r"\b([1-4])\s+-?\s*turno\b", normalized)
    if match:
        return int(match.group(1))
    match = re.search(r"[-–]\s*([1-4])(?:\s*[-–]|\s*$)", heading.strip())
    return int(match.group(1)) if match else None


def key_title(heading: str) -> str:
    parts = [part.strip() for part in heading.split("|") if part.strip()]
    kept: list[str] = []
    for part in parts:
        normalized = normalize_ascii(part)
        if any(term in normalized for term in (
            "gabarito", "concurso publico", "edital", "pagina", "prova aplicada",
            "provas aplicadas", "questao anulada", "publicado em",
        )):
            continue
        kept.append(part)
    return normalize_ascii(" ".join(kept[-3:]))


def parse_key_page(page_text: str, page_number: int) -> list[dict[str, Any]]:
    lines = [clean_line(line) for line in page_text.splitlines() if clean_line(line)]
    tokens = [parse_key_token(line) for line in lines]
    groups: list[dict[str, Any]] = []
    index = 0
    while index < len(tokens):
        token = tokens[index]
        if token.kind != "NUMBER":
            index += 1
            continue

        numbers = [int(token.value)]
        cursor = index + 1
        while (
            cursor < len(tokens)
            and tokens[cursor].kind == "NUMBER"
            and int(tokens[cursor].value) == numbers[-1] + 1
        ):
            numbers.append(int(tokens[cursor].value))
            cursor += 1

        if len(numbers) >= 5:
            answers: list[str] = []
            answer_cursor = cursor
            while answer_cursor < len(tokens) and len(answers) < len(numbers):
                if tokens[answer_cursor].kind == "ANSWER":
                    answers.append(str(tokens[answer_cursor].value))
                elif tokens[answer_cursor].kind == "NUMBER":
                    break
                answer_cursor += 1
            if len(answers) == len(numbers):
                heading = " | ".join(
                    str(item.value) for item in tokens[max(0, index - 12):index] if item.kind == "TEXT"
                )
                groups.append({
                    "page": page_number,
                    "start": numbers[0],
                    "end": numbers[-1],
                    "answers": dict(zip(numbers, answers)),
                    "heading": heading,
                })
                index = answer_cursor
                continue

        pairs: list[tuple[int, str]] = []
        cursor = index
        expected = int(token.value)
        while (
            cursor + 1 < len(tokens)
            and tokens[cursor].kind == "NUMBER"
            and int(tokens[cursor].value) == expected
            and tokens[cursor + 1].kind == "ANSWER"
        ):
            pairs.append((expected, str(tokens[cursor + 1].value)))
            expected += 1
            cursor += 2
        if len(pairs) >= 5:
            heading = " | ".join(
                str(item.value) for item in tokens[max(0, index - 12):index] if item.kind == "TEXT"
            )
            groups.append({
                "page": page_number,
                "start": pairs[0][0],
                "end": pairs[-1][0],
                "answers": dict(pairs),
                "heading": heading,
            })
            index = cursor
            continue
        index += 1
    return groups


def parse_key_document(path: Path, document: dict[str, Any]) -> list[dict[str, Any]]:
    pdf = fitz.open(path)
    groups: list[dict[str, Any]] = []
    try:
        for page_index, page in enumerate(pdf):
            groups.extend(parse_key_page(page.get_text("text"), page_index + 1))
    finally:
        pdf.close()

    sections: list[dict[str, Any]] = []
    for group in groups:
        if group["start"] == 1 or not sections or group["start"] != sections[-1]["endQuestion"] + 1:
            section_id = stable_id(
                "key-section", document["document_id"], str(group["page"]), group["heading"], str(len(sections))
            )
            sections.append({
                "schemaVersion": SCHEMA_VERSION,
                "id": section_id,
                "contestId": document["contest_id"],
                "answerKeyDocumentId": document["document_id"],
                "answerKeyStatus": document["gabarito_status"] or "unknown",
                "pageStart": group["page"],
                "pageEnd": group["page"],
                "heading": group["heading"],
                "normalizedTitle": key_title(group["heading"]),
                "bookletVariant": key_variant(group["heading"]),
                "startQuestion": group["start"],
                "endQuestion": group["end"],
                "answers": {str(key): value for key, value in group["answers"].items()},
                "parseConfidence": 0.98,
                "reviewStatus": "PENDING",
                "source": {
                    "documentId": document["document_id"],
                    "organizedPath": document["organized_path"],
                    "sha256": document["sha256"],
                },
            })
        else:
            section = sections[-1]
            section["answers"].update({str(key): value for key, value in group["answers"].items()})
            section["endQuestion"] = group["end"]
            section["pageEnd"] = group["page"]
    for section in sections:
        section["questionCount"] = len(section["answers"])
        section["annulledQuestions"] = [
            int(number) for number, answer in section["answers"].items() if answer == "*"
        ]
    return sections


def match_answer_key(exam: dict[str, Any], sections: list[dict[str, Any]]) -> dict[str, Any]:
    candidates = [
        section for section in sections
        if section["contestId"] == exam["contestId"]
        and section["questionCount"] == exam["extractedQuestionCount"]
    ]
    if any(section["answerKeyStatus"] == "definitivo" for section in candidates):
        candidates = [section for section in candidates if section["answerKeyStatus"] == "definitivo"]
    if any(section["bookletVariant"] == 1 for section in candidates):
        candidates = [section for section in candidates if section["bookletVariant"] == 1]

    exam_titles = [filename_title(exam["organizedPath"]), normalize_ascii(exam["bookletLabel"])]
    ranked: list[tuple[float, dict[str, Any]]] = []
    for section in candidates:
        section_title = section["normalizedTitle"]
        scores = []
        for title in exam_titles:
            if not title or not section_title:
                continue
            scores.append(0.7 * token_set_ratio(title, section_title) + 0.3 * WRatio(title, section_title))
        score = max(scores, default=0.0)
        ranked.append((score, section))
    ranked.sort(key=lambda item: (item[0], item[1]["answerKeyStatus"] == "definitivo"), reverse=True)

    if not ranked:
        return {
            "status": "UNRESOLVED",
            "confidence": 0.0,
            "rationale": "No answer-key section with matching contest and question count.",
            "candidates": [],
        }

    best_score, best = ranked[0]
    second_score = ranked[1][0] if len(ranked) > 1 else 0.0
    margin = best_score - second_score
    if best_score >= 72 and margin >= 6:
        status = "AUTO_LINKED_HIGH_CONFIDENCE"
        confidence = min(0.99, 0.72 + (best_score - 72) / 100 + min(margin, 20) / 100)
    elif best_score >= 58 and margin >= 3:
        status = "CANDIDATE_REVIEW_REQUIRED"
        confidence = min(0.79, 0.50 + (best_score - 58) / 100 + min(margin, 10) / 100)
    else:
        status = "AMBIGUOUS_REVIEW_REQUIRED"
        confidence = min(0.49, best_score / 200)

    return {
        "status": status,
        "confidence": round(confidence, 4),
        "rationale": (
            f"Best title score {best_score:.2f}; margin {margin:.2f}; "
            f"status {best['answerKeyStatus']}; variant {best['bookletVariant']}."
        ),
        "sectionId": best["id"],
        "answerKeyDocumentId": best["answerKeyDocumentId"],
        "answerKeyStatus": best["answerKeyStatus"],
        "score": round(best_score, 4),
        "margin": round(margin, 4),
        "candidates": [
            {"sectionId": section["id"], "score": round(score, 4), "heading": section["heading"]}
            for score, section in ranked[:3]
        ],
    }


def assign_duplicates(records: list[dict[str, Any]], normalized_by_id: dict[str, str]) -> dict[str, int]:
    exact_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        exact_groups[record["contentFingerprint"]].append(record)

    duplicate_groups = 0
    exact_records = 0
    near_records = 0
    for fingerprint, group in sorted(exact_groups.items()):
        if len(group) < 2:
            continue
        duplicate_groups += 1
        group.sort(key=lambda item: (item["year"] or 0, item["contestId"], item["examDocumentId"], item["questionNumber"]))
        canonical = group[0]["id"]
        group_id = f"exact:{fingerprint[:16]}"
        for record in group:
            record["deduplication"] = {
                "canonicalQuestionId": canonical,
                "groupId": group_id,
                "type": "EXACT",
                "similarity": 1.0,
                "reviewStatus": "PENDING",
            }
            exact_records += 1

    blocks: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        if record.get("deduplication"):
            continue
        normalized = normalized_by_id[record["id"]]
        key = normalized[:42]
        if len(key) >= 28:
            blocks[key].append(record)

    for block in blocks.values():
        if len(block) < 2:
            continue
        block.sort(key=lambda item: (item["year"] or 0, item["contestId"], item["examDocumentId"], item["questionNumber"]))
        for left_index, left in enumerate(block):
            if left.get("deduplication"):
                continue
            left_text = normalized_by_id[left["id"]]
            for right in block[left_index + 1:]:
                if right.get("deduplication"):
                    continue
                right_text = normalized_by_id[right["id"]]
                length_ratio = min(len(left_text), len(right_text)) / max(len(left_text), len(right_text))
                if length_ratio < 0.94:
                    continue
                similarity = ratio(left_text, right_text) / 100
                if similarity >= 0.985:
                    duplicate_groups += 1
                    group_id = stable_id("near", left["contentFingerprint"], right["contentFingerprint"])
                    for record in (left, right):
                        record["deduplication"] = {
                            "canonicalQuestionId": left["id"],
                            "groupId": group_id,
                            "type": "NEAR",
                            "similarity": round(similarity, 4),
                            "reviewStatus": "PENDING",
                        }
                        near_records += 1
                    break

    for record in records:
        record.setdefault("deduplication", {
            "canonicalQuestionId": record["id"],
            "groupId": None,
            "type": "UNIQUE",
            "similarity": 1.0,
            "reviewStatus": "NOT_REQUIRED",
        })
    return {
        "duplicateGroups": duplicate_groups,
        "exactDuplicateRecords": exact_records,
        "nearDuplicateRecords": near_records,
        "uniqueCanonicalQuestions": len({record["deduplication"]["canonicalQuestionId"] for record in records}),
    }


def write_ndjson(path: Path, records: Iterable[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as stream:
        for record in records:
            stream.write(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", required=True, type=Path)
    parser.add_argument("--documents", default="data/knowledge/documentos.json", type=Path)
    parser.add_argument("--output-dir", default="data/knowledge", type=Path)
    args = parser.parse_args()

    documents = json.loads(args.documents.read_text(encoding="utf-8"))
    args.output_dir.mkdir(parents=True, exist_ok=True)
    source_errors: list[str] = []
    exam_manifests: list[dict[str, Any]] = []
    question_records: list[dict[str, Any]] = []
    normalized_by_id: dict[str, str] = {}

    answer_key_sections: list[dict[str, Any]] = []
    for document in [item for item in documents if item["document_type"] == "gabarito"]:
        path = args.source_root / document["organized_path"]
        if not path.exists():
            source_errors.append(f"Missing answer key: {document['organized_path']}")
            continue
        actual_hash = sha256_file(path)
        if actual_hash != document["sha256"]:
            source_errors.append(f"Answer-key hash mismatch: {document['document_id']}")
            continue
        answer_key_sections.extend(parse_key_document(path, document))

    exams = [item for item in documents if item["document_type"] == "prova"]
    for document in exams:
        path = args.source_root / document["organized_path"]
        manifest: dict[str, Any] = {
            "schemaVersion": SCHEMA_VERSION,
            "id": stable_id("exam", document["document_id"]),
            "contestId": document["contest_id"],
            "examDocumentId": document["document_id"],
            "year": document["year"],
            "organizedPath": document["organized_path"],
            "sourceSha256": document["sha256"],
            "sourceVerified": False,
            "shadowMode": True,
            "incidenceEligible": False,
        }
        if not path.exists():
            manifest.update({"examKind": "UNKNOWN", "extractionStatus": "SOURCE_MISSING", "issues": ["SOURCE_MISSING"]})
            exam_manifests.append(manifest)
            source_errors.append(f"Missing exam: {document['organized_path']}")
            continue
        actual_hash = sha256_file(path)
        if actual_hash != document["sha256"]:
            manifest.update({"examKind": "UNKNOWN", "extractionStatus": "HASH_MISMATCH", "issues": ["HASH_MISMATCH"]})
            exam_manifests.append(manifest)
            source_errors.append(f"Exam hash mismatch: {document['document_id']}")
            continue
        manifest["sourceVerified"] = True

        pdf = fitz.open(path)
        try:
            cover_text = "\n".join(page.get_text("text") for page in list(pdf)[:2])
        finally:
            pdf.close()
        expected_count = detect_expected_question_count(cover_text)
        exam_kind = detect_exam_kind(cover_text, expected_count)
        booklet_label = choose_cover_label(cover_text, document["organized_path"])
        manifest.update({
            "examKind": exam_kind,
            "bookletLabel": booklet_label,
            "expectedQuestionCount": expected_count,
        })

        if exam_kind == "DISCURSIVE_ONLY":
            manifest.update({
                "extractionStatus": "EXCLUDED_DISCURSIVE_ONLY",
                "extractedQuestionCount": 0,
                "sequenceComplete": False,
                "issues": ["NO_OBJECTIVE_QUESTION_SEQUENCE"],
                "answerKeyLink": {"status": "NOT_APPLICABLE", "confidence": 1.0},
            })
            exam_manifests.append(manifest)
            continue

        try:
            extracted = CORE.extract_questions(path, expected_count)
        except Exception as error:  # deterministic review queue instead of silent failure
            manifest.update({
                "extractionStatus": "FAILED_REVIEW_REQUIRED",
                "extractedQuestionCount": 0,
                "sequenceComplete": False,
                "issues": ["QUESTION_SEQUENCE_NOT_EXTRACTED", str(error)],
            })
            manifest["answerKeyLink"] = {"status": "UNRESOLVED", "confidence": 0.0}
            exam_manifests.append(manifest)
            continue

        sequence_complete = (
            bool(extracted)
            and extracted[0].number == 1
            and extracted[-1].number == len(extracted)
            and all(question.number == index for index, question in enumerate(extracted, start=1))
            and (expected_count is None or expected_count == len(extracted))
        )
        manifest.update({
            "extractionStatus": "EXTRACTED_REVIEW_PENDING" if sequence_complete else "PARTIAL_REVIEW_REQUIRED",
            "extractedQuestionCount": len(extracted),
            "sequenceComplete": sequence_complete,
            "issues": [] if sequence_complete else ["QUESTION_SEQUENCE_INCOMPLETE"],
        })
        exam_manifests.append(manifest)

        for question in extracted:
            normalized = CORE.normalize_text(question.text)
            content_fingerprint = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
            labels, raw_count, complete = alternative_profile(question.text)
            question_id = f"question:{document['document_id']}:{question.number}"
            record = {
                "schemaVersion": SCHEMA_VERSION,
                "id": question_id,
                "contestId": document["contest_id"],
                "year": document["year"],
                "examDocumentId": document["document_id"],
                "bookletId": f"booklet:{document['document_id']}",
                "bookletLabel": booklet_label,
                "questionNumber": question.number,
                "page": question.page,
                "source": {
                    "kind": "OFFICIAL",
                    "documentId": document["document_id"],
                    "organizedPath": document["organized_path"],
                    "sha256": document["sha256"],
                    "locator": f"page:{question.page};question:{question.number}",
                },
                "contentFingerprint": content_fingerprint,
                "normalizedLength": len(normalized),
                "excerpt": clean_line(question.text)[:280],
                "alternativeLabels": labels,
                "rawAlternativeMarkerCount": raw_count,
                "alternativesComplete": complete,
                "extraction": {
                    "status": "EXTRACTED_REVIEW_PENDING",
                    "confidence": 0.98 if sequence_complete else 0.65,
                    "reviewStatus": "PENDING",
                },
                "classificationStatus": "NOT_CLASSIFIED",
                "answerKey": {"status": "UNRESOLVED"},
                "incidenceEligible": False,
                "shadowMode": True,
            }
            question_records.append(record)
            normalized_by_id[question_id] = normalized

    section_by_id = {section["id"]: section for section in answer_key_sections}
    questions_by_exam: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for question in question_records:
        questions_by_exam[question["examDocumentId"]].append(question)

    for manifest in exam_manifests:
        if manifest.get("extractionStatus") not in {"EXTRACTED_REVIEW_PENDING", "PARTIAL_REVIEW_REQUIRED"}:
            continue
        link = match_answer_key(manifest, answer_key_sections)
        manifest["answerKeyLink"] = link
        if link["status"] != "AUTO_LINKED_HIGH_CONFIDENCE":
            continue
        section = section_by_id[link["sectionId"]]
        for question in questions_by_exam[manifest["examDocumentId"]]:
            answer = section["answers"].get(str(question["questionNumber"]))
            if answer is None:
                continue
            question["answerKey"] = {
                "status": "AUTO_LINKED_HIGH_CONFIDENCE",
                "answer": answer,
                "annulled": answer == "*",
                "answerKeyStatus": section["answerKeyStatus"],
                "answerKeyDocumentId": section["answerKeyDocumentId"],
                "sectionId": section["id"],
                "confidence": link["confidence"],
                "reviewStatus": "PENDING",
            }

    dedup_summary = assign_duplicates(question_records, normalized_by_id)

    review_queue: list[dict[str, Any]] = []
    for manifest in exam_manifests:
        if manifest["extractionStatus"] in {"FAILED_REVIEW_REQUIRED", "PARTIAL_REVIEW_REQUIRED", "SOURCE_MISSING", "HASH_MISMATCH"}:
            review_queue.append({
                "id": stable_id("review", manifest["examDocumentId"], "extraction"),
                "type": "EXAM_EXTRACTION",
                "priority": "BLOCKING",
                "examDocumentId": manifest["examDocumentId"],
                "reason": manifest["extractionStatus"],
                "details": manifest.get("issues", []),
            })
        link = manifest.get("answerKeyLink", {})
        if link.get("status") in {"CANDIDATE_REVIEW_REQUIRED", "AMBIGUOUS_REVIEW_REQUIRED", "UNRESOLVED"}:
            review_queue.append({
                "id": stable_id("review", manifest["examDocumentId"], "answer-key"),
                "type": "ANSWER_KEY_LINK",
                "priority": "BLOCKING_FOR_ANSWER_ANALYSIS",
                "examDocumentId": manifest["examDocumentId"],
                "reason": link.get("status"),
                "details": link,
            })
    duplicate_review_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for question in question_records:
        if question["deduplication"]["reviewStatus"] == "PENDING":
            duplicate_review_groups[question["deduplication"]["groupId"]].append(question)
    for group_id, members in duplicate_review_groups.items():
        canonical_id = members[0]["deduplication"]["canonicalQuestionId"]
        review_queue.append({
            "id": stable_id("review", group_id, "duplicate"),
            "type": "QUESTION_DEDUPLICATION",
            "priority": "BLOCKING_FOR_INCIDENCE",
            "canonicalQuestionId": canonical_id,
            "memberQuestionIds": [member["id"] for member in members],
            "reason": members[0]["deduplication"]["type"],
            "details": {
                "groupId": group_id,
                "memberCount": len(members),
                "maximumSimilarity": max(member["deduplication"]["similarity"] for member in members),
            },
        })

    status_counts = Counter(manifest["extractionStatus"] for manifest in exam_manifests)
    link_counts = Counter(manifest.get("answerKeyLink", {}).get("status", "MISSING") for manifest in exam_manifests)
    definitive_linked_questions = sum(
        1 for question in question_records
        if question["answerKey"].get("status") == "AUTO_LINKED_HIGH_CONFIDENCE"
        and question["answerKey"].get("answerKeyStatus") == "definitivo"
    )
    quality = {
        "schemaVersion": SCHEMA_VERSION,
        "policy": POLICY,
        "generatedFrom": {
            "sourceRootLabel": args.source_root.name,
            "documentCatalogSha256": sha256_file(args.documents),
        },
        "shadowMode": True,
        "eligibleForSDEHistoricalIncidence": False,
        "counts": {
            "catalogExamDocuments": len(exams),
            "objectiveOrMixedExamsExtracted": sum(
                manifest["extractionStatus"] in {"EXTRACTED_REVIEW_PENDING", "PARTIAL_REVIEW_REQUIRED"}
                for manifest in exam_manifests
            ),
            "discursiveOnlyExamsExcluded": status_counts["EXCLUDED_DISCURSIVE_ONLY"],
            "failedExamExtractions": status_counts["FAILED_REVIEW_REQUIRED"],
            "questionsExtracted": len(question_records),
            "answerKeyDocuments": len([item for item in documents if item["document_type"] == "gabarito"]),
            "answerKeySectionsParsed": len(answer_key_sections),
            "highConfidenceExamAnswerKeyLinks": link_counts["AUTO_LINKED_HIGH_CONFIDENCE"],
            "candidateExamAnswerKeyLinks": link_counts["CANDIDATE_REVIEW_REQUIRED"],
            "ambiguousExamAnswerKeyLinks": link_counts["AMBIGUOUS_REVIEW_REQUIRED"],
            "unresolvedExamAnswerKeyLinks": link_counts["UNRESOLVED"],
            "questionsLinkedToDefinitiveAnswerKey": definitive_linked_questions,
            "reviewQueueItems": len(review_queue),
            **dedup_summary,
        },
        "extractionStatusCounts": dict(status_counts),
        "answerKeyLinkStatusCounts": dict(link_counts),
        "sourceIntegrity": {"valid": not source_errors, "errors": source_errors},
        "activationBlockers": [
            "Question extraction and answer-key links are machine-generated and still require review.",
            "Question classifications against source notices and DATAPREV 2026 taxonomy are not complete.",
            "Duplicate groups require human confirmation before incidence statistics.",
            "No historical signal is connected to the SDE.",
        ],
        "dataMinimization": {
            "fullQuestionTextStored": False,
            "fullAlternativesStored": False,
            "shortExcerptMaxCharacters": 280,
            "sourcePdfRequiredForAuthoritativeReview": True,
        },
    }

    exam_manifests.sort(key=lambda item: (item["contestId"], item["organizedPath"]))
    answer_key_sections.sort(key=lambda item: (item["contestId"], item["answerKeyDocumentId"], item["pageStart"], item["id"]))
    question_records.sort(key=lambda item: (item["contestId"], item["examDocumentId"], item["questionNumber"]))
    review_queue.sort(key=lambda item: (item["priority"], item["type"], item["id"]))

    (args.output_dir / "official-exam-manifest.json").write_text(
        json.dumps(exam_manifests, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (args.output_dir / "official-answer-key-sections.json").write_text(
        json.dumps(answer_key_sections, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    write_ndjson(args.output_dir / "official-question-corpus.ndjson", question_records)
    (args.output_dir / "official-review-queue.json").write_text(
        json.dumps(review_queue, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (args.output_dir / "official-corpus-quality.json").write_text(
        json.dumps(quality, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(quality, ensure_ascii=False, indent=2))
    if source_errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
