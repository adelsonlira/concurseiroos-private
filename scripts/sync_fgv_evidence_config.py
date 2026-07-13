from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG_DIR = ROOT / "src/config/concursos/dataprev-2026-perfil-3"
DATA_ROOT = ROOT / "data/evidence/dataprev-2026-perfil-3/fgv-exams-37"


def ts_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def format_string_array(items: list[str], indent: str = "    ") -> str:
    return "[" + ", ".join(ts_string(item) for item in items) + "]"


def write_wave1() -> None:
    summary = json.loads((DATA_ROOT / "wave1/wave1-corpus-summary.json").read_text(encoding="utf-8"))
    incidence = json.loads((DATA_ROOT / "wave1/wave1-experimental-incidence.json").read_text(encoding="utf-8"))["evidence"]
    source_lines = [
        "/**",
        " * @license",
        " * SPDX-License-Identifier: Apache-2.0",
        " */",
        "",
        'import { StrategicEvidenceSource, TopicIncidenceEvidence } from "../../../core/evidence/types";',
        "",
        "/**",
        " * Generated from the A1/A2 wave of the 37-exam FGV archive.",
        " * This evidence is intentionally non-activatable: even high-confidence automatic",
        " * classification is not a validated historical-incidence matrix.",
        " */",
        "export const FGV37_WAVE1_SOURCE: StrategicEvidenceSource = {",
        '  id: "fgv-exam-corpus-37-wave1-auto-classified",',
        '  title: "FGV 37 provas — onda A1/A2 segmentada e classificada",',
        '  kind: "OFFICIAL_QUESTION_CORPUS",',
        '  validationStatus: "RAW_UNCURATED",',
        '  documentName: "Provas FGV.zip",',
        f'  questionCount: {summary["rawQuestionCount"]},',
        f'  uniqueQuestionCount: {summary["uniqueQuestionCount"]},',
        '  allowedUses: ["QUESTION_STYLE", "TOPIC_CANDIDATE_DISCOVERY"],',
        '  forbiddenUses: ["SDE_HISTORICAL_INCIDENCE", "OFFICIAL_FACTS"],',
        "  notes: [",
        f'    "Quinze provas A1/A2 foram segmentadas em sequência contínua, totalizando {summary["rawQuestionCount"]:,} questões.",'.replace("1,090", "1.090"),
        f'    "{summary["manuallyReviewedOrExcludedQuestionCount"]} questões receberam revisão manual de tópico ou exclusão.",',
        f'    "A matriz experimental usa {summary["experimentalIncidenceBasisQuestionCount"]} itens: 89 revisados manualmente e 97 candidatos automáticos de alta confiança.",',
        '    "O censo da faixa originalmente marcada como alta confiança revisou 98/98 itens: 94 mantidos e quatro corrigidos.",',
        '    "O holdout independente revisou 22 questões, com 22 classificações corretas e limite inferior de Wilson de 85,1%.",',
        f'    "Os {summary["classificationStatusCounts"]["AUTO_CLASSIFIED_REVIEW_REQUIRED"]} itens REVIEW_REQUIRED e os {summary["classificationStatusCounts"]["UNCLASSIFIED"]} UNCLASSIFIED não foram promovidos.",',
        '    "A distribuição mede participação no corpus selecionado, não probabilidade de cobrança.",',
        '    "A fonte permanece bloqueada para incidência histórica até revisão manual suficiente e validação metodológica."',
        "  ]",
        "};",
        "",
        "export const FGV37_WAVE1_INCIDENCE_EVIDENCE: TopicIncidenceEvidence[] = [",
    ]
    for evidence in incidence:
        source_lines += [
            "  {",
            f'    id: {ts_string(evidence["id"])},',
            f'    topicId: {ts_string(evidence["topicId"])},',
            f'    sourceIds: {format_string_array(evidence["sourceIds"])},',
            f'    status: {ts_string(evidence["status"])},',
            f'    matchedQuestionCount: {evidence["matchedQuestionCount"]},',
            f'    eligibleCorpusQuestionCount: {evidence["eligibleCorpusQuestionCount"]},',
            f'    incidenceRate: {evidence["incidenceRate"]},',
            f'    manuallyReviewedQuestionCount: {evidence["manuallyReviewedQuestionCount"]},',
            f'    deduplicated: {str(evidence["deduplicated"]).lower()},',
            f'    inclusionCriteria: {format_string_array(evidence["inclusionCriteria"])},',
            f'    exclusionCriteria: {format_string_array(evidence["exclusionCriteria"])},',
            f'    notes: {format_string_array(evidence["notes"])},',
            "  },",
        ]
    source_lines += ["];", ""]
    (CONFIG_DIR / "wave1Evidence.ts").write_text("\n".join(source_lines), encoding="utf-8")


def write_wave2() -> None:
    summary = json.loads((DATA_ROOT / "wave2/wave2-corpus-summary.json").read_text(encoding="utf-8"))
    text = f'''/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {{ StrategicEvidenceSource }} from "../../../core/evidence/types";

/**
 * Wave B contains higher-relevance exams, but remains non-activatable.
 * The full original high-confidence stratum was reviewed; lower-confidence and
 * unclassified records still require curatorship.
 */
export const FGV37_WAVE2_SOURCE: StrategicEvidenceSource = {{
  id: "fgv-exam-corpus-37-wave2-auto-classified",
  title: "FGV 37 provas — onda B segmentada e classificada",
  kind: "OFFICIAL_QUESTION_CORPUS",
  validationStatus: "RAW_UNCURATED",
  documentName: "Provas FGV.zip",
  questionCount: {summary["rawQuestionCount"]},
  uniqueQuestionCount: {summary["nonDuplicateQuestionCount"]},
  allowedUses: ["QUESTION_STYLE", "TOPIC_CANDIDATE_DISCOVERY"],
  forbiddenUses: ["SDE_HISTORICAL_INCIDENCE", "OFFICIAL_FACTS"],
  notes: [
    "Treze provas da faixa B foram segmentadas em {summary["rawQuestionCount"]} questões com sequência completa.",
    "Não foram encontradas duplicações exatas ou quase idênticas dentro da onda ou contra a Onda A pelos critérios conservadores usados.",
    "A faixa originalmente marcada como alta confiança teve censo manual de 73 questões: 71 mantidas, uma remapeada e uma excluída.",
    "As {summary["classificationStatusCounts"]["AUTO_CLASSIFIED_REVIEW_REQUIRED"]} questões REVIEW_REQUIRED e as {summary["classificationStatusCounts"]["UNCLASSIFIED"]} UNCLASSIFIED não foram promovidas.",
    "A fonte continua bloqueada para incidência histórica e serve somente a estilo de questão e descoberta de candidatos temáticos."
  ]
}};
'''
    (CONFIG_DIR / "wave2Evidence.ts").write_text(text, encoding="utf-8")


def write_wave3() -> None:
    summary = json.loads((DATA_ROOT / "wave3/wave3-corpus-summary.json").read_text(encoding="utf-8"))
    text = f'''/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {{ StrategicEvidenceSource }} from "../../../core/evidence/types";

/**
 * Waves C/D are complementary and negative-control sources. They remain raw,
 * even after the census of the small unique high-confidence stratum.
 */
export const FGV37_WAVE3_SOURCE: StrategicEvidenceSource = {{
  id: "fgv-exam-corpus-37-wave3-auto-classified",
  title: "FGV 37 provas — ondas C/D segmentadas e classificadas",
  kind: "OFFICIAL_QUESTION_CORPUS",
  validationStatus: "RAW_UNCURATED",
  documentName: "Provas FGV.zip",
  questionCount: {summary["rawQuestionCount"]},
  uniqueQuestionCount: {summary["nonDuplicateQuestionCount"]},
  allowedUses: ["QUESTION_STYLE", "TOPIC_CANDIDATE_DISCOVERY"],
  forbiddenUses: ["SDE_HISTORICAL_INCIDENCE", "OFFICIAL_FACTS"],
  notes: [
    "Nove provas das faixas C/D foram segmentadas em {summary["rawQuestionCount"]} registros de questão.",
    "Foram marcados {summary["withinWaveDuplicateRecordCount"]} registros duplicados dentro da onda e {summary["crossWaveDuplicateRecordCount"]} contra as ondas anteriores.",
    "Restaram {summary["nonDuplicateQuestionCount"]} questões únicas em relação às três ondas.",
    "O censo dos 15 candidatos únicos de alta confiança manteve 15/15 classificações temáticas.",
    "As faixas C/D são complementares ou controle negativo e não entram em qualquer denominador de incidência.",
    "A fonte permanece bloqueada para priorização, previsão de cobrança e fatos oficiais."
  ]
}};
'''
    (CONFIG_DIR / "wave3Evidence.ts").write_text(text, encoding="utf-8")


if __name__ == "__main__":
    write_wave1()
    write_wave2()
    write_wave3()
