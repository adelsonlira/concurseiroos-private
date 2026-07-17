import { getCompetitionRuntimeDefinition } from "../../config/concursos/registry";
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
  runCompetitionDecisionForDate,
  type CompetitionDecisionSnapshot
} from "./competitionDecisionAdapter";

export interface CompetitionEvidenceSnapshot {
  configuracao: ConfigUsuario;
  subassuntos: Subassunto[];
  tentativasQuestoes: TentativaQuestaoUsuario[];
  cronogramasRevisao: CronogramaRevisao[];
}

export interface CompetitionRoadmapSnapshot
  extends CompetitionDecisionSnapshot,
    CompetitionEvidenceSnapshot {
  sessoesEstudo: SessaoEstudo[];
}

export interface CompetitionStrategicRoadmap {
  evidence: EvidenceCoverageReport;
  weekly: WeeklyOutlook;
}

export function buildCompetitionEvidenceCoverage(
  snapshot: CompetitionEvidenceSnapshot,
  referenceDate: string
): EvidenceCoverageReport {
  const runtime = getCompetitionRuntimeDefinition(snapshot.configuracao.concursoAlvoId);
  const pkg = runtime.package;
  const officialMaxPointsByDiscipline = pkg.sde.edital.pesosDisciplinas;
  const disciplineOrder = new Map(
    pkg.sde.disciplinas.map((item, index) => [item.id, index + 1])
  );
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

export function buildCompetitionStrategicRoadmap(
  snapshot: CompetitionRoadmapSnapshot,
  referenceDate: string
): CompetitionStrategicRoadmap {
  const evidence = buildCompetitionEvidenceCoverage(snapshot, referenceDate);
  const weekly = buildWeeklyOutlook({
    referenceDate,
    numberOfDays: 7,
    decisionForDate: (date) => runCompetitionDecisionForDate(snapshot, date)
  });

  return { evidence, weekly };
}

