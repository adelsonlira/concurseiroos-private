import {
  DATAPREV_2026_PROFILE_3_ID,
  DATAPREV_2026_PROFILE_3_PACKAGE
} from "../../config/concursos/dataprev-2026-perfil-3";
import { buildEvidenceCoverageReport } from "../../core/diagnostic/diagnosticEngine";
import type { EvidenceCoverageReport } from "../../core/diagnostic/types";
import { buildWeeklyOutlook } from "../../core/roadmap/weeklyOutlook";
import type { WeeklyOutlook } from "../../core/roadmap/types";
import type {
  ConfigUsuario,
  CronogramaRevisao,
  SessaoEstudo,
  Subassunto,
  TentativaQuestaoUsuario
} from "../../types";
import {
  runDataprevDecisionForDate,
  type DataprevDecisionSnapshot
} from "./dataprevDecisionAdapter";

export interface DataprevEvidenceSnapshot {
  configuracao: ConfigUsuario;
  subassuntos: Subassunto[];
  tentativasQuestoes: TentativaQuestaoUsuario[];
  cronogramasRevisao: CronogramaRevisao[];
}

export interface DataprevRoadmapSnapshot extends DataprevDecisionSnapshot, DataprevEvidenceSnapshot {
  sessoesEstudo: SessaoEstudo[];
}

export interface DataprevStrategicRoadmap {
  evidence: EvidenceCoverageReport;
  weekly: WeeklyOutlook;
}

function assertTarget(snapshot: DataprevEvidenceSnapshot): void {
  if (snapshot.configuracao.concursoAlvoId !== DATAPREV_2026_PROFILE_3_ID) {
    throw new Error("O roteiro estratégico atual exige o pacote DATAPREV 2026 — Perfil 3.");
  }
}

export function buildDataprevEvidenceCoverage(
  snapshot: DataprevEvidenceSnapshot,
  referenceDate: string
): EvidenceCoverageReport {
  assertTarget(snapshot);
  const pkg = DATAPREV_2026_PROFILE_3_PACKAGE;
  const officialMaxPointsByDiscipline = pkg.sde.edital.pesosDisciplinas;
  const disciplineOrder = new Map(pkg.sde.disciplinas.map((item, index) => [item.id, index + 1]));
  const topicOrder = new Map<string, number>();
  for (const discipline of pkg.sde.disciplinas) {
    pkg.sde.assuntos
      .filter((topic) => topic.disciplinaId === discipline.id)
      .forEach((topic, index) => topicOrder.set(topic.id, index + 1));
  }

  return buildEvidenceCoverageReport({
    generatedAt: `${referenceDate}T12:00:00.000Z`,
    disciplines: pkg.sde.disciplinas.map((item) => ({
      id: item.id,
      nome: item.nome,
      officialMaxPoints: officialMaxPointsByDiscipline[item.id] ?? 0,
      ordem: disciplineOrder.get(item.id) ?? 0
    })),
    topics: pkg.sde.assuntos.map((item) => ({
      id: item.id,
      disciplinaId: item.disciplinaId,
      nome: item.nome,
      ordem: topicOrder.get(item.id) ?? 0
    })),
    subtopics: snapshot.subassuntos.map((item) => ({
      id: item.id,
      assuntoId: item.assuntoId,
      nome: item.nome,
      ordem: item.ordem,
      completado: item.completado,
      isDeleted: item.isDeleted
    })),
    attempts: snapshot.tentativasQuestoes.map((item) => ({
      id: item.id,
      disciplinaId: item.disciplinaId,
      assuntoId: item.assuntoId,
      subassuntoId: item.subassuntoId,
      acertou: item.acertou,
      respondidaEm: item.respondidaEm
    })),
    reviewSchedules: snapshot.cronogramasRevisao.map((item) => ({
      id: item.id,
      disciplinaId: item.disciplinaId,
      assuntoId: item.assuntoId,
      subassuntoId: item.subassuntoId,
      desabilitada: item.desabilitada,
      isDeleted: item.isDeleted,
      historicoTentativas: item.historicoTentativas.map((history) => ({
        revisadoEm: history.revisadoEm,
        recuperacaoIndependente: history.recuperacaoIndependente,
        usouAjuda: history.usouAjuda
      }))
    })),
    maxRoadmapItems: 12
  });
}

export function buildDataprevStrategicRoadmap(
  snapshot: DataprevRoadmapSnapshot,
  referenceDate: string
): DataprevStrategicRoadmap {
  const evidence = buildDataprevEvidenceCoverage(snapshot, referenceDate);
  const weekly = buildWeeklyOutlook({
    referenceDate,
    numberOfDays: 7,
    decisionForDate: (date) => runDataprevDecisionForDate(snapshot, date)
  });

  return { evidence, weekly };
}
