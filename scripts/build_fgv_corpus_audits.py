from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[1]
DATA_ROOT = ROOT / "data/evidence/dataprev-2026-perfil-3/fgv-exams-37"
GENERATED_AT = "2026-07-13"


@dataclass(frozen=True)
class Correction:
    automatic_subtopic: str | None
    automatic_topic: str | None
    final_subtopic: str | None
    final_topic: str | None
    verdict: str
    action: str
    note: str


WAVE1_CORRECTIONS: dict[tuple[str, int], Correction] = {
    (
        "analista_previdenciario_especialidade_analista_de_sistemas.pdf",
        62,
    ): Correction(
        automatic_subtopic="dp26-p3-esp-ia-dados-bigdata",
        automatic_topic="dp26-p3-esp-desenvolvimento-sistemas",
        final_subtopic="dp26-p3-esp-bi-dw-mining",
        final_topic="dp26-p3-esp-bi",
        verdict="CORRECTED",
        action="RULE_CORRECTION",
        note="O objeto explícito é Data Mining/KDD; aprendizado de máquina aparece como técnica de apoio, não como conteúdo principal de IA.",
    ),
    (
        "2025 DPE RO - analista_de_sistemas_classe_b.pdf",
        63,
    ): Correction(
        automatic_subtopic="dp26-p3-esp-linguagens-frameworks",
        automatic_topic="dp26-p3-esp-desenvolvimento-sistemas",
        final_subtopic="dp26-p3-esp-testes",
        final_topic="dp26-p3-esp-desenvolvimento-sistemas",
        verdict="CORRECTED",
        action="RULE_CORRECTION",
        note="A questão relaciona frameworks de teste (JUnit, Mockito, Selenium e Jest); as linguagens são contexto secundário.",
    ),
    (
        "analista_do_mpu_desenvolvimento_de_sistemas.pdf",
        66,
    ): Correction(
        automatic_subtopic="dp26-p3-esp-padroes-dados-web",
        automatic_topic="dp26-p3-esp-desenvolvimento-sistemas",
        final_subtopic="dp26-p3-esp-requisitos",
        final_topic="dp26-p3-esp-desenvolvimento-sistemas",
        verdict="CORRECTED",
        action="RULE_CORRECTION",
        note="O objeto é classificação/engenharia de requisitos; JSON e XML aparecem apenas na descrição da solução.",
    ),
    (
        "2025 DPE RO - analista_de_sistemas_classe_b.pdf",
        41,
    ): Correction(
        automatic_subtopic="dp26-p3-esp-metodologias-ageis",
        automatic_topic="dp26-p3-esp-desenvolvimento-sistemas",
        final_subtopic="dp26-p3-esp-testes",
        final_topic="dp26-p3-esp-desenvolvimento-sistemas",
        verdict="CORRECTED",
        action="MANUAL_REMAP",
        note="TDD é o objeto principal; XP e metodologias ágeis constituem o contexto.",
    ),
}

WAVE2_CORRECTIONS: dict[tuple[str, int], Correction] = {
    (
        "2023 DNIT analista_administrativo_tecnologia_da_informacao.pdf",
        76,
    ): Correction(
        automatic_subtopic="dp26-p3-esp-bd-nosql",
        automatic_topic="dp26-p3-esp-banco-dados",
        final_subtopic="dp26-p3-esp-si-riscos",
        final_topic="dp26-p3-esp-seguranca",
        verdict="CORRECTED",
        action="MANUAL_REMAP",
        note="O objeto é segurança e ameaças em bancos de dados; NoSQL aparece como vetor de injeção, não como modelo de dados.",
    ),
    (
        "EBSERH analista_de_tecnologia_da_informacao.pdf",
        59,
    ): Correction(
        automatic_subtopic="dp26-p3-esp-padroes-dados-web",
        automatic_topic="dp26-p3-esp-desenvolvimento-sistemas",
        final_subtopic=None,
        final_topic=None,
        verdict="EXCLUDED",
        action="MANUAL_EXCLUDE_FALSE_POSITIVE",
        note="O objeto é uma regra normativa do domínio da saúde; REST/XML aparecem incidentalmente.",
    ),
}

CSV_FIELDS = [
    "sourceFilename",
    "questionNumber",
    "page",
    "automaticSubtopicId",
    "finalSubtopicId",
    "automaticTopicId",
    "finalTopicId",
    "verdict",
    "action",
    "reviewNote",
    "questionHash",
    "stemExcerpt",
]


def load_ndjson(path: Path) -> list[dict[str, Any]]:
    return [
        json.loads(line)
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def audit_record(record: dict[str, Any], correction: Correction | None) -> dict[str, Any]:
    if correction is None:
        automatic_subtopic = record.get("primarySubtopicId")
        automatic_topic = record.get("primaryTopicId")
        final_subtopic = automatic_subtopic
        final_topic = automatic_topic
        verdict = "PASS"
        action = "KEEP_AUTO_HIGH_CONFIDENCE"
        note = "Classificação temática revisada no censo da faixa de alta confiança; nenhum conflito adicional identificado."
    else:
        automatic_subtopic = correction.automatic_subtopic
        automatic_topic = correction.automatic_topic
        final_subtopic = correction.final_subtopic
        final_topic = correction.final_topic
        verdict = correction.verdict
        action = correction.action
        note = correction.note

    return {
        "sourceFilename": record["sourceFilename"],
        "questionNumber": record["questionNumber"],
        "page": record["page"],
        "automaticSubtopicId": automatic_subtopic,
        "finalSubtopicId": final_subtopic,
        "automaticTopicId": automatic_topic,
        "finalTopicId": final_topic,
        "verdict": verdict,
        "action": action,
        "reviewNote": note,
        "questionHash": record["questionHash"],
        "stemExcerpt": record["stemExcerpt"],
    }


def write_audit(
    wave_dir: Path,
    base_name: str,
    title: str,
    audit_type: str,
    records: list[dict[str, Any]],
    limitations: list[str],
    corrections_summary: list[str],
    denominator_note: str,
) -> None:
    pass_count = sum(record["verdict"] == "PASS" for record in records)
    corrected_count = sum(record["verdict"] == "CORRECTED" for record in records)
    excluded_count = sum(record["verdict"] == "EXCLUDED" for record in records)
    reviewed = len(records)
    precision = pass_count / reviewed if reviewed else 0.0

    with (wave_dir / f"{base_name}.csv").open("w", newline="", encoding="utf-8-sig") as stream:
        writer = csv.DictWriter(stream, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(records)

    payload = {
        "schemaVersion": "1.0.0",
        "generatedAt": GENERATED_AT,
        "auditType": audit_type,
        "reviewedQuestionCount": reviewed,
        "passCount": pass_count,
        "correctedCount": corrected_count,
        "excludedCount": excluded_count,
        "preCorrectionAutomaticPrecision": round(precision, 6),
        "denominatorNote": denominator_note,
        "scopeLimitations": limitations,
        "records": records,
    }
    (wave_dir / f"{base_name}.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    lines = [
        f"# {title}",
        "",
        "## Escopo",
        "",
        f"- Questões revisadas: **{reviewed}/{reviewed}**.",
        f"- Mantidas sem correção: **{pass_count}**.",
        f"- Remapeadas/corrigidas: **{corrected_count}**.",
        f"- Excluídas por falso positivo: **{excluded_count}**.",
        f"- Precisão temática automática observada antes das correções: **{pass_count}/{reviewed} = {precision * 100:.2f}%**.",
        "",
        f"**Denominador:** {denominator_note}",
        "",
    ]
    if corrections_summary:
        lines += ["## Correções realizadas", ""]
        lines += [f"{index}. {text}" for index, text in enumerate(corrections_summary, start=1)]
        lines.append("")
    lines += ["## Limites", ""]
    lines += [f"- {item}" for item in limitations]
    lines += [
        "",
        "Esta auditoria não autoriza o uso do corpus como `SDE_HISTORICAL_INCIDENCE`.",
    ]
    (wave_dir / f"{base_name.replace(chr(45), chr(95)).upper()}.md").write_text("\n".join(lines), encoding="utf-8")


def find_record(rows: Iterable[dict[str, Any]], key: tuple[str, int]) -> dict[str, Any]:
    filename, question_number = key
    return next(
        record
        for record in rows
        if record["sourceFilename"] == filename and record["questionNumber"] == question_number
    )


def build_wave1() -> dict[str, Any]:
    wave_dir = DATA_ROOT / "wave1"
    rows = load_ndjson(wave_dir / "wave1-question-corpus.ndjson")
    selected = [
        record
        for record in rows
        if record["classificationStatus"] == "AUTO_CLASSIFIED_HIGH_CONFIDENCE"
    ]
    # Q41 was originally part of the automatic high-confidence stratum and is now manual.
    selected.append(find_record(rows, ("2025 DPE RO - analista_de_sistemas_classe_b.pdf", 41)))
    selected.sort(key=lambda record: (record["examRank"], record["questionNumber"]))
    audited = [
        audit_record(record, WAVE1_CORRECTIONS.get((record["sourceFilename"], record["questionNumber"])))
        for record in selected
    ]
    write_audit(
        wave_dir=wave_dir,
        base_name="wave1-high-confidence-census-audit",
        title="P1.3 — Auditoria censitária da faixa de alta confiança da Onda A1/A2",
        audit_type="FULL_CENSUS_OF_ORIGINAL_AUTO_HIGH_CONFIDENCE_STRATUM",
        records=audited,
        denominator_note="98 questões originalmente classificadas como alta confiança na Onda A1/A2.",
        corrections_summary=[correction.note for correction in WAVE1_CORRECTIONS.values()],
        limitations=[
            "O censo cobre apenas a faixa originalmente marcada como alta confiança.",
            "Os 184 itens REVIEW_REQUIRED e os 701 UNCLASSIFIED não foram validados por este censo.",
            "A revisão foi usada para corrigir regras; portanto, não é um holdout independente.",
            "O holdout independente de 22 questões permanece documentado separadamente.",
            "Gabaritos, distratores e anulações não foram analisados.",
        ],
    )
    return {
        "reviewed": len(audited),
        "pass": sum(record["verdict"] == "PASS" for record in audited),
        "corrected": sum(record["verdict"] == "CORRECTED" for record in audited),
        "excluded": sum(record["verdict"] == "EXCLUDED" for record in audited),
    }


def build_wave2() -> dict[str, Any]:
    wave_dir = DATA_ROOT / "wave2"
    rows = load_ndjson(wave_dir / "wave2-question-corpus.ndjson")
    selected = [
        record
        for record in rows
        if record["classificationStatus"] == "AUTO_CLASSIFIED_HIGH_CONFIDENCE"
        and not record.get("crossWaveDuplicate")
    ]
    for key in WAVE2_CORRECTIONS:
        selected.append(find_record(rows, key))
    selected.sort(key=lambda record: (record["examRank"], record["questionNumber"]))
    audited = [
        audit_record(record, WAVE2_CORRECTIONS.get((record["sourceFilename"], record["questionNumber"])))
        for record in selected
    ]
    write_audit(
        wave_dir=wave_dir,
        base_name="wave2-high-confidence-census-audit",
        title="P1.4 — Auditoria censitária da faixa de alta confiança da Onda B",
        audit_type="FULL_CENSUS_OF_ORIGINAL_AUTO_HIGH_CONFIDENCE_STRATUM",
        records=audited,
        denominator_note="73 questões originalmente classificadas como alta confiança na Onda B.",
        corrections_summary=[correction.note for correction in WAVE2_CORRECTIONS.values()],
        limitations=[
            "O censo cobre apenas a faixa originalmente marcada como alta confiança.",
            "Os 127 itens REVIEW_REQUIRED e os 651 UNCLASSIFIED não foram validados por este censo.",
            "A revisão foi usada para corrigir regras; não é um holdout independente.",
            "Gabaritos, distratores e anulações não foram analisados.",
        ],
    )
    return {
        "reviewed": len(audited),
        "pass": sum(record["verdict"] == "PASS" for record in audited),
        "corrected": sum(record["verdict"] == "CORRECTED" for record in audited),
        "excluded": sum(record["verdict"] == "EXCLUDED" for record in audited),
    }


def build_wave3() -> dict[str, Any]:
    wave_dir = DATA_ROOT / "wave3"
    rows = load_ndjson(wave_dir / "wave3-question-corpus.ndjson")
    selected = [
        record
        for record in rows
        if record["classificationStatus"] == "AUTO_CLASSIFIED_HIGH_CONFIDENCE"
        and not record.get("duplicateType")
        and not record.get("crossWaveDuplicate")
    ]
    selected.sort(key=lambda record: (record["examRank"], record["questionNumber"]))
    audited = [audit_record(record, None) for record in selected]
    write_audit(
        wave_dir=wave_dir,
        base_name="wave3-high-confidence-census-audit",
        title="P1.5 — Auditoria censitária da faixa de alta confiança das Ondas C/D",
        audit_type="FULL_CENSUS_OF_UNIQUE_NON_DUPLICATE_AUTO_HIGH_CONFIDENCE_STRATUM",
        records=audited,
        denominator_note="15 questões únicas, não duplicadas, classificadas como alta confiança nas Ondas C/D.",
        corrections_summary=[],
        limitations=[
            "O censo cobre somente 15 candidatos únicos de alta confiança; cinco registros adicionais de alta confiança eram duplicados.",
            "As faixas C e D são complementares/controle negativo e não representam o corpus principal de proximidade.",
            "Os 78 itens REVIEW_REQUIRED e os 470 UNCLASSIFIED não foram validados por este censo.",
            "O censo não é um holdout independente e não mede incidência.",
            "Gabaritos, distratores e anulações não foram analisados.",
        ],
    )
    return {
        "reviewed": len(audited),
        "pass": len(audited),
        "corrected": 0,
        "excluded": 0,
    }


def build_combined_status(wave1: dict[str, Any], wave2: dict[str, Any], wave3: dict[str, Any]) -> None:
    summaries = {
        wave: json.loads((DATA_ROOT / wave / f"{wave}-corpus-summary.json").read_text(encoding="utf-8"))
        for wave in ("wave1", "wave2", "wave3")
    }
    raw_total = sum(summary["rawQuestionCount"] for summary in summaries.values())
    unique_total = (
        summaries["wave1"]["uniqueQuestionCount"]
        + summaries["wave2"]["nonDuplicateQuestionCount"]
        + summaries["wave3"]["nonDuplicateQuestionCount"]
    )
    payload = {
        "schemaVersion": "1.0.0",
        "generatedAt": GENERATED_AT,
        "examCount": sum(summary["examCount"] for summary in summaries.values()),
        "rawQuestionRecordCount": raw_total,
        "uniqueQuestionCountAcrossWaves": unique_total,
        "withinWaveDuplicateRecordCount": summaries["wave1"].get("duplicateQuestionCount", 0) + summaries["wave2"].get("withinWaveDuplicateRecordCount", 0) + summaries["wave3"].get("withinWaveDuplicateRecordCount", 0),
        "crossWaveDuplicateRecordCount": summaries["wave2"].get("crossWaveDuplicateRecordCount", 0) + summaries["wave3"].get("crossWaveDuplicateRecordCount", 0),
        "audits": {
            "wave1": wave1,
            "wave2": wave2,
            "wave3": wave3,
        },
        "independentHoldout": {
            "wave": "wave1",
            "reviewedQuestionCount": 22,
            "correctCount": 22,
            "observedAccuracy": 1.0,
            "wilson95LowerBound": 0.851,
        },
        "activationStatus": "NOT_ELIGIBLE_FOR_SDE_HISTORICAL_INCIDENCE",
        "remainingBlockingCounts": {
            "wave1ReviewRequiredRaw": summaries["wave1"]["classificationStatusCounts"].get("AUTO_CLASSIFIED_REVIEW_REQUIRED", 0),
            "wave2ReviewRequiredRaw": summaries["wave2"]["classificationStatusCounts"].get("AUTO_CLASSIFIED_REVIEW_REQUIRED", 0),
            "wave3ReviewRequiredRaw": summaries["wave3"]["classificationStatusCounts"].get("AUTO_CLASSIFIED_REVIEW_REQUIRED", 0),
            "totalReviewRequiredRaw": sum(
                summary["classificationStatusCounts"].get("AUTO_CLASSIFIED_REVIEW_REQUIRED", 0)
                for summary in summaries.values()
            ),
            "wave1ReviewRequiredUnique": 184,
            "wave2ReviewRequiredUnique": 127,
            "wave3ReviewRequiredUnique": 72,
            "totalReviewRequiredUnique": 383,
        },
        "activationReasons": [
            "Somente as faixas automáticas de alta confiança foram censitadas integralmente.",
            "Há 383 questões únicas em REVIEW_REQUIRED sem decisão temática individual nas três ondas.",
            "As ondas B/C/D não possuem holdout independente próprio.",
            "Não há gabaritos para análise de distratores, anulações e uso em simulados.",
            "A matriz experimental da Onda A1/A2 não representa probabilidade de cobrança na DATAPREV.",
        ],
    }
    (DATA_ROOT / "fgv37-curation-status.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    wave1 = build_wave1()
    wave2 = build_wave2()
    wave3 = build_wave3()
    build_combined_status(wave1, wave2, wave3)
