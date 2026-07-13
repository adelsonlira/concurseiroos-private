from __future__ import annotations

import argparse
import csv
import importlib.util
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from rapidfuzz.fuzz import ratio

MODULE_PATH = Path(__file__).with_name("build_fgv_wave1_corpus.py")
spec = importlib.util.spec_from_file_location("fgv_wave_core", MODULE_PATH)
assert spec and spec.loader
core = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = core
spec.loader.exec_module(core)


def load_ndjson(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def mark_cross_wave_duplicates(
    wave2: list[dict[str, Any]], wave1: list[dict[str, Any]]
) -> None:
    exact = {record["questionHash"]: record for record in wave1}
    prefix_blocks: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in wave1:
        prefix = core.normalize_text(record["stemExcerpt"])[:70]
        key = prefix[:32]
        if len(key) >= 20:
            prefix_blocks[key].append(record)

    for record in wave2:
        record["crossWaveDuplicate"] = False
        record["duplicateOfSourceFilename"] = None
        record["duplicateOfQuestionNumber"] = None
        record["crossWaveDuplicateType"] = None
        exact_match = exact.get(record["questionHash"])
        if exact_match:
            record["crossWaveDuplicate"] = True
            record["duplicateOfSourceFilename"] = exact_match["sourceFilename"]
            record["duplicateOfQuestionNumber"] = exact_match["questionNumber"]
            record["crossWaveDuplicateType"] = "EXACT"
            continue

        left = core.normalize_text(record["stemExcerpt"])
        key = left[:32]
        for candidate in prefix_blocks.get(key, []):
            right = core.normalize_text(candidate["stemExcerpt"])
            if not left or not right:
                continue
            length_ratio = min(len(left), len(right)) / max(len(left), len(right))
            if length_ratio < 0.94:
                continue
            if ratio(left, right) >= 99.0:
                record["crossWaveDuplicate"] = True
                record["duplicateOfSourceFilename"] = candidate["sourceFilename"]
                record["duplicateOfQuestionNumber"] = candidate["questionNumber"]
                record["crossWaveDuplicateType"] = "NEAR"
                break


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--corpus-root", type=Path, required=True)
    parser.add_argument("--inventory", type=Path, required=True)
    parser.add_argument("--wave1-corpus", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    inventory = json.loads(args.inventory.read_text(encoding="utf-8"))
    exams = [
        exam for exam in inventory["exams"]
        if exam["relevance_tier"].startswith("B")
    ]
    args.output_dir.mkdir(parents=True, exist_ok=True)

    records: list[dict[str, Any]] = []
    extraction: list[dict[str, Any]] = []
    for exam in exams:
        path = args.corpus_root / exam["filename"]
        source_sha = core.sha256_file(path)
        questions = core.extract_questions(path, exam.get("declared_total_questions"))
        numbers = [question.number for question in questions]
        complete = numbers == list(range(1, len(numbers) + 1))
        extraction.append({
            "filename": exam["filename"],
            "rank": exam["rank"],
            "tier": exam["relevance_tier"],
            "declaredQuestionCount": exam.get("declared_total_questions"),
            "extractedQuestionCount": len(questions),
            "completeContiguousSequence": complete,
        })
        if not complete:
            raise ValueError(f"Sequência incompleta em {exam['filename']}: {numbers[:5]}...{numbers[-5:]}")
        records.extend(core.build_question_record(exam, source_sha, question) for question in questions)

    core.mark_duplicates(records)
    wave1 = load_ndjson(args.wave1_corpus)
    mark_cross_wave_duplicates(records, wave1)

    output = args.output_dir / "wave2-question-corpus.ndjson"
    with output.open("w", encoding="utf-8") as stream:
        for record in records:
            stream.write(json.dumps(record, ensure_ascii=False) + "\n")

    status_counts = Counter(record["classificationStatus"] for record in records)
    topic_counts = Counter(
        record["primaryTopicId"] for record in records
        if record["primaryTopicId"] is not None
    )
    within_duplicates = sum(1 for record in records if record.get("duplicateType"))
    cross_duplicates = sum(1 for record in records if record["crossWaveDuplicate"])
    high_confidence = [
        record for record in records
        if record["classificationStatus"] == "AUTO_CLASSIFIED_HIGH_CONFIDENCE"
        and not record["crossWaveDuplicate"]
    ]

    summary = {
        "schemaVersion": core.SCHEMA_VERSION,
        "generatedAt": "2026-07-13",
        "wave": "B_HIGH_RELEVANCE",
        "examCount": len(exams),
        "rawQuestionCount": len(records),
        "withinWaveDuplicateRecordCount": within_duplicates,
        "crossWaveDuplicateRecordCount": cross_duplicates,
        "nonDuplicateQuestionCount": len(records) - cross_duplicates,
        "highConfidenceCandidateCount": len(high_confidence),
        "classificationStatusCounts": dict(status_counts),
        "candidateTopicCounts": dict(topic_counts),
        "extraction": extraction,
        "activationStatus": "NOT_ELIGIBLE_FOR_SDE_HISTORICAL_INCIDENCE",
        "activationReasons": [
            "A onda B não possui revisão manual individual.",
            "Classificações automáticas são apenas candidatas temáticas.",
            "Duplicações com a onda A devem permanecer excluídas de qualquer denominador.",
            "Gabaritos não estão disponíveis.",
        ],
    }
    (args.output_dir / "wave2-corpus-summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    review = [
        record for record in records
        if not record["crossWaveDuplicate"]
        and record["classificationStatus"] in {
            "AUTO_CLASSIFIED_HIGH_CONFIDENCE",
            "AUTO_CLASSIFIED_REVIEW_REQUIRED",
            "UNCLASSIFIED",
        }
    ]
    review.sort(key=lambda record: (
        0 if record["classificationStatus"] == "AUTO_CLASSIFIED_HIGH_CONFIDENCE" else 1,
        record["examRank"],
        record["questionNumber"],
    ))
    fields = [
        "sourceFilename", "examRank", "questionNumber", "page", "classificationStatus",
        "primaryTopicId", "primarySubtopicId", "confidence", "matchedTerms",
        "outOfScopeMatches", "crossWaveDuplicate", "style", "stemExcerpt", "questionHash",
    ]
    with (args.output_dir / "wave2-review-queue.csv").open("w", newline="", encoding="utf-8-sig") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        for record in review:
            writer.writerow({
                field: "; ".join(record.get(field, [])) if isinstance(record.get(field), list) else record.get(field)
                for field in fields
            })

    report = [
        "# P1.4 — Onda B do corpus FGV",
        "",
        f"- Provas processadas: **{len(exams)}**.",
        f"- Questões extraídas: **{len(records)}**.",
        f"- Duplicações internas marcadas: **{within_duplicates}**.",
        f"- Duplicações contra a onda A: **{cross_duplicates}**.",
        f"- Candidatas automáticas de alta confiança, sem duplicação cruzada: **{len(high_confidence)}**.",
        "",
        "A onda permanece bloqueada para incidência histórica.",
        "",
        "## Extração",
        "",
        "| Prova | Extraídas | Declaradas | Sequência |",
        "|---|---:|---:|---|",
    ]
    for item in extraction:
        report.append(
            f"| {item['filename']} | {item['extractedQuestionCount']} | "
            f"{item['declaredQuestionCount'] if item['declaredQuestionCount'] is not None else 'N/D'} | "
            f"{'completa' if item['completeContiguousSequence'] else 'revisar'} |"
        )
    report += ["", "## Estados", "", "| Estado | Quantidade |", "|---|---:|"]
    for status, count in sorted(status_counts.items(), key=lambda item: (-item[1], item[0])):
        report.append(f"| {status} | {count} |")
    report += [
        "", "## Limites", "",
        "- Nenhum item da onda B foi promovido a evidência validada.",
        "- A fila de alta confiança deve passar por holdout independente antes de qualquer uso analítico.",
        "- Questões sem gabarito servem para incidência temática, não para estudar distratores ou anulações.",
    ]
    (args.output_dir / "WAVE2_CLASSIFICATION_REPORT.md").write_text("\n".join(report), encoding="utf-8")

    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
