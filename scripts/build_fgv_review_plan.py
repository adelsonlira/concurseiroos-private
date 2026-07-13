from __future__ import annotations

import csv
import json
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA_ROOT = ROOT / "data/evidence/dataprev-2026-perfil-3/fgv-exams-37"


def load(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def main() -> None:
    rows: list[dict[str, Any]] = []
    for wave_number, wave in enumerate(("wave1", "wave2", "wave3"), start=1):
        records = load(DATA_ROOT / wave / f"{wave}-question-corpus.ndjson")
        for record in records:
            if record["classificationStatus"] != "AUTO_CLASSIFIED_REVIEW_REQUIRED":
                continue
            if record.get("duplicateType") or record.get("crossWaveDuplicate"):
                continue
            rows.append({
                "wave": wave,
                "curationPriorityBand": {"wave1": "P1_PRIMARY", "wave2": "P2_HIGH", "wave3": "P3_COMPLEMENTARY"}[wave],
                "examRank": record["examRank"],
                "examTier": record["examTier"],
                "sourceFilename": record["sourceFilename"],
                "questionNumber": record["questionNumber"],
                "page": record["page"],
                "primaryTopicId": record.get("primaryTopicId"),
                "primarySubtopicId": record.get("primarySubtopicId"),
                "confidence": record.get("confidence"),
                "matchedTerms": "; ".join(record.get("matchedTerms", [])),
                "style": record.get("style"),
                "stemExcerpt": record.get("stemExcerpt"),
                "questionHash": record.get("questionHash"),
                "reviewDecision": "PENDING",
                "reviewNote": "",
            })
    rows.sort(key=lambda row: (
        {"P1_PRIMARY": 1, "P2_HIGH": 2, "P3_COMPLEMENTARY": 3}[row["curationPriorityBand"]],
        row["examRank"],
        -(row["confidence"] or 0),
        row["questionNumber"],
    ))

    fields = list(rows[0].keys()) if rows else []
    with (DATA_ROOT / "fgv37-review-required-priority.csv").open("w", newline="", encoding="utf-8-sig") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    summary = {
        "schemaVersion": "1.0.0",
        "generatedAt": "2026-07-13",
        "totalReviewRequiredUniqueQuestions": len(rows),
        "countsByWave": dict(Counter(row["wave"] for row in rows)),
        "countsByPriorityBand": dict(Counter(row["curationPriorityBand"] for row in rows)),
        "candidateCountsByTopic": dict(Counter(row["primaryTopicId"] for row in rows if row["primaryTopicId"])),
        "purpose": "Operational manual-curation queue; it is not a study-priority ranking and cannot influence the SDE.",
    }
    (DATA_ROOT / "fgv37-review-required-priority-summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    report = [
        "# Plano operacional de revisão — 37 provas FGV",
        "",
        f"- Questões únicas em `REVIEW_REQUIRED`: **{len(rows)}**.",
        f"- Prioridade P1 (A1/A2): **{summary['countsByWave'].get('wave1', 0)}**.",
        f"- Prioridade P2 (B): **{summary['countsByWave'].get('wave2', 0)}**.",
        f"- Prioridade P3 (C/D): **{summary['countsByWave'].get('wave3', 0)}**.",
        "",
        "A ordem é exclusivamente de curadoria do corpus. Ela não representa importância para o estudo nem probabilidade de cobrança.",
        "",
        "## Ordem segura",
        "",
        "1. Revisar primeiro as questões A1/A2, por proximidade com o Perfil 3.",
        "2. Depois revisar a faixa B para ampliar cobertura sem misturar cargos de menor proximidade.",
        "3. Usar C/D como complemento e controle de falsos positivos.",
        "4. Manter itens sem classificação segura fora do denominador.",
    ]
    (DATA_ROOT / "FGV37_REVIEW_REQUIRED_PLAN.md").write_text("\n".join(report), encoding="utf-8")


if __name__ == "__main__":
    main()
