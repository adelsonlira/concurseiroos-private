import type { StudyActivityType } from "../sde/planner/plannerTypes";

export type ReferenceQuestionStyle =
  | "DIRECT_KNOWLEDGE"
  | "CONCEPT_COMPARISON"
  | "SCENARIO"
  | "ASSERTION_SET"
  | "SCENARIO_COMPARISON"
  | "CODE_SCENARIO";

export interface StudyGuidanceTopicSignal {
  topicId?: string;
  subtopicId?: string;
  referenceLabel: string;
  observedFocus: string[];
  attentionPoints: string[];
  questionStyles: ReferenceQuestionStyle[];
  referenceQuestionCount: number;
}

export interface CompetitionStudyGuidance {
  version: string;
  sourceLabel: string;
  sourceScope: string;
  banca: string;
  evidenceStatus: "DESCRIPTIVE_REFERENCE_ONLY" | "VALIDATED_CORPUS";
  questionStyleCounts: Partial<Record<ReferenceQuestionStyle, number>>;
  topicSignals: StudyGuidanceTopicSignal[];
  limitations: string[];
}

export type StudyFocusGuideMode = "FIRST_CONTACT" | "REMEDIATION" | "REACTIVATION";

export interface StudyFocusGuide {
  mode: StudyFocusGuideMode;
  title: string;
  instruction: string;
  questions: string[];
  attentionPoints: string[];
  successCriteria: string[];
  evidenceLabel: string | null;
  evidenceStatus: CompetitionStudyGuidance["evidenceStatus"] | null;
  limitations: string[];
}

export interface BuildStudyFocusGuideInput {
  activity: StudyActivityType;
  topicId: string;
  topicName: string;
  subtopicId?: string;
  subtopicName?: string;
  siblingSubtopicNames?: string[];
  diagnosticPurpose?: boolean;
  reasonCode?: string;
  guidance: CompetitionStudyGuidance | null;
}

function cleanSiblings(input: BuildStudyFocusGuideInput): string[] {
  const current = (input.subtopicName ?? "").toLocaleLowerCase("pt-BR");
  return [...new Set(input.siblingSubtopicNames ?? [])]
    .filter((name) => name.toLocaleLowerCase("pt-BR") !== current)
    .slice(0, 3);
}

function categoryQuestion(topic: string): string {
  const normalized = topic.toLocaleLowerCase("pt-BR");
  if (normalized.includes("seguran") || normalized.includes("owasp")) {
    return "Quais ameaças, controles e responsabilidades precisam ser distinguidos neste conteúdo?";
  }
  if (normalized.includes("banco") || normalized.includes("dados") || normalized.includes("sql")) {
    return "Quais elementos, regras de integridade e critérios de qualidade formam este conceito?";
  }
  if (normalized.includes("desenvolvimento") || normalized.includes("software") || normalized.includes("java")) {
    return "Quais componentes, responsabilidades e decisões de projeto compõem este conteúdo?";
  }
  if (normalized.includes("gestão") || normalized.includes("governança") || normalized.includes("itil") || normalized.includes("cobit")) {
    return "Quais objetivos, papéis, processos e artefatos precisam ser diferenciados?";
  }
  return "Quais partes, regras, condições e exceções compõem este conteúdo?";
}

function modeFor(input: BuildStudyFocusGuideInput): StudyFocusGuideMode {
  if (input.activity === "revisao") return "REACTIVATION";
  if (input.reasonCode?.includes("ERROR") || input.reasonCode?.includes("DEFICIT")) return "REMEDIATION";
  return "FIRST_CONTACT";
}

function objectiveQuestionSet(input: BuildStudyFocusGuideInput, signal: StudyGuidanceTopicSignal | undefined): string[] {
  const focusName = input.subtopicName ?? input.topicName;
  const siblings = cleanSiblings(input);
  const comparisonTarget = siblings.length
    ? siblings.join(", ")
    : `conceitos próximos de ${focusName}`;
  const observed = signal?.observedFocus ?? [];
  const attention = signal?.attentionPoints ?? [];

  const questions = [
    `Em uma questão direta, qual definição de ${focusName} está correta e qual característica é indispensável?`,
    `Qual alternativa distinguiria corretamente ${focusName} de ${comparisonTarget}?`,
    `Dado um cenário prático, qual condição indica que ${focusName} deve ser aplicado e qual resultado se espera?`,
    `Qual afirmação sobre limites, condições ou exceções de ${focusName} seria falsa?`,
    categoryQuestion(`${input.topicName} ${focusName}`),
    `Qual erro de interpretação mais provavelmente levaria a marcar uma alternativa errada sobre ${focusName}?`
  ];

  if (observed[0]) {
    questions.splice(2, 0, `Como você resolveria uma questão objetiva que exigisse ${observed[0]}?`);
  }
  if (observed[1]) {
    questions.splice(4, 0, `Que critério permite responder corretamente quando a banca compara ${observed[1]}?`);
  }
  if (attention[0]) {
    questions.push(`Atenção de prova: por que é incorreto ignorar que ${attention[0].replace(/[.]$/, "")}?`);
  }

  return [...new Set(questions)].slice(0, 8);
}

export function buildStudyFocusGuide(input: BuildStudyFocusGuideInput): StudyFocusGuide | null {
  if (input.activity !== "teoria" && input.activity !== "revisao") return null;

  const focusName = input.subtopicName ?? input.topicName;
  const signal = input.guidance?.topicSignals.find(
    (item) =>
      (item.subtopicId && item.subtopicId === input.subtopicId) ||
      (!item.subtopicId && item.topicId === input.topicId)
  );
  const mode = modeFor(input);
  const questions = objectiveQuestionSet(input, signal);

  const modeInstruction: Record<StudyFocusGuideMode, string> = {
    FIRST_CONTACT:
      "Antes de abrir o material, leia as questões-guia e tente responder objetivamente. Em primeiro contato, 'ainda não sei' é válido. Durante a leitura, procure exatamente os critérios que permitiriam marcar a alternativa correta. Depois, responda novamente sem consulta.",
    REMEDIATION:
      "Responda primeiro sem consulta para localizar a falha. Estude apenas o necessário para corrigir as respostas incompletas e refaça as questões-guia ao final.",
    REACTIVATION:
      "Responda as questões-guia sem consulta. Abra o material apenas para conferir lacunas e feche-o antes da segunda tentativa."
  };

  return {
    mode,
    title: `Questões-guia de prova sobre ${focusName}`,
    instruction: modeInstruction[mode],
    questions,
    attentionPoints: signal?.attentionPoints ?? [
      "Definições parecidas e limites entre conceitos.",
      "Condições, exceções e consequências práticas.",
      "Termos absolutos ou generalizações que tornam uma alternativa incorreta."
    ],
    successCriteria: [
      "Responder de forma objetiva, como se precisasse eliminar alternativas incorretas.",
      "Justificar por que a resposta está correta e por que a confusão mais próxima está errada.",
      "Depois do estudo, acertar pelo menos 80% das questões-guia sem consultar o material."
    ],
    evidenceLabel: signal ? `${input.guidance?.sourceLabel} · ${signal.referenceLabel}` : null,
    evidenceStatus: signal ? input.guidance?.evidenceStatus ?? null : null,
    limitations: signal
      ? [
          ...(input.guidance?.limitations ?? []),
          "As questões-guia reproduzem formas de cobrança e focos observados, sem copiar enunciados protegidos nem transformar uma amostra em frequência histórica.",
          "O foco observado orienta atenção, mas não altera sozinho a prioridade calculada pelo SDE."
        ]
      : [
          "Não há sinal temático validado para este recorte; as questões são objetivas e derivadas do edital e de padrões gerais de prova, não de frequência histórica específica."
        ]
  };
}
