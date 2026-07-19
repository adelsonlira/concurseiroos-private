import { SDE_V2_CONFIG } from "./config";
import type {
  KnowledgeStateAssessment,
  MethodSelection,
  SdeV2Method,
} from "./types";

function sequenceFor(method: SdeV2Method, minutes: number): MethodSelection["executionSequence"] {
  const questionTarget = SDE_V2_CONFIG.methods.minimumQuestionTarget;
  switch (method) {
    case "short_diagnostic":
      return [
        { order: 1, tool: "QConcursos/FGV", minutes: Math.max(15, minutes - 10), instruction: `Resolver ${questionTarget} questões sem consulta.` },
        { order: 2, tool: "Registrar resultado", minutes: 10, instruction: "Registrar acertos, erros, brancos, tempo e consulta." },
      ];
    case "theory_notebooklm":
      return [
        { order: 1, tool: "NotebookLM ou material", minutes: Math.max(20, minutes - 15), instruction: "Construir a base conceitual do recorte prescrito." },
        { order: 2, tool: "Recuperação ativa", minutes: 10, instruction: "Explicar os conceitos sem consulta." },
        { order: 3, tool: "Registrar sessão", minutes: 5, instruction: "Registrar cobertura e dúvidas remanescentes." },
      ];
    case "concept_recovery":
      return [
        { order: 1, tool: "NotebookLM/material", minutes: Math.max(20, minutes - 25), instruction: "Reestudar somente a lacuna conceitual identificada." },
        { order: 2, tool: "Recuperação ativa", minutes: 10, instruction: "Explicar o conceito e um contraexemplo sem consulta." },
        { order: 3, tool: "QConcursos/FGV", minutes: 10, instruction: "Resolver uma bateria curta após a recuperação." },
        { order: 4, tool: "Registrar resultado", minutes: 5, instruction: "Registrar o resultado objetivo e a causa dos erros." },
      ];
    case "fgv_question_batch":
      return [
        { order: 1, tool: "QConcursos/FGV", minutes: Math.max(15, minutes - 10), instruction: `Resolver ${questionTarget} questões aderentes sem consulta.` },
        { order: 2, tool: "Correção estruturada", minutes: 5, instruction: "Classificar cada erro por causa observada." },
        { order: 3, tool: "Registrar resultado", minutes: 5, instruction: "Salvar a bateria agregada vinculada à prescrição." },
      ];
    case "active_review":
      return [
        { order: 1, tool: "Recuperação ativa", minutes: Math.max(10, minutes - 10), instruction: "Recuperar os pontos-chave antes de consultar." },
        { order: 2, tool: "Material", minutes: 5, instruction: "Conferir somente as lacunas." },
        { order: 3, tool: "Revisão", minutes: 5, instruction: "Registrar o resultado da recuperação." },
      ];
    case "timed_question_batch":
      return [
        { order: 1, tool: "QConcursos/FGV", minutes: Math.max(20, minutes - 10), instruction: `Resolver ${questionTarget} questões com cronômetro e sem consulta.` },
        { order: 2, tool: "Correção", minutes: 5, instruction: "Separar erro de tempo de erro de conteúdo." },
        { order: 3, tool: "Registrar resultado", minutes: 5, instruction: "Registrar duração total e gestão de tempo." },
      ];
    case "structured_error_recovery":
      return [
        { order: 1, tool: "Revisões e erros", minutes: 15, instruction: "Reconstruir o raciocínio do erro sem solução visível." },
        { order: 2, tool: "Material/NotebookLM", minutes: 15, instruction: "Corrigir a causa declarada do erro." },
        { order: 3, tool: "QConcursos/FGV", minutes: 10, instruction: "Executar verificação independente." },
        { order: 4, tool: "Registrar resultado", minutes: 5, instruction: "Registrar a verificação vinculada." },
      ];
    case "spaced_maintenance":
      return [
        { order: 1, tool: "Revisão ativa", minutes: 10, instruction: "Recuperar o conteúdo sem consulta." },
        { order: 2, tool: "QConcursos/FGV", minutes: 10, instruction: `Resolver ${SDE_V2_CONFIG.methods.maintenanceQuestionTarget} questões de manutenção.` },
        { order: 3, tool: "Registrar resultado", minutes: 5, instruction: "Registrar somente a medição objetiva." },
      ];
    case "prerequisite_recovery":
      return [
        { order: 1, tool: "Material/NotebookLM", minutes: Math.max(20, minutes - 15), instruction: "Recuperar o pré-requisito bloqueante antes do conteúdo avançado." },
        { order: 2, tool: "Recuperação ativa", minutes: 10, instruction: "Explicar o pré-requisito sem consulta." },
        { order: 3, tool: "Registrar sessão", minutes: 5, instruction: "Registrar evidência da recuperação da base." },
      ];
  }
}


function fitSequenceToBudget(
  sequence: MethodSelection["executionSequence"],
  budgetMinutes: number,
): MethodSelection["executionSequence"] {
  const budget = Math.max(sequence.length, Math.floor(budgetMinutes));
  const total = sequence.reduce((sum, step) => sum + step.minutes, 0);
  if (total <= budget) return sequence;
  const scale = budget / total;
  const fitted = sequence.map((step) => ({ ...step, minutes: Math.max(1, Math.floor(step.minutes * scale)) }));
  let current = fitted.reduce((sum, step) => sum + step.minutes, 0);
  let index = 0;
  while (current < budget) {
    fitted[index % fitted.length].minutes += 1;
    current += 1;
    index += 1;
  }
  while (current > budget) {
    const candidate = fitted.slice().sort((a, b) => b.minutes - a.minutes || a.order - b.order)[0];
    if (!candidate || candidate.minutes <= 1) break;
    candidate.minutes -= 1;
    current -= 1;
  }
  return fitted;
}

export function selectStudyMethod(params: {
  knowledgeState: KnowledgeStateAssessment;
  prerequisiteBlocked: boolean;
  materialAvailable: boolean;
  availableMinutes: number;
}): MethodSelection {
  const cause = params.knowledgeState.primaryErrorCause;
  let method: SdeV2Method;
  let rule: string;
  let objective: string;

  if (params.prerequisiteBlocked) {
    method = "prerequisite_recovery";
    rule = "PRE_REQUISITE_REQUIRED";
    objective = "Restabelecer a base necessária antes do avanço.";
  } else if (params.knowledgeState.state === "UNSEEN" || params.knowledgeState.state === "INSUFFICIENT_EVIDENCE") {
    method = params.materialAvailable ? "short_diagnostic" : "theory_notebooklm";
    rule = params.materialAvailable ? "MISSING_EVIDENCE_DIAGNOSTIC" : "MISSING_EVIDENCE_THEORY";
    objective = params.materialAvailable
      ? "Medir conhecimento prévio sem presumir domínio."
      : "Construir uma base inicial executável.";
  } else if (cause === "conceptual_gap") {
    method = "concept_recovery";
    rule = "CONCEPTUAL_GAP";
    objective = "Corrigir a lacuna conceitual e verificar aplicação.";
  } else if (cause === "missing_prerequisite") {
    method = "prerequisite_recovery";
    rule = "DECLARED_MISSING_PREREQUISITE";
    objective = "Recuperar o pré-requisito declarado como causa do erro.";
  } else if (cause === "interpretation" || cause === "application") {
    method = "fgv_question_batch";
    rule = "APPLICATION_OR_INTERPRETATION_ERROR";
    objective = "Treinar aplicação e leitura de alternativas no padrão FGV.";
  } else if (cause === "memory" || params.knowledgeState.reviewPending || params.knowledgeState.state === "DECAYING") {
    method = "active_review";
    rule = "MEMORY_OR_REVIEW_DUE";
    objective = "Restaurar recuperação independente e reduzir esquecimento.";
  } else if (cause === "time_management") {
    method = "timed_question_batch";
    rule = "TIME_MANAGEMENT";
    objective = "Treinar ritmo sem misturar velocidade com lacuna conceitual.";
  } else if (params.knowledgeState.state === "CRITICAL") {
    method = "structured_error_recovery";
    rule = "RECURRING_OR_CRITICAL_ERROR";
    objective = "Interromper repetição improdutiva e recuperar a causa do erro.";
  } else if (params.knowledgeState.state === "STABLE") {
    method = "spaced_maintenance";
    rule = "STABLE_MAINTENANCE";
    objective = "Manter retenção com baixo custo e liberar avanço.";
  } else {
    method = "fgv_question_batch";
    rule = "PRACTICE_TO_CONSOLIDATE";
    objective = "Consolidar o conhecimento com medição objetiva.";
  }

  const configured = SDE_V2_CONFIG.methods.defaultMinutes[method];
  const minutes = Math.max(10, Math.min(configured, params.availableMinutes));
  const full = fitSequenceToBudget(sequenceFor(method, minutes), minutes);
  const reducedMinutes = Math.max(1, Math.min(20, params.availableMinutes));
  const reducedBase = sequenceFor(method, Math.max(10, reducedMinutes)).slice(0, 2)
    .map((step, index) => ({ ...step, order: index + 1 }));
  const reduced = fitSequenceToBudget(reducedBase, reducedMinutes);

  return {
    method,
    rule,
    objective,
    executionSequence: full,
    advanceCriterion: method === "theory_notebooklm" || method === "concept_recovery" || method === "prerequisite_recovery"
      ? "Explicar os conceitos sem consulta e alcançar pelo menos 80% em bateria posterior com amostra mínima de 10 itens."
      : method === "spaced_maintenance"
        ? "Manter pelo menos 80% sem consulta e sem revisão urgente pendente."
        : "Alcançar pelo menos 80% sem consulta, com erros explicados e nenhum branco não justificado.",
    reducedPlan: reduced,
  };
}
