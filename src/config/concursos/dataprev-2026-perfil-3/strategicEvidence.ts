/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StrategicEvidencePackage } from "../../../core/evidence/types";
import { FGV37_WAVE1_INCIDENCE_EVIDENCE, FGV37_WAVE1_SOURCE } from "./wave1Evidence";
import { FGV37_WAVE2_SOURCE } from "./wave2Evidence";
import { FGV37_WAVE3_SOURCE } from "./wave3Evidence";

const RAW_CORPUS_ALLOWED_USES = ["QUESTION_STYLE", "TOPIC_CANDIDATE_DISCOVERY"] as const;

export const DATAPREV_2026_PROFILE_3_STRATEGIC_EVIDENCE: StrategicEvidencePackage = {
  version: "1.5.0",
  activationPolicy: {
    minimumManuallyReviewedQuestionsPerTopic: 20,
    requireDeduplication: true,
    requireReproducibleInclusionCriteria: true,
    requireReproducibleExclusionCriteria: true
  },
  sources: [
    {
      id: "dataprev-2026-official-notice",
      title: "Edital DATAPREV 001/2026",
      kind: "OFFICIAL_NOTICE",
      validationStatus: "AUTHORITATIVE",
      yearFrom: 2026,
      yearTo: 2026,
      documentName: "edital-dataprev_supe-versaofinal.pdf",
      allowedUses: ["OFFICIAL_FACTS"],
      forbiddenUses: ["SDE_HISTORICAL_INCIDENCE"],
      notes: [
        "Fonte de autoridade para regras, pesos, datas, conteúdo programático e critérios eliminatórios.",
        "O edital não informa a distribuição de questões por assunto dentro de Conhecimentos Específicos."
      ]
    },
    {
      id: "fgv-question-corpus-2021",
      title: "Questões FGV de TI — 2021",
      kind: "OFFICIAL_QUESTION_CORPUS",
      validationStatus: "RAW_UNCURATED",
      yearFrom: 2021,
      yearTo: 2021,
      documentName: "fgv 2021 questões.pdf",
      sha256: "4f999a169c30597dcf923b553712a38692e842a2de3cc6b3c1ee634177558f13",
      questionCount: 271,
      uniqueQuestionCount: 271,
      allowedUses: [...RAW_CORPUS_ALLOWED_USES],
      forbiddenUses: ["SDE_HISTORICAL_INCIDENCE", "OFFICIAL_FACTS"],
      notes: ["Corpus amplo de TI com conteúdos dentro e fora do Perfil 3; exige filtragem e classificação manual."]
    },
    {
      id: "fgv-question-corpus-2022",
      title: "Questões FGV de TI — 2022",
      kind: "OFFICIAL_QUESTION_CORPUS",
      validationStatus: "RAW_UNCURATED",
      yearFrom: 2022,
      yearTo: 2022,
      documentName: "fgv 2022 questões.pdf",
      sha256: "69ca5d058d7fc2db804cd50b3ef4d0ada86ee0644fc2130f687cab0364dfb7ab",
      questionCount: 444,
      uniqueQuestionCount: 444,
      allowedUses: [...RAW_CORPUS_ALLOWED_USES],
      forbiddenUses: ["SDE_HISTORICAL_INCIDENCE", "OFFICIAL_FACTS"],
      notes: ["Corpus amplo de TI com conteúdos dentro e fora do Perfil 3; exige filtragem e classificação manual."]
    },
    {
      id: "fgv-question-corpus-2023",
      title: "Questões FGV de TI — 2023",
      kind: "OFFICIAL_QUESTION_CORPUS",
      validationStatus: "RAW_UNCURATED",
      yearFrom: 2023,
      yearTo: 2023,
      documentName: "fgv 2023 questões.pdf",
      sha256: "ac1cf4acf0ee059c5e9a54828a5c68e145c6cc8e2b36ef004955a59e9d0311aa",
      questionCount: 598,
      uniqueQuestionCount: 598,
      allowedUses: [...RAW_CORPUS_ALLOWED_USES],
      forbiddenUses: ["SDE_HISTORICAL_INCIDENCE", "OFFICIAL_FACTS"],
      notes: ["Corpus amplo de TI com conteúdos dentro e fora do Perfil 3; exige filtragem e classificação manual."]
    },
    {
      id: "fgv-question-corpus-2024",
      title: "Questões FGV de TI — 2024",
      kind: "OFFICIAL_QUESTION_CORPUS",
      validationStatus: "RAW_UNCURATED",
      yearFrom: 2024,
      yearTo: 2024,
      documentName: "fgv 2024 questões.pdf",
      sha256: "4337711ee93430ddd58a0ac0a4c158c5942018b5e2e8837f7a52ed1ed4e44b45",
      questionCount: 988,
      uniqueQuestionCount: 988,
      allowedUses: [...RAW_CORPUS_ALLOWED_USES],
      forbiddenUses: ["SDE_HISTORICAL_INCIDENCE", "OFFICIAL_FACTS"],
      notes: [
        "Inclui questões diretamente relacionadas à DATAPREV 2024, além de muitas questões de outros cargos e especialidades.",
        "Exige deduplicação entre exportações e validação de aderência ao edital atual."
      ]
    },
    {
      id: "fgv-question-corpus-2025",
      title: "Questões FGV de TI — 2025",
      kind: "OFFICIAL_QUESTION_CORPUS",
      validationStatus: "RAW_UNCURATED",
      yearFrom: 2025,
      yearTo: 2025,
      documentName: "fgv 2025 questões.pdf",
      sha256: "18757fc1009766b0d11c23bec9c5ffa85075eb4e8e0ad724be53b0297421c9ae",
      questionCount: 600,
      uniqueQuestionCount: 600,
      allowedUses: [...RAW_CORPUS_ALLOWED_USES],
      forbiddenUses: ["SDE_HISTORICAL_INCIDENCE", "OFFICIAL_FACTS"],
      notes: ["Corpus amplo de TI com forte presença de cargos de redes e infraestrutura; exige filtragem temática."]
    },
    {
      id: "fgv-question-corpus-2026",
      title: "Questões FGV de TI — 2026",
      kind: "OFFICIAL_QUESTION_CORPUS",
      validationStatus: "RAW_UNCURATED",
      yearFrom: 2026,
      yearTo: 2026,
      documentName: "fgv 2026 questões.pdf",
      sha256: "ae3dadcdd5ce1910f02a4dff9359a885dc9797659fc558cd332ee0e5f34931a7",
      questionCount: 451,
      uniqueQuestionCount: 451,
      allowedUses: [...RAW_CORPUS_ALLOWED_USES],
      forbiddenUses: ["SDE_HISTORICAL_INCIDENCE", "OFFICIAL_FACTS"],
      notes: ["Corpus parcial até a data de exportação; não representa necessariamente o ano completo."]
    },
    {
      id: "fgv-dataprev-development-software-reference-exam",
      title: "Prova FGV DATAPREV — Desenvolvimento de Software",
      kind: "OFFICIAL_QUESTION_CORPUS",
      validationStatus: "RAW_UNCURATED",
      documentName: "analista_de_tecnologia_da_informacao_desenvolvimento_de_software.pdf",
      sha256: "962a9c53f78ef3ce4760dbe1e3bf69077755ef966ef2199c3a5b79630738a78d",
      questionCount: 70,
      uniqueQuestionCount: 70,
      allowedUses: [...RAW_CORPUS_ALLOWED_USES],
      forbiddenUses: ["SDE_HISTORICAL_INCIDENCE", "OFFICIAL_FACTS"],
      notes: [
        "Fonte de maior proximidade: mesmo órgão e especialidade de Desenvolvimento de Software.",
        "As 30 questões específicas, de 41 a 70, foram classificadas manualmente por tópico no arquivo dataprev-reference-exam-question-map.json.",
        "O gabarito não foi fornecido; a fonte pode sustentar análise temática e de formato, mas não análise de acertos, distratores, anulações ou ativação automática de incidência.",
        "A prova também está contida no arquivo agregado Provas FGV.zip; contagens entre fontes não devem ser somadas sem deduplicação."
      ]
    },
    {
      id: "fgv-exam-corpus-37-development-oriented",
      title: "37 provas FGV de TI — foco em desenvolvimento e análise de sistemas",
      kind: "OFFICIAL_QUESTION_CORPUS",
      validationStatus: "RAW_UNCURATED",
      documentName: "Provas FGV.zip",
      sha256: "312fec3c3cf7a21b49ab05e04b9a9049e42f6190826c19647fa7d800c2e64872",
      allowedUses: [...RAW_CORPUS_ALLOWED_USES],
      forbiddenUses: ["SDE_HISTORICAL_INCIDENCE", "OFFICIAL_FACTS"],
      notes: [
        "Arquivo com 37 cadernos de prova e 703 páginas, sem gabaritos, inventariado em data/evidence/dataprev-2026-perfil-3/fgv-exams-37.",
        "Uma prova é da própria DATAPREV para Desenvolvimento de Software; as demais possuem graus diferentes de proximidade temática.",
        "O ranking de relevância é somente uma triagem automática e não constitui matriz de incidência.",
        "A ativação no SDE exige segmentação por questão, deduplicação, classificação no edital e revisão manual reproduzível."
      ]
    },
    FGV37_WAVE1_SOURCE,
    FGV37_WAVE2_SOURCE,
    FGV37_WAVE3_SOURCE,
    {
      id: "third-party-dataprev-incidence-study",
      title: "DATAPREV 2026 — Desenvolvimento de Software — estudo de terceiros",
      kind: "SECONDARY_ANALYSIS",
      validationStatus: "PENDING_REPRODUCTION",
      yearFrom: 2023,
      yearTo: 2026,
      documentName: "Estudo de terceitos.docx",
      allowedUses: ["TOPIC_CANDIDATE_DISCOVERY", "COACH_QUALITATIVE_CONTEXT"],
      forbiddenUses: ["SDE_HISTORICAL_INCIDENCE", "OFFICIAL_FACTS"],
      notes: [
        "O relatório declara aproximadamente 800 questões em 20 provas, mas não apresenta a lista auditável das provas e questões classificadas.",
        "As contagens são identificadas como estimativas e não demonstram critérios de deduplicação, inclusão ou exclusão reproduzíveis."
      ]
    },
    {
      id: "notebooklm-cross-analysis",
      title: "Síntese NotebookLM — cruzamento edital x questões",
      kind: "AI_SYNTHESIS",
      validationStatus: "PENDING_REPRODUCTION",
      yearFrom: 2021,
      yearTo: 2026,
      allowedUses: ["TOPIC_CANDIDATE_DISCOVERY"],
      forbiddenUses: ["SDE_HISTORICAL_INCIDENCE", "OFFICIAL_FACTS", "COACH_QUALITATIVE_CONTEXT"],
      notes: [
        "Usada somente para formular hipóteses de filtragem e estilo de cobrança.",
        "Nenhuma afirmação produzida pela IA pode alterar prioridade sem rastreabilidade até as questões-fonte."
      ]
    },
    {
      id: "expert-video-sprint-questions-fgv",
      title: "DATAPREV pós-edital — sprint de questões FGV",
      kind: "EXPERT_VIDEO",
      validationStatus: "PENDING_TRANSCRIPT",
      yearFrom: 2026,
      yearTo: 2026,
      uri: "https://www.youtube.com/watch?v=sX_PfUwRIeM",
      allowedUses: ["COACH_QUALITATIVE_CONTEXT", "TOPIC_CANDIDATE_DISCOVERY"],
      forbiddenUses: ["SDE_HISTORICAL_INCIDENCE", "OFFICIAL_FACTS"],
      notes: ["Aguardando transcrição e extração de afirmações verificáveis."]
    },
    {
      id: "expert-video-how-to-start",
      title: "Concurso DATAPREV — como iniciar os estudos",
      kind: "EXPERT_VIDEO",
      validationStatus: "PENDING_TRANSCRIPT",
      yearFrom: 2026,
      yearTo: 2026,
      uri: "https://www.youtube.com/watch?v=06Yp78zc2Pw",
      allowedUses: ["COACH_QUALITATIVE_CONTEXT", "TOPIC_CANDIDATE_DISCOVERY"],
      forbiddenUses: ["SDE_HISTORICAL_INCIDENCE", "OFFICIAL_FACTS"],
      notes: ["Aguardando transcrição e extração de afirmações verificáveis."]
    },
    {
      id: "expert-video-post-edital-plan-it",
      title: "DATAPREV 2026 — plano de estudos pós-edital para TI",
      kind: "EXPERT_VIDEO",
      validationStatus: "PENDING_TRANSCRIPT",
      yearFrom: 2026,
      yearTo: 2026,
      uri: "https://www.youtube.com/watch?v=Nbsq1bsLPxE",
      allowedUses: ["COACH_QUALITATIVE_CONTEXT", "TOPIC_CANDIDATE_DISCOVERY"],
      forbiddenUses: ["SDE_HISTORICAL_INCIDENCE", "OFFICIAL_FACTS"],
      notes: ["Aguardando transcrição e extração de afirmações verificáveis."]
    }
  ],
  incidenceEvidence: FGV37_WAVE1_INCIDENCE_EVIDENCE,
  externalEstimates: [
    {
      id: "third-party-estimate-database",
      label: "Banco de Dados",
      sourceId: "third-party-dataprev-incidence-study",
      estimatedQuestionCount: 115,
      estimatedFrequency: 0.143,
      trend: "ESTAVEL",
      status: "UNVERIFIED_EXTERNAL_ESTIMATE",
      notes: ["Valor não reproduzido a partir de uma lista auditável de questões."]
    },
    {
      id: "third-party-estimate-security",
      label: "Segurança da Informação",
      sourceId: "third-party-dataprev-incidence-study",
      estimatedQuestionCount: 112,
      estimatedFrequency: 0.14,
      trend: "CRESCENTE",
      status: "UNVERIFIED_EXTERNAL_ESTIMATE",
      notes: ["Valor não reproduzido a partir de uma lista auditável de questões."]
    },
    {
      id: "third-party-estimate-software-engineering",
      label: "Engenharia de Software",
      sourceId: "third-party-dataprev-incidence-study",
      estimatedQuestionCount: 108,
      estimatedFrequency: 0.135,
      trend: "ESTAVEL",
      status: "UNVERIFIED_EXTERNAL_ESTIMATE",
      notes: ["Valor não reproduzido a partir de uma lista auditável de questões."]
    },
    {
      id: "third-party-estimate-development",
      label: "Desenvolvimento Java/Spring/Hibernate",
      sourceId: "third-party-dataprev-incidence-study",
      estimatedQuestionCount: 100,
      estimatedFrequency: 0.125,
      trend: "ESTAVEL",
      status: "UNVERIFIED_EXTERNAL_ESTIMATE",
      notes: ["Valor não reproduzido a partir de uma lista auditável de questões."]
    },
    {
      id: "third-party-estimate-ai-data",
      label: "IA, Ciência de Dados e Big Data",
      sourceId: "third-party-dataprev-incidence-study",
      estimatedQuestionCount: 88,
      estimatedFrequency: 0.11,
      trend: "CRESCENTE",
      status: "UNVERIFIED_EXTERNAL_ESTIMATE",
      notes: ["Valor não reproduzido a partir de uma lista auditável de questões."]
    },
    {
      id: "third-party-estimate-architecture",
      label: "Arquitetura e Integração",
      sourceId: "third-party-dataprev-incidence-study",
      estimatedQuestionCount: 84,
      estimatedFrequency: 0.105,
      trend: "CRESCENTE",
      status: "UNVERIFIED_EXTERNAL_ESTIMATE",
      notes: ["Valor não reproduzido a partir de uma lista auditável de questões."]
    },
    {
      id: "third-party-estimate-governance",
      label: "Governança e Gestão",
      sourceId: "third-party-dataprev-incidence-study",
      estimatedQuestionCount: 72,
      estimatedFrequency: 0.09,
      trend: "ESTAVEL",
      status: "UNVERIFIED_EXTERNAL_ESTIMATE",
      notes: ["Valor não reproduzido a partir de uma lista auditável de questões."]
    },
    {
      id: "third-party-estimate-frontend",
      label: "Frontend",
      sourceId: "third-party-dataprev-incidence-study",
      estimatedQuestionCount: 64,
      estimatedFrequency: 0.08,
      trend: "ESTAVEL",
      status: "UNVERIFIED_EXTERNAL_ESTIMATE",
      notes: ["Valor não reproduzido a partir de uma lista auditável de questões."]
    },
    {
      id: "third-party-estimate-agile",
      label: "Metodologias Ágeis",
      sourceId: "third-party-dataprev-incidence-study",
      estimatedQuestionCount: 56,
      estimatedFrequency: 0.07,
      trend: "ESTAVEL",
      status: "UNVERIFIED_EXTERNAL_ESTIMATE",
      notes: ["Valor não reproduzido a partir de uma lista auditável de questões."]
    },
    {
      id: "third-party-estimate-tests-devops",
      label: "Testes e DevOps",
      sourceId: "third-party-dataprev-incidence-study",
      estimatedQuestionCount: 48,
      estimatedFrequency: 0.06,
      trend: "ESTAVEL",
      status: "UNVERIFIED_EXTERNAL_ESTIMATE",
      notes: ["Valor não reproduzido a partir de uma lista auditável de questões."]
    }
  ]
};
