import type { PrivateStudyMaterial } from "../../core/materials/types";
import type { ExternalQuestionBankDefinition } from "../../core/questions/externalQuestionBanks";
import type { CompetitionAppSeed, CompetitionConfigurationPackage } from "./types";
import { buildDataprev2026Profile3AppSeed } from "./dataprev-2026-perfil-3/appSeed";
import {
  DATAPREV_2026_PROFILE_3_ID,
  DATAPREV_2026_PROFILE_3_PACKAGE
} from "./dataprev-2026-perfil-3/officialData";
import { DATAPREV_2026_PRIVATE_STUDY_MATERIALS } from "./dataprev-2026-perfil-3/privateStudyMaterials";


export interface CompetitionRuntimeDefinition {
  id: string;
  package: CompetitionConfigurationPackage;
  buildAppSeed: () => CompetitionAppSeed;
  privateStudyMaterials: readonly PrivateStudyMaterial[];
  externalQuestionBanks: readonly ExternalQuestionBankDefinition[];
  coachChatTitle: string;
}

const DATAPREV_2026_PROFILE_3_RUNTIME: CompetitionRuntimeDefinition = {
  id: DATAPREV_2026_PROFILE_3_ID,
  package: DATAPREV_2026_PROFILE_3_PACKAGE,
  buildAppSeed: buildDataprev2026Profile3AppSeed,
  privateStudyMaterials: DATAPREV_2026_PRIVATE_STUDY_MATERIALS,
  externalQuestionBanks: [
    {
      id: "estrategia-questoes",
      provider: "ESTRATEGIA_QUESTOES",
      displayName: "Estratégia Questões",
      accessMode: "USER_SUBSCRIPTION",
      enabled: true
    },
    {
      id: "qconcursos",
      provider: "QCONCURSOS",
      displayName: "Qconcursos",
      accessMode: "USER_SUBSCRIPTION",
      enabled: true
    }
  ],
  coachChatTitle: "Coach DATAPREV — Perfil 3"
};

const COMPETITION_REGISTRY = new Map<string, CompetitionRuntimeDefinition>([
  [DATAPREV_2026_PROFILE_3_RUNTIME.id, DATAPREV_2026_PROFILE_3_RUNTIME]
]);

export const DEFAULT_COMPETITION_ID = DATAPREV_2026_PROFILE_3_ID;

export function listCompetitionRuntimeDefinitions(): CompetitionRuntimeDefinition[] {
  return [...COMPETITION_REGISTRY.values()];
}

export function findCompetitionRuntimeDefinition(
  competitionId: string | null | undefined
): CompetitionRuntimeDefinition | null {
  if (!competitionId) return null;
  return COMPETITION_REGISTRY.get(competitionId) ?? null;
}

export function getCompetitionRuntimeDefinition(
  competitionId: string | null | undefined
): CompetitionRuntimeDefinition {
  const resolvedId = competitionId || DEFAULT_COMPETITION_ID;
  const runtime = COMPETITION_REGISTRY.get(resolvedId);
  if (!runtime) {
    throw new Error(
      `O concurso '${resolvedId}' não possui um pacote de configuração instalado.`
    );
  }
  return runtime;
}

export function getDefaultCompetitionRuntimeDefinition(): CompetitionRuntimeDefinition {
  return getCompetitionRuntimeDefinition(DEFAULT_COMPETITION_ID);
}

export function getActiveCompetitionPackage(
  competitionId: string | null | undefined
): CompetitionConfigurationPackage {
  return getCompetitionRuntimeDefinition(competitionId).package;
}
