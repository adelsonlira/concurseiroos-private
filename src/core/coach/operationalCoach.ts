import type { CoachOperationalCommand, CoachOperationalInput } from "./types";

export function buildCoachOperationalCommand(input: CoachOperationalInput): CoachOperationalCommand {
  const prescription = input.prescription;
  if (!prescription) {
    return {
      state: "WAIT_FOR_PRESCRIPTION",
      headline: "Preparando sua próxima ação",
      instruction: "Atualize a disponibilidade de hoje. O sistema recalculará uma única sessão executável.",
      primaryActionLabel: "Recalcular agora",
      decisionRequiredFromStudent: false,
      blockingReason: "Não existe sessão executável para o estado atual.",
      fallbackInstruction: null,
    };
  }

  if (input.timerRunning) {
    return {
      state: "RESUME_SESSION",
      headline: "Continue a sessão em andamento",
      instruction: `Retome ${prescription.subtopicName ?? prescription.topicName} e conclua o protocolo já iniciado.`,
      primaryActionLabel: "Retomar sessão",
      decisionRequiredFromStudent: false,
      blockingReason: null,
      fallbackInstruction: null,
    };
  }

  if ((input.interruptedSessionMinutes ?? 0) > 0) {
    return {
      state: "RECOVER_INTERRUPTION",
      headline: "Retome sem reorganizar o plano",
      instruction: `Use os próximos ${Math.min(prescription.durationMinutes, Math.max(10, input.interruptedSessionMinutes ?? 10))} minutos para concluir a etapa interrompida.`,
      primaryActionLabel: "Retomar do ponto salvo",
      decisionRequiredFromStudent: false,
      blockingReason: null,
      fallbackInstruction: "Caso não consiga concluir, registre o ponto exato e o Coach repartirá a sessão seguinte.",
    };
  }

  if (prescription.executionReadiness.status === "READY_WITH_FALLBACK") {
    return {
      state: "USE_FALLBACK",
      headline: `Estude agora: ${prescription.subtopicName ?? prescription.topicName}`,
      instruction: `${prescription.activity} por ${prescription.durationMinutes} minutos. ${prescription.executionReadiness.reason}`,
      primaryActionLabel: "Iniciar com fallback",
      decisionRequiredFromStudent: false,
      blockingReason: null,
      fallbackInstruction: prescription.executionReadiness.reason,
    };
  }

  return {
    state: "START_NOW",
    headline: `Estude agora: ${prescription.subtopicName ?? prescription.topicName}`,
    instruction: `${prescription.activity} por ${prescription.durationMinutes} minutos. Siga as etapas e registre as evidências ao finalizar.`,
    primaryActionLabel: "Iniciar sessão indicada",
    decisionRequiredFromStudent: false,
    blockingReason: null,
    fallbackInstruction: null,
  };
}
