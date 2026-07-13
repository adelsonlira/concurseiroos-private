/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StrategicEvidenceSource } from "../../../core/evidence/types";

/**
 * Wave B contains higher-relevance exams, but remains non-activatable.
 * The full original high-confidence stratum was reviewed; lower-confidence and
 * unclassified records still require curatorship.
 */
export const FGV37_WAVE2_SOURCE: StrategicEvidenceSource = {
  id: "fgv-exam-corpus-37-wave2-auto-classified",
  title: "FGV 37 provas — onda B segmentada e classificada",
  kind: "OFFICIAL_QUESTION_CORPUS",
  validationStatus: "RAW_UNCURATED",
  documentName: "Provas FGV.zip",
  questionCount: 860,
  uniqueQuestionCount: 860,
  allowedUses: ["QUESTION_STYLE", "TOPIC_CANDIDATE_DISCOVERY"],
  forbiddenUses: ["SDE_HISTORICAL_INCIDENCE", "OFFICIAL_FACTS"],
  notes: [
    "Treze provas da faixa B foram segmentadas em 860 questões com sequência completa.",
    "Não foram encontradas duplicações exatas ou quase idênticas dentro da onda ou contra a Onda A pelos critérios conservadores usados.",
    "A faixa originalmente marcada como alta confiança teve censo manual de 73 questões: 71 mantidas, uma remapeada e uma excluída.",
    "As 127 questões REVIEW_REQUIRED e as 651 UNCLASSIFIED não foram promovidas.",
    "A fonte continua bloqueada para incidência histórica e serve somente a estilo de questão e descoberta de candidatos temáticos."
  ]
};
