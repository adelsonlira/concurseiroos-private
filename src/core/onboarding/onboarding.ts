import type { OnboardingContext, OnboardingPlan } from "./types";

export function buildOnboardingPlan(context: OnboardingContext): OnboardingPlan {
  const steps = [
    {
      id: "competition",
      label: "Concurso-alvo",
      status: context.competitionSelected ? "DONE" : "REQUIRED",
      action: context.competitionSelected ? "DATAPREV 2026 selecionado." : "Selecionar o pacote DATAPREV 2026.",
      studentDecisionRequired: false,
    },
    {
      id: "exam-date",
      label: "Data da prova",
      status: context.examDateKnown ? "DONE" : "REQUIRED",
      action: context.examDateKnown ? "Data oficial carregada." : "Importar a data oficial do pacote.",
      studentDecisionRequired: false,
    },
    {
      id: "availability",
      label: "Disponibilidade",
      status: context.availabilityConfigured ? "DONE" : "AUTO_DEFAULTED",
      action: context.availabilityConfigured ? "Agenda semanal configurada." : "Aplicar disponibilidade segura padrão de 120 minutos em seis dias.",
      studentDecisionRequired: !context.availabilityConfigured,
    },
    {
      id: "materials",
      label: "Material executável",
      status: context.hasMaterialLocator ? "DONE" : "AUTO_DEFAULTED",
      action: context.hasMaterialLocator ? "Material e páginas localizados." : "Usar o material principal da disciplina e registrar o trecho estudado.",
      studentDecisionRequired: false,
    },
    {
      id: "questions",
      label: "Fonte de questões",
      status: context.hasQuestionSource ? "DONE" : "AUTO_DEFAULTED",
      action: context.hasQuestionSource ? "Fonte de questões disponível." : "Usar Qconcursos ou Estratégia Questões com os filtros prescritos.",
      studentDecisionRequired: false,
    },
    {
      id: "backup",
      label: "Proteção dos registros",
      status: context.backupConfigured ? "DONE" : "AUTO_DEFAULTED",
      action: context.backupConfigured ? "Sincronização ou backup configurado." : "Manter backup local até concluir a conexão autenticada.",
      studentDecisionRequired: false,
    },
  ] as const;

  const blocking = steps.some((step) => step.status === "REQUIRED");
  return {
    readyToStudy: !blocking,
    primaryInstruction: blocking
      ? "Complete automaticamente os dados oficiais obrigatórios antes da primeira sessão."
      : "Abra a tela Hoje e inicie a única sessão indicada pelo Coach.",
    steps: steps.map((step) => ({ ...step })),
  };
}
