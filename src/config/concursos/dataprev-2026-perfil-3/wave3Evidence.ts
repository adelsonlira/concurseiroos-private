/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StrategicEvidenceSource } from "../../../core/evidence/types";

/**
 * Waves C/D are complementary and negative-control sources. They remain raw,
 * even after the census of the small unique high-confidence stratum.
 */
export const FGV37_WAVE3_SOURCE: StrategicEvidenceSource = {
  id: "fgv-exam-corpus-37-wave3-auto-classified",
  title: "FGV 37 provas — ondas C/D segmentadas e classificadas",
  kind: "OFFICIAL_QUESTION_CORPUS",
  validationStatus: "RAW_UNCURATED",
  documentName: "Provas FGV.zip",
  questionCount: 572,
  uniqueQuestionCount: 413,
  allowedUses: ["QUESTION_STYLE", "TOPIC_CANDIDATE_DISCOVERY"],
  forbiddenUses: ["SDE_HISTORICAL_INCIDENCE", "OFFICIAL_FACTS"],
  notes: [
    "Nove provas das faixas C/D foram segmentadas em 572 registros de questão.",
    "Foram marcados 30 registros duplicados dentro da onda e 129 contra as ondas anteriores.",
    "Restaram 413 questões únicas em relação às três ondas.",
    "O censo dos 15 candidatos únicos de alta confiança manteve 15/15 classificações temáticas.",
    "As faixas C/D são complementares ou controle negativo e não entram em qualquer denominador de incidência.",
    "A fonte permanece bloqueada para priorização, previsão de cobrança e fatos oficiais."
  ]
};
