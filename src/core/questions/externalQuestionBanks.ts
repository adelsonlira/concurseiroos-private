import type { MaterialLocatorRecommendation } from "../materials/types";

export type ExternalQuestionBankProvider =
  | "QCONCURSOS"
  | "ESTRATEGIA_QUESTOES"
  | "OTHER";

export interface ExternalQuestionBankDefinition {
  id: string;
  provider: ExternalQuestionBankProvider;
  displayName: string;
  accessMode: "USER_SUBSCRIPTION";
  enabled: boolean;
}

export type ExternalQuestionSourceNeed =
  | "NO_LOCAL_QUESTION_SET"
  | "LOCAL_SET_NOT_FGV"
  | "OPTIONAL_ADDITIONAL_VOLUME";

export interface ExternalQuestionBankRecommendation {
  sourceId: string;
  provider: ExternalQuestionBankProvider;
  displayName: string;
  accessMode: "USER_SUBSCRIPTION";
  usage: "PRIMARY" | "FALLBACK";
  targetQuestions: number;
  filters: {
    banca: string;
    discipline: string;
    topic: string;
    subtopic: string | null;
    excludeAnnulled: true;
  };
  instruction: string;
}

export interface ExternalQuestionSourcePlan {
  need: ExternalQuestionSourceNeed;
  rationale: string;
  recommendations: ExternalQuestionBankRecommendation[];
}

const QUESTION_CONTENT_KINDS = new Set([
  "COMMENTED_QUESTIONS",
  "QUESTION_LIST",
  "SIMULATION"
]);

function hasLocalQuestionSet(material: MaterialLocatorRecommendation | null): boolean {
  return Boolean(material && QUESTION_CONTENT_KINDS.has(material.contentKind));
}

function hasLocalDiagnosticQuestionSet(material: MaterialLocatorRecommendation | null): boolean {
  return Boolean(
    material &&
      (material.contentKind === "QUESTION_LIST" || material.contentKind === "SIMULATION")
  );
}

function hasLocalFgvQuestionSet(material: MaterialLocatorRecommendation | null): boolean {
  return hasLocalQuestionSet(material) && material?.questionBank === "FGV";
}

export function buildExternalQuestionSourcePlan(input: {
  availableBanks: readonly ExternalQuestionBankDefinition[];
  material: MaterialLocatorRecommendation | null;
  banca: string;
  disciplineName: string;
  topicName: string;
  subtopicName?: string;
  targetQuestions: number;
  diagnosticPurpose?: boolean;
}): ExternalQuestionSourcePlan | null {
  const enabledBanks = input.availableBanks
    .filter((bank) => bank.enabled)
    .sort(
      (left, right) =>
        left.displayName.localeCompare(right.displayName, "pt-BR") ||
        left.id.localeCompare(right.id)
    );
  if (enabledBanks.length === 0) return null;

  const localQuestionSet = input.diagnosticPurpose
    ? hasLocalDiagnosticQuestionSet(input.material)
    : hasLocalQuestionSet(input.material);
  const localFgvQuestionSet = localQuestionSet && hasLocalFgvQuestionSet(input.material);
  const need: ExternalQuestionSourceNeed = !localQuestionSet
    ? "NO_LOCAL_QUESTION_SET"
    : !localFgvQuestionSet
      ? "LOCAL_SET_NOT_FGV"
      : "OPTIONAL_ADDITIONAL_VOLUME";
  const usage = need === "OPTIONAL_ADDITIONAL_VOLUME" ? "FALLBACK" : "PRIMARY";

  const rationale =
    need === "NO_LOCAL_QUESTION_SET"
      ? input.diagnosticPurpose && input.material?.contentKind === "COMMENTED_QUESTIONS"
        ? "O material local mostra comentários ou soluções junto das questões e não é adequado como primeira tentativa diagnóstica. Use um banco externo filtrado para responder sem exposição prévia ao gabarito."
        : "O catálogo privado não possui uma bateria de questões mapeada com segurança para este recorte. Use um banco externo da assinatura do usuário para cumprir a meta sem alterar o assunto prescrito."
      : need === "LOCAL_SET_NOT_FGV"
        ? `O material localizado não está identificado como banco ${input.banca}. Para manter aderência à banca, prefira uma bateria externa filtrada.`
        : `O material local já possui questões ${input.banca}. Os bancos externos são apenas uma extensão caso o PDF não alcance a meta ou seja necessária uma nova amostra inédita.`;

  return {
    need,
    rationale,
    recommendations: enabledBanks.map((bank) => ({
      sourceId: bank.id,
      provider: bank.provider,
      displayName: bank.displayName,
      accessMode: bank.accessMode,
      usage,
      targetQuestions: input.targetQuestions,
      filters: {
        banca: input.banca,
        discipline: input.disciplineName,
        topic: input.topicName,
        subtopic: input.subtopicName ?? null,
        excludeAnnulled: true
      },
      instruction:
        `No ${bank.displayName}, filtre banca ${input.banca}, disciplina “${input.disciplineName}”, ` +
        `assunto “${input.topicName}”${input.subtopicName ? ` e subassunto “${input.subtopicName}”` : ""}. ` +
        `Exclua questões anuladas e resolva ${input.targetQuestions} questão(ões) dentro do tempo prescrito.`
    }))
  };
}
