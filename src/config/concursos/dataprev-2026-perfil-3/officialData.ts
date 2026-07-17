/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Assunto,
  Disciplina,
  EditalConfig,
  KnowledgeGraph,
  Subassunto
} from "../../../core/sde/prioritization/types";
import { CompetitionConfigurationPackage } from "../types";
import { buildHistoricalIncidenceMap } from "../../../core/evidence/evidencePolicy";
import { DATAPREV_2026_PROFILE_3_STRATEGIC_EVIDENCE } from "./strategicEvidence";
import { DATAPREV_2026_PROFILE_3_STUDY_GUIDANCE } from "./studyGuidance";

export const DATAPREV_2026_PROFILE_3_ID = "dataprev-2026-perfil-3";

const DISCIPLINE = {
  PORTUGUESE: "dp26-p3-portugues",
  ENGLISH: "dp26-p3-ingles",
  LOGIC: "dp26-p3-raciocinio-logico",
  CURRENT_AI: "dp26-p3-atualidades-ia",
  LEGISLATION: "dp26-p3-legislacao-si-dados",
  SPECIFIC: "dp26-p3-conhecimentos-especificos"
} as const;

interface TopicDefinition {
  id: string;
  name: string;
  subtopics: { id: string; name: string }[];
}

interface DisciplineDefinition {
  id: string;
  name: string;
  questions: number;
  pointsPerQuestion: number;
  topics: TopicDefinition[];
}

const DEFINITIONS: DisciplineDefinition[] = [
  {
    id: DISCIPLINE.PORTUGUESE,
    name: "Língua Portuguesa",
    questions: 12,
    pointsPerQuestion: 1,
    topics: [
      {
        id: "dp26-p3-por-interpretacao",
        name: "Compreensão e interpretação de textos",
        subtopics: [
          { id: "dp26-p3-por-interpretacao-generos", name: "Compreensão e interpretação de textos de gêneros variados" }
        ]
      },
      {
        id: "dp26-p3-por-tipos-generos",
        name: "Tipos e gêneros textuais",
        subtopics: [
          { id: "dp26-p3-por-tipos-generos-reconhecimento", name: "Reconhecimento de tipos e gêneros textuais" }
        ]
      },
      {
        id: "dp26-p3-por-ortografia",
        name: "Ortografia oficial",
        subtopics: [
          { id: "dp26-p3-por-ortografia-dominio", name: "Domínio da ortografia oficial" }
        ]
      },
      {
        id: "dp26-p3-por-coesao",
        name: "Mecanismos de coesão textual",
        subtopics: [
          { id: "dp26-p3-por-coesao-referenciacao", name: "Referenciação, substituição, repetição, conectores e sequenciação textual" },
          { id: "dp26-p3-por-coesao-tempos-modos", name: "Emprego de tempos e modos verbais" }
        ]
      },
      {
        id: "dp26-p3-por-morfossintaxe",
        name: "Estrutura morfossintática do período",
        subtopics: [
          { id: "dp26-p3-por-classes-palavras", name: "Emprego das classes de palavras" },
          { id: "dp26-p3-por-coordenacao", name: "Relações de coordenação entre orações e termos" },
          { id: "dp26-p3-por-subordinacao", name: "Relações de subordinação entre orações e termos" },
          { id: "dp26-p3-por-pontuacao", name: "Emprego dos sinais de pontuação" },
          { id: "dp26-p3-por-concordancia", name: "Concordância verbal e nominal" },
          { id: "dp26-p3-por-regencia", name: "Regência verbal e nominal" },
          { id: "dp26-p3-por-crase", name: "Emprego do sinal indicativo de crase" },
          { id: "dp26-p3-por-colocacao-pronominal", name: "Colocação dos pronomes átonos" }
        ]
      },
      {
        id: "dp26-p3-por-reescrita",
        name: "Reescrita de frases e parágrafos",
        subtopics: [
          { id: "dp26-p3-por-significacao", name: "Significação das palavras" },
          { id: "dp26-p3-por-substituicao", name: "Substituição de palavras ou trechos" },
          { id: "dp26-p3-por-reorganizacao", name: "Reorganização de orações e períodos" },
          { id: "dp26-p3-por-reescrita-generos", name: "Reescrita de textos de diferentes gêneros e níveis de formalidade" }
        ]
      }
    ]
  },
  {
    id: DISCIPLINE.ENGLISH,
    name: "Língua Inglesa",
    questions: 12,
    pointsPerQuestion: 1,
    topics: [
      {
        id: "dp26-p3-ing-compreensao",
        name: "Compreensão de textos em língua inglesa",
        subtopics: [
          { id: "dp26-p3-ing-textos", name: "Compreensão de textos em língua inglesa" },
          { id: "dp26-p3-ing-gramatica-contextual", name: "Itens gramaticais relevantes para o entendimento dos sentidos dos textos" }
        ]
      }
    ]
  },
  {
    id: DISCIPLINE.LOGIC,
    name: "Raciocínio Lógico Matemático",
    questions: 5,
    pointsPerQuestion: 1,
    topics: [
      { id: "dp26-p3-rlm-estruturas", name: "Estruturas lógicas", subtopics: [{ id: "dp26-p3-rlm-estruturas-basicas", name: "Estruturas lógicas" }] },
      { id: "dp26-p3-rlm-argumentacao", name: "Lógica de argumentação", subtopics: [{ id: "dp26-p3-rlm-argumentacao-processos", name: "Analogias, inferências, deduções e conclusões" }] },
      {
        id: "dp26-p3-rlm-sentencial",
        name: "Lógica sentencial ou proposicional",
        subtopics: [
          { id: "dp26-p3-rlm-proposicoes", name: "Proposições simples e compostas" },
          { id: "dp26-p3-rlm-tabelas-verdade", name: "Tabelas-verdade" },
          { id: "dp26-p3-rlm-equivalencias", name: "Equivalências" },
          { id: "dp26-p3-rlm-diagramas", name: "Diagramas lógicos" }
        ]
      },
      { id: "dp26-p3-rlm-primeira-ordem", name: "Lógica de primeira ordem", subtopics: [{ id: "dp26-p3-rlm-primeira-ordem-fundamentos", name: "Lógica de primeira ordem" }] },
      { id: "dp26-p3-rlm-problemas", name: "Problemas de raciocínio lógico", subtopics: [{ id: "dp26-p3-rlm-problemas-aritmeticos-geometricos", name: "Problemas aritméticos, geométricos e matriciais" }] }
    ]
  },
  {
    id: DISCIPLINE.CURRENT_AI,
    name: "Atualidades e Inteligência Artificial",
    questions: 6,
    pointsPerQuestion: 1,
    topics: [
      {
        id: "dp26-p3-atualidades",
        name: "Atualidades",
        subtopics: [
          { id: "dp26-p3-atualidades-areas", name: "Segurança, transportes, política, economia, sociedade, educação, saúde, cultura, tecnologia, energia, relações internacionais, desenvolvimento sustentável e ecologia" }
        ]
      },
      {
        id: "dp26-p3-ia-fundamentos",
        name: "Inteligência Artificial: fundamentos e aplicações",
        subtopics: [
          { id: "dp26-p3-ia-conceitos", name: "Conceitos de inteligência artificial" },
          { id: "dp26-p3-ia-machine-learning", name: "Aprendizado de máquina" },
          { id: "dp26-p3-ia-generativa-llm", name: "Modelos generativos e modelos de linguagem" },
          { id: "dp26-p3-ia-etica-governanca", name: "Ética, governança e privacidade em IA" }
        ]
      }
    ]
  },
  {
    id: DISCIPLINE.LEGISLATION,
    name: "Legislação de Segurança da Informação e Proteção de Dados",
    questions: 5,
    pointsPerQuestion: 1,
    topics: [
      { id: "dp26-p3-leg-lai", name: "Lei de Acesso à Informação", subtopics: [{ id: "dp26-p3-leg-lai-capitulos", name: "Lei nº 12.527/2011, capítulos I a V; Decretos nº 7.724 e nº 7.845" }] },
      { id: "dp26-p3-leg-delitos-informaticos", name: "Lei de Delitos Informáticos", subtopics: [{ id: "dp26-p3-leg-delitos-art2", name: "Lei nº 12.737/2012, art. 2º" }] },
      { id: "dp26-p3-leg-marco-civil", name: "Marco Civil da Internet", subtopics: [{ id: "dp26-p3-leg-marco-civil-capitulos", name: "Lei nº 12.965/2014, capítulos II, Seção I, e III, Seções I e II" }] },
      { id: "dp26-p3-leg-lgpd", name: "Lei Geral de Proteção de Dados Pessoais", subtopics: [{ id: "dp26-p3-leg-lgpd-capitulos", name: "Lei nº 13.709/2018, capítulos I, II, III, IV, VII, VIII e IX" }] }
    ]
  },
  {
    id: DISCIPLINE.SPECIFIC,
    name: "Conhecimentos Específicos",
    questions: 30,
    pointsPerQuestion: 2.5,
    topics: [
      {
        id: "dp26-p3-esp-desenvolvimento-sistemas",
        name: "Desenvolvimento de Sistemas",
        subtopics: [
          { id: "dp26-p3-esp-linguagens-frameworks", name: "Java 6+, JavaEE 6+, JakartaEE, JPA 2+, JavaScript, JUnit, Hibernate, JSF, PrimeFaces, Spring, Spring Cloud e Spring Boot" },
          { id: "dp26-p3-esp-mobile-lowcode", name: "Desenvolvimento móvel Android e iOS; ferramentas low-code e no-code" },
          { id: "dp26-p3-esp-clean-code-sonarqube", name: "Análise estática de código, clean code e SonarQube" },
          { id: "dp26-p3-esp-arquitetura-software", name: "Arquitetura de software, interoperabilidade, SOA, web services, mensageria, APIs e Swagger" },
          { id: "dp26-p3-esp-orientacao-objetos-web", name: "Orientação a objetos, aplicações web, servidor de aplicações e servidor web" },
          { id: "dp26-p3-esp-ambientes-web", name: "Internet, extranet, intranet e portal" },
          { id: "dp26-p3-esp-padroes-dados-web", name: "XML, XSLT, UDDI, REST e JSON" },
          { id: "dp26-p3-esp-devops-git", name: "DevOps e gestão de configuração com Git" },
          { id: "dp26-p3-esp-testes", name: "Testes unitários, integração, ágeis, usabilidade, automatizados, tipos de testes, TDD e ciclo de vida de testes" },
          { id: "dp26-p3-esp-rpa", name: "RPA — robotic process automation" },
          { id: "dp26-p3-esp-metodologias-ageis", name: "Scrum, Kanban e XP" },
          { id: "dp26-p3-esp-padroes-reuso", name: "Padrões de desenvolvimento e reuso" },
          { id: "dp26-p3-esp-codificacao", name: "Codificação de software transacional, analítico, mobile e API" },
          { id: "dp26-p3-esp-metricas", name: "Pontos de Função e Story Points" },
          { id: "dp26-p3-esp-requisitos", name: "Classificação, processo e elicitação de requisitos" },
          { id: "dp26-p3-esp-frontend", name: "HTML, CSS, UX, Ajax, VueJS, Angular, React, padrões frontend, SPA e PWA" },
          { id: "dp26-p3-esp-https-tls", name: "Protocolos HTTPS e SSL/TLS" },
          { id: "dp26-p3-esp-blockchain", name: "Blockchain" },
          { id: "dp26-p3-esp-design-arquitetura", name: "Design de software, arquitetura hexagonal, microsserviços, API gateway, containers e transações distribuídas" },
          { id: "dp26-p3-esp-ux-cms", name: "UX, CMS, arquitetura da informação, portais, workflow, acessibilidade, usabilidade e interação web" },
          { id: "dp26-p3-esp-ia-dados-bigdata", name: "Inteligência Artificial, Análise de Dados e Big Data" }
        ]
      },
      {
        id: "dp26-p3-esp-bi",
        name: "Inteligência de Negócios — Business Intelligence",
        subtopics: [
          { id: "dp26-p3-esp-bi-conceitos", name: "Conceitos, fundamentos, características, técnicas e métodos de BI" },
          { id: "dp26-p3-esp-bi-suporte-decisao", name: "Sistemas de suporte a decisão e gestão de conteúdo" },
          { id: "dp26-p3-esp-bi-dw-etl-olap", name: "Data warehouse com ETL e OLAP" },
          { id: "dp26-p3-esp-bi-dw-mining", name: "Data warehouse e data mining" },
          { id: "dp26-p3-esp-bi-visualizacao", name: "Visualização de dados, bancos individuais e cubos" },
          { id: "dp26-p3-esp-bi-fontes", name: "Mapeamento de fontes e técnicas de coleta de dados" },
          { id: "dp26-p3-esp-bi-arquitetura", name: "Arquitetura de business intelligence" }
        ]
      },
      {
        id: "dp26-p3-esp-seguranca",
        name: "Segurança da Informação",
        subtopics: [
          { id: "dp26-p3-esp-si-politicas", name: "Políticas e procedimentos de segurança da informação" },
          { id: "dp26-p3-esp-si-iso", name: "ABNT NBR ISO/IEC 27001:2022 e 27002:2022" },
          { id: "dp26-p3-esp-si-cid", name: "Confiabilidade, integridade e disponibilidade" },
          { id: "dp26-p3-esp-si-acesso", name: "Mecanismos de segurança, controle de acesso, OAuth2 e SSO" },
          { id: "dp26-p3-esp-si-riscos", name: "Gerência de riscos: ameaça, vulnerabilidade e impacto" },
          { id: "dp26-p3-esp-si-sdl-owasp", name: "SDL e OWASP Top 10" },
          { id: "dp26-p3-esp-si-sast-dast", name: "SAST e DAST" }
        ]
      },
      {
        id: "dp26-p3-esp-banco-dados",
        name: "Banco de Dados",
        subtopics: [
          { id: "dp26-p3-esp-bd-modelagem", name: "Modelagem conceitual, lógica e física" },
          { id: "dp26-p3-esp-bd-relacional-multidimensional", name: "Abordagem relacional e multidimensional" },
          { id: "dp26-p3-esp-bd-normalizacao", name: "Normalização" },
          { id: "dp26-p3-esp-bd-integridade", name: "Integridade referencial" },
          { id: "dp26-p3-esp-bd-metadados", name: "Metadados" },
          { id: "dp26-p3-esp-bd-dimensional", name: "Modelagem dimensional" },
          { id: "dp26-p3-esp-bd-sql", name: "SQL" },
          { id: "dp26-p3-esp-bd-ddl", name: "DDL" },
          { id: "dp26-p3-esp-bd-dml", name: "DML" },
          { id: "dp26-p3-esp-bd-sgbd", name: "SGBD" },
          { id: "dp26-p3-esp-bd-propriedades", name: "Propriedades de banco de dados" },
          { id: "dp26-p3-esp-bd-nosql", name: "Banco de dados NoSQL" },
          { id: "dp26-p3-esp-bd-memoria", name: "Banco de dados em memória" },
          { id: "dp26-p3-esp-bd-datalake-bigdata", name: "Data lakes e soluções para big data" },
          { id: "dp26-p3-esp-bd-estruturados", name: "Dados estruturados e não estruturados" },
          { id: "dp26-p3-esp-bd-avaliacao-modelos", name: "Avaliação de modelos de dados" },
          { id: "dp26-p3-esp-bd-integracao-ingestao", name: "ETL/ELT, transferência de arquivos e integração via base de dados" }
        ]
      },
      {
        id: "dp26-p3-esp-gestao-governanca",
        name: "Gestão e Governança de Tecnologia da Informação",
        subtopics: [
          { id: "dp26-p3-esp-gov-projetos", name: "Gerenciamento de projetos, programas, portfólio e abordagens tradicional, híbrida e ágil" },
          { id: "dp26-p3-esp-gov-processos", name: "Processos, grupos de processos e áreas de conhecimento" },
          { id: "dp26-p3-esp-gov-riscos", name: "Gestão de riscos" },
          { id: "dp26-p3-esp-gov-itil", name: "ITIL v4" },
          { id: "dp26-p3-esp-gov-cobit", name: "COBIT 2019" },
          { id: "dp26-p3-esp-gov-bpmn", name: "Gestão de processos e BPMN" }
        ]
      }
    ]
  }
];

const disciplinas: Disciplina[] = DEFINITIONS.map((definition) => ({
  id: definition.id,
  nome: definition.name,
  concursoId: DATAPREV_2026_PROFILE_3_ID
}));

const assuntos: Assunto[] = DEFINITIONS.flatMap((definition) =>
  definition.topics.map((topic) => ({
    id: topic.id,
    nome: topic.name,
    disciplinaId: definition.id
  }))
);

const subassuntos: Subassunto[] = DEFINITIONS.flatMap((definition) =>
  definition.topics.flatMap((topic) =>
    topic.subtopics.map((subtopic) => ({
      id: subtopic.id,
      nome: subtopic.name,
      assuntoId: topic.id
    }))
  )
);

const assuntoToDisciplina = Object.fromEntries(
  assuntos.map((assunto) => [assunto.id, assunto.disciplinaId])
);
const subassuntoToAssunto = Object.fromEntries(
  subassuntos.map((subassunto) => [subassunto.id, subassunto.assuntoId])
);
const assuntoToSubassuntos = Object.fromEntries(
  assuntos.map((assunto) => [
    assunto.id,
    subassuntos
      .filter((subassunto) => subassunto.assuntoId === assunto.id)
      .map((subassunto) => subassunto.id)
  ])
);

const names = {
  disciplinas: Object.fromEntries(disciplinas.map((item) => [item.id, item.nome])),
  assuntos: Object.fromEntries(assuntos.map((item) => [item.id, item.nome])),
  subassuntos: Object.fromEntries(subassuntos.map((item) => [item.id, item.nome]))
};

const pesosDisciplinas = Object.fromEntries(
  DEFINITIONS.map((definition) => [
    definition.id,
    definition.questions * definition.pointsPerQuestion
  ])
);
const quantidadeQuestoesProva = Object.fromEntries(
  DEFINITIONS.map((definition) => [definition.id, definition.questions])
);
const pontosPorQuestao = Object.fromEntries(
  DEFINITIONS.map((definition) => [definition.id, definition.pointsPerQuestion])
);
const minimosDisciplinas = Object.fromEntries(
  DEFINITIONS.map((definition) => [definition.id, 1 / definition.questions])
);

const pesosAssuntos = Object.fromEntries(assuntos.map((assunto) => [assunto.id, 1]));
const incidenceResolutions = buildHistoricalIncidenceMap(
  assuntos.map((assunto) => assunto.id),
  DATAPREV_2026_PROFILE_3_STRATEGIC_EVIDENCE
);
const incidenciaHistoricaAssuntos = Object.fromEntries(
  Object.entries(incidenceResolutions).map(([assuntoId, resolution]) => [assuntoId, resolution.value])
);
const assuntoModelMetadata = Object.fromEntries(
  assuntos.map((assunto) => {
    const resolution = incidenceResolutions[assunto.id];
    return [
      assunto.id,
      {
        topicWeightSource: "NEUTRAL_PRIOR" as const,
        historicalIncidenceSource: resolution.source,
        note: resolution.note
      }
    ];
  })
);

const edital: EditalConfig = {
  concursoId: DATAPREV_2026_PROFILE_3_ID,
  concursoNome: "DATAPREV 2026 — Perfil 3 — Desenvolvimento de Software",
  banca: "FGV",
  tipoQuestao: "MULTIPLA_ESCOLHA",
  pesosDisciplinas,
  minimosDisciplinas,
  pesosAssuntos,
  quantidadeQuestoesProva,
  pontosPorQuestao,
  regrasPenalizacao: "NENHUMA",
  dataProva: "2026-10-11",
  incidenciaHistoricaAssuntos,
  duracaoEstimadaProvaMinutos: 240,
  assuntoModelMetadata,
  pontuacaoMinimaGlobal: 57.5,
  pontuacaoMaximaGlobal: 115,
  eliminaAoZerarDisciplina: true
};

const knowledgeGraph: KnowledgeGraph = {
  nodes: Object.fromEntries(
    subassuntos.map((subassunto) => [
      subassunto.id,
      { id: subassunto.id, nome: subassunto.nome, dependencias: [] }
    ])
  )
};

export const DATAPREV_2026_PROFILE_3_PACKAGE: CompetitionConfigurationPackage = {
  id: DATAPREV_2026_PROFILE_3_ID,
  version: "1.0.0",
  officialDocument: "Edital DATAPREV 001/2026",
  concursoName: "DATAPREV 2026 — Desenvolvimento de Software",
  organization: "Empresa de Tecnologia e Informações da Previdência — DATAPREV",
  banca: "FGV",
  profileName: "Desenvolvimento de Software",
  profileNumber: 3,
  testLocality: "Natal/RN",
  workLocality: "Natal/RN",
  remunerationInitial: 10685.44,
  vacancies: {
    locality: "Natal/RN",
    immediate: {
      total: 20,
      amplaConcorrencia: 13,
      pcd: 1,
      pretosPardos: 5,
      indigenas: 1,
      quilombolas: 0
    },
    reserve: {
      total: 80,
      amplaConcorrencia: 52,
      pcd: 4,
      pretosPardos: 20,
      indigenas: 2,
      quilombolas: 2
    }
  },
  officialRules: {
    examDate: "2026-10-11",
    startTimeBrasilia: "13:00",
    endTimeBrasilia: "17:00",
    durationMinutes: 240,
    totalQuestions: 70,
    maximumPoints: 115,
    minimumTotalPoints: 57.5,
    eliminatesOnZeroDiscipline: true,
    questionType: "MULTIPLA_ESCOLHA",
    optionsPerQuestion: 5,
    wrongAnswerPenalty: "NONE",
    tieBreakCriteria: [
      "idade igual ou superior a 60 anos",
      "maior nota em Conhecimentos Específicos",
      "maior nota em Língua Portuguesa",
      "maior nota em Língua Inglesa",
      "exercício efetivo da função de jurado",
      "maior idade"
    ]
  },
  sources: [
    { document: "Edital DATAPREV 001/2026", section: "3.1", page: 2, note: "Vagas do Perfil 3 por localidade" },
    { document: "Edital DATAPREV 001/2026", section: "9.1", page: 16, note: "Data e horário da prova" },
    { document: "Edital DATAPREV 001/2026", section: "9.5 a 9.6", page: 17, note: "Questões, pesos e pontuação" },
    { document: "Edital DATAPREV 001/2026", section: "9.17", page: 18, note: "Critérios eliminatórios" },
    { document: "Edital DATAPREV 001/2026", section: "12.1", page: 22, note: "Critérios de desempate" },
    { document: "Edital DATAPREV 001/2026", section: "Anexo I — Perfil 3", page: 29, note: "Conteúdo programático específico" },
    { document: "Edital DATAPREV 001/2026", section: "Anexo III", page: 56, note: "Remuneração inicial" }
  ],
  strategicEvidence: DATAPREV_2026_PROFILE_3_STRATEGIC_EVIDENCE,
  studyGuidance: DATAPREV_2026_PROFILE_3_STUDY_GUIDANCE,
  assumptions: [
    {
      id: "neutral-topic-weight",
      description: "Assuntos recebem peso interno igual dentro da mesma disciplina porque o edital não informa a distribuição de questões por assunto.",
      impact: "Não cria preferência artificial entre assuntos da mesma disciplina; o ranking inicial depende de peso oficial da disciplina, cobertura e evidências reais do candidato.",
      status: "PENDING_EMPIRICAL_DATA"
    },
    {
      id: "missing-fgv-incidence",
      description: "Ainda não existe matriz empírica validada de incidência FGV por assunto no pacote.",
      impact: "O motor usa um prior neutro apenas para estabilidade numérica e a XAI registra a incidência histórica como dado ausente.",
      status: "PENDING_EMPIRICAL_DATA"
    },
    {
      id: "empty-knowledge-graph",
      description: "O grafo de pré-requisitos inicia sem dependências inferidas.",
      impact: "Nenhum veto de pré-requisito será aplicado sem uma relação conceitual explicitamente validada.",
      status: "PENDING_EMPIRICAL_DATA"
    }
  ],
  sde: {
    edital,
    disciplinas,
    assuntos,
    subassuntos,
    names,
    assuntoToDisciplina,
    subassuntoToAssunto,
    assuntoToSubassuntos,
    knowledgeGraph,
    eliminationRiskPolicy: {
      minDisciplineSampleSize: 20,
      minTopicSampleSizeForCoverage: 5,
      minWeightedCoverage: 0.5,
      warningMargin: 0.15
    },
    opportunityCostPolicy: {
      minimumComparableActions: 2,
      durationToleranceRatio: 0.5
    },
    learningLeveragePolicy: {
      lowPerformanceUpperBound: 0.4,
      leverageZoneLowerBound: 0.55,
      leverageZoneUpperBound: 0.75,
      masteredLowerBound: 0.85
    },
    plannerPolicy: {
      minSessionMinutes: {
        teoria: 20,
        questoes: 15,
        revisao: 15,
        flashcards: 10,
        simulado: 90
      },
      maxSessionMinutes: {
        teoria: 50,
        questoes: 60,
        revisao: 35,
        flashcards: 20,
        simulado: 180
      },
      cognitiveWeight: {
        teoria: 1.1,
        questoes: 1.2,
        revisao: 0.9,
        flashcards: 0.6,
        simulado: 1.3
      },
      maxContinuousCognitiveLoad: 60,
      breakDurationMinutes: 10,
      minStudyMinutesAfterBreak: 15,
      progressionGuard: {
        enabled: true,
        minNewContentSessionMinutes: 25
      }
    }
  }
};

export const DATAPREV_DISCIPLINE_IDS = DISCIPLINE;
