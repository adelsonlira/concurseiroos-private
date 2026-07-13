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
spec = importlib.util.spec_from_file_location("fgv_wave_core3", MODULE_PATH)
assert spec and spec.loader
core = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = core
spec.loader.exec_module(core)


def load_ndjson(paths: list[Path]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for path in paths:
        if not path.exists():
            continue
        result.extend(json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip())
    return result


def mark_cross_wave_duplicates(records: list[dict[str, Any]], prior: list[dict[str, Any]]) -> None:
    exact = {record["questionHash"]: record for record in prior}
    prefix_blocks: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in prior:
        prefix = core.normalize_text(record["stemExcerpt"])[:70]
        key = prefix[:32]
        if len(key) >= 20:
            prefix_blocks[key].append(record)

    for record in records:
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
    parser.add_argument("--prior-corpus", type=Path, action="append", required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    inventory = json.loads(args.inventory.read_text(encoding="utf-8"))
    exams = [
        exam for exam in inventory["exams"]
        if exam["relevance_tier"].startswith("C") or exam["relevance_tier"].startswith("D")
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
    prior = load_ndjson(args.prior_corpus)
    mark_cross_wave_duplicates(records, prior)

    output = args.output_dir / "wave3-question-corpus.ndjson"
    with output.open("w", encoding="utf-8") as stream:
        for record in records:
            stream.write(json.dumps(record, ensure_ascii=False) + "\n")

    status_counts = Counter(record["classificationStatus"] for record in records)
    topic_counts = Counter(
        record["primaryTopicId"] for record in records if record["primaryTopicId"] is not None
    )
    tier_counts = Counter(record["examTier"] for record in records)
    within_duplicates = sum(1 for record in records if record.get("duplicateType"))
    cross_duplicates = sum(1 for record in records if record["crossWaveDuplicate"])
    high_confidence = [
        record for record in records
        if record["classificationStatus"] == "AUTO_CLASSIFIED_HIGH_CONFIDENCE"
        and not record.get("duplicateType")
        and not record["crossWaveDuplicate"]
    ]
    non_duplicate_count = sum(
        1 for record in records
        if not record.get("duplicateType") and not record["crossWaveDuplicate"]
    )

    summary = {
        "schemaVersion": core.SCHEMA_VERSION,
        "generatedAt": "2026-07-13",
        "wave": "C_COMPLEMENTARY_AND_D_NEGATIVE_CONTROL",
        "examCount": len(exams),
        "rawQuestionCount": len(records),
        "withinWaveDuplicateRecordCount": within_duplicates,
        "crossWaveDuplicateRecordCount": cross_duplicates,
        "nonDuplicateQuestionCount": non_duplicate_count,
        "highConfidenceCandidateCount": len(high_confidence),
        "classificationStatusCounts": dict(status_counts),
        "candidateTopicCounts": dict(topic_counts),
        "questionCountsByTier": dict(tier_counts),
        "extraction": extraction,
        "activationStatus": "NOT_ELIGIBLE_FOR_SDE_HISTORICAL_INCIDENCE",
        "activationReasons": [
            "A onda C é complementar e a onda D funciona como controle negativo de proximidade.",
            "Nenhuma questão foi revisada manualmente nesta onda.",
            "Classificações automáticas servem somente para descoberta temática e análise de ruído.",
            "Questões duplicadas com ondas anteriores permanecem excluídas de qualquer denominador.",
            "Gabaritos não estão disponíveis.",
        ],
    }
    (args.output_dir / "wave3-corpus-summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    review = [
        record for record in records
        if not record.get("duplicateType") and not record["crossWaveDuplicate"]
    ]
    review.sort(key=lambda record: (
        0 if record["classificationStatus"] == "AUTO_CLASSIFIED_HIGH_CONFIDENCE" else 1,
        record["examRank"],
        record["questionNumber"],
    ))
    fields = [
        "sourceFilename", "examRank", "examTier", "questionNumber", "page",
        "classificationStatus", "primaryTopicId", "primarySubtopicId", "confidence",
        "matchedTerms", "outOfScopeMatches", "crossWaveDuplicate", "style",
        "stemExcerpt", "questionHash",
    ]
    with (args.output_dir / "wave3-review-queue.csv").open("w", newline="", encoding="utf-8-sig") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        for record in review:
            writer.writerow({
                field: "; ".join(record.get(field, [])) if isinstance(record.get(field), list) else record.get(field)
                for field in fields
            })

    report = [
        "# P1.5 — Ondas C e D do corpus FGV",
        "",
        f"- Provas processadas: **{len(exams)}**.",
        f"- Questões extraídas: **{len(records)}**.",
        f"- Duplicações internas marcadas: **{within_duplicates}**.",
        f"- Duplicações contra as ondas A/B: **{cross_duplicates}**.",
        f"- Candidatas automáticas de alta confiança, sem duplicação cruzada: **{len(high_confidence)}**.",
        "",
        "As ondas C e D permanecem bloqueadas para incidência histórica. A onda D é especialmente útil para medir falsos positivos e ruído do classificador.",
        "",
        "## Extração",
        "",
        "| Prova | Faixa | Extraídas | Declaradas | Sequência |",
        "|---|---|---:|---:|---|",
    ]
    for item in extraction:
        report.append(
            f"| {item['filename']} | {item['tier']} | {item['extractedQuestionCount']} | "
            f"{item['declaredQuestionCount'] if item['declaredQuestionCount'] is not None else 'N/D'} | "
            f"{'completa' if item['completeContiguousSequence'] else 'revisar'} |"
        )
    report += ["", "## Estados", "", "| Estado | Quantidade |", "|---|---:|"]
    for status, count in sorted(status_counts.items(), key=lambda item: (-item[1], item[0])):
        report.append(f"| {status} | {count} |")
    report += [
        "", "## Uso autorizado", "",
        "- Descoberta de candidatos temáticos.",
        "- Análise de estilo de questão.",
        "- Estimativa de ruído/controle negativo.",
        "",
        "## Uso proibido", "",
        "- Incidência histórica no SDE.",
        "- Previsão de cobrança.",
        "- Priorização automática do estudo.",
    ]
    (args.output_dir / "WAVE3_CLASSIFICATION_REPORT.md").write_text("\n".join(report), encoding="utf-8")

    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
