import { SDEApplicationResult } from "../sde/types";
import {
  Assunto,
  ConfigUsuario,
  CronogramaRevisao,
  Disciplina,
  LogHistoricoAtividade,
  SessaoEstudo,
  Subassunto,
  TentativaQuestaoUsuario
} from "../../types";
import { CoachGroundingContext } from "./types";
import { PrivateStudyMaterial } from "../../core/materials/types";
import { routePrivateStudyMaterial } from "../../core/materials/materialPolicy";
import {
  buildErrorTopicSummaries,
  buildReviewMethodEvidence,
  REVIEW_POLICY_VERSION,
  selectObservedPreferredReviewMethod
} from "../../core/review/reviewEngine";
import { buildWeeklyCalibrationReport } from "../../core/weekly/weeklyCalibration";
import { buildDataprevEvidenceCoverage } from "../sde/dataprevRoadmapAdapter";

export function buildCoachGroundingContext(params: {
  referenceDate: string;
  configuracao: ConfigUsuario;
  disciplinas: Disciplina[];
  assuntos: Assunto[];
  subassuntos: Subassunto[];
  tentativasQuestoes: TentativaQuestaoUsuario[];
  sessoesEstudo: SessaoEstudo[];
  cronogramasRevisao: CronogramaRevisao[];
  historicoAtividades?: LogHistoricoAtividade[];
  decision: SDEApplicationResult;
  privateMaterialCatalog?: readonly PrivateStudyMaterial[];
}): CoachGroundingContext {
  const {
    referenceDate,
    configuracao,
    disciplinas,
    assuntos,
    subassuntos,
    tentativasQuestoes,
    sessoesEstudo,
    cronogramasRevisao,
    historicoAtividades = [],
    decision,
    privateMaterialCatalog = []
  } = params;

  const actualCorrect = tentativasQuestoes.filter(
    (attempt) => attempt.acertou
  ).length;
  const actualStudyMinutes = sessoesEstudo.reduce(
    (sum, session) => sum + Math.ceil(session.tempoGastoSegundos / 60),
    0
  );

  const disciplineById = new Map(disciplinas.map((item) => [item.id, item]));
  const subjectById = new Map(assuntos.map((item) => [item.id, item]));
  const subtopicById = new Map(subassuntos.map((item) => [item.id, item]));
  const errorSummaries = buildErrorTopicSummaries(tentativasQuestoes);
  const reviewMethodEvidence = buildReviewMethodEvidence(
    cronogramasRevisao
      .filter((item) => !item.isDeleted)
      .map((item) => ({
        ...item,
        historicoTentativas: item.historicoTentativas.map((history) => ({
          revisadoEm: history.revisadoEm,
          desempenhoAutoAvaliado: history.desempenhoAutoAvaliado,
          recuperacaoIndependente: history.recuperacaoIndependente,
          usouAjuda: history.usouAjuda,
          intervaloDecididoDias: history.intervaloDecididoDias,
          racionalIntervalo: history.racionalIntervalo ? [...history.racionalIntervalo] : undefined,
          modoSeguinte: history.modoSeguinte,
          metodoAplicado: history.metodoAplicado,
          motivoSelecaoMetodo: history.motivoSelecaoMetodo,
          selecaoExploratoria: history.selecaoExploratoria,
          diasDesdeRevisaoAnterior: history.diasDesdeRevisaoAnterior,
          tempoGastoSegundos: history.tempoGastoSegundos,
          duracaoFonte: history.duracaoFonte
        }))
      }))
  );
  const reviewMethodPreference = selectObservedPreferredReviewMethod(reviewMethodEvidence);
  const evidenceCoverage = buildDataprevEvidenceCoverage({
    configuracao,
    subassuntos,
    tentativasQuestoes,
    cronogramasRevisao
  }, referenceDate);

  const weeklyCalibration = buildWeeklyCalibrationReport({
    referenceDate,
    availability: configuracao.disponibilidadeEstudo,
    sessions: sessoesEstudo,
    attempts: tentativasQuestoes,
    reviewSchedules: cronogramasRevisao,
    activities: historicoAtividades,
    subtopics: subassuntos
  });

  const dueReviews = cronogramasRevisao
    .filter(
      (schedule) =>
        !schedule.desabilitada &&
        !schedule.isDeleted &&
        schedule.proximaRevisaoData.slice(0, 10) <= referenceDate
    )
    .sort(
      (a, b) =>
        a.proximaRevisaoData.localeCompare(b.proximaRevisaoData) ||
        a.id.localeCompare(b.id)
    );

  const byDiscipline = disciplinas.map((discipline) => {
    const attempts = tentativasQuestoes.filter(
      (attempt) => attempt.disciplinaId === discipline.id
    );
    const correct = attempts.filter((attempt) => attempt.acertou).length;
    const minutes = sessoesEstudo
      .filter((session) => session.disciplinaId === discipline.id)
      .reduce(
        (sum, session) => sum + Math.ceil(session.tempoGastoSegundos / 60),
        0
      );
    return {
      disciplinaId: discipline.id,
      nome: discipline.nome,
      tentativasReais: attempts.length,
      acertosReais: correct,
      taxaAcertoObservada:
        attempts.length > 0 ? correct / attempts.length : null,
      tempoRegistradoMinutos: minutes
    };
  });

  return {
    fonte: "REGISTROS_GRANULARES_DO_APLICATIVO",
    referenceDate,
    concurso: {
      concursoId: configuracao.concursoAlvoId ?? null,
      localProva: configuracao.localProva ?? null,
      localLotacao: configuracao.localLotacao ?? null
    },
    evidencias: {
      tentativasReais: tentativasQuestoes.length,
      acertosReais: actualCorrect,
      taxaAcertoObservada:
        tentativasQuestoes.length > 0
          ? actualCorrect / tentativasQuestoes.length
          : null,
      tempoRegistradoMinutos: actualStudyMinutes,
      porDisciplina: byDiscipline,
      calibracaoSemanal: weeklyCalibration,
      mapaEvidencias: {
        totalSubtopics: evidenceCoverage.totalSubtopics,
        theoryConfirmed: evidenceCoverage.descriptiveCoverage.theoryConfirmed,
        withQuestionEvidence: evidenceCoverage.descriptiveCoverage.withQuestionEvidence,
        withRepeatedQuestionEvidence: evidenceCoverage.descriptiveCoverage.withRepeatedQuestionEvidence,
        activeErrorWithoutRecovery: evidenceCoverage.descriptiveCoverage.activeErrorWithoutRecovery,
        roadmap: evidenceCoverage.roadmap.slice(0, 10).map((item) => ({
          kind: item.kind,
          disciplina: item.disciplinaNome,
          assunto: item.assuntoNome,
          subassunto: item.subassuntoNome,
          state: item.state,
          reason: item.reason
        })),
        caveats: [...evidenceCoverage.caveats]
      },
      recuperacao: {
        topicosComErro: errorSummaries.length,
        topicosSemAcertoPosterior: errorSummaries.filter(
          (item) => item.estadoRecuperacao === "SEM_ACERTO_POSTERIOR"
        ).length,
        topicosComRecuperacaoRepetida: errorSummaries.filter(
          (item) =>
            item.estadoRecuperacao === "DOIS_OU_MAIS_ACERTOS_POSTERIORES"
        ).length,
        errosPorTopico: errorSummaries.slice(0, 20).map((item) => ({
          disciplina:
            disciplineById.get(item.disciplinaId)?.nome ?? item.disciplinaId,
          assunto: subjectById.get(item.assuntoId)?.nome ?? item.assuntoId,
          subassunto:
            subtopicById.get(item.subassuntoId)?.nome ?? item.subassuntoId,
          errosRegistrados: item.totalErros,
          acertosAposUltimoErro: item.acertosAposUltimoErro,
          estadoRecuperacao: item.estadoRecuperacao,
          causasDeclaradas: Object.fromEntries(
            Object.entries(item.causasDeclaradas).filter(
              ([, count]) => (count ?? 0) > 0
            )
          ) as Record<string, number>
        })),
        revisoesAtivas: cronogramasRevisao.filter(
          (item) => !item.desabilitada && !item.isDeleted
        ).length,
        revisoesVencidas: dueReviews.slice(0, 20).map((item) => ({
          revisaoId: item.id,
          disciplina:
            disciplineById.get(item.disciplinaId)?.nome ?? item.disciplinaId,
          assunto: subjectById.get(item.assuntoId)?.nome ?? item.assuntoId,
          subassunto:
            subtopicById.get(item.subassuntoId)?.nome ?? item.subassuntoId,
          vencimento: item.proximaRevisaoData,
          gatilho: item.gatilhoOrigem ?? null,
          revisoesRegistradas: item.historicoTentativas.length,
          proximoModo: item.modoProximaRevisao ?? null,
          intervaloDecididoDias: item.ultimaDecisaoIntervaloDias ?? null,
          requerReaprendizagemImediata: item.requerReaprendizagemImediata ?? false,
          racionalIntervalo: [...(item.racionalUltimoIntervalo ?? [])],
          proximoMetodo: item.metodoProximaRevisao ?? null,
          motivoSelecaoMetodo: item.motivoMetodoProximaRevisao ?? null,
          selecaoExploratoria: item.proximaSelecaoExploratoria ?? false
        })),
        politicaDeRevisao: REVIEW_POLICY_VERSION,
        comparacaoMetodos: reviewMethodEvidence.map((item) => ({
          method: item.method,
          delayedOutcomes: item.delayedOutcomes,
          independentRecoveries: item.independentRecoveries,
          failures: item.failures,
          distinctSubtopics: item.distinctSubtopics,
          successRate: item.successRate,
          preferenceEligible: item.preferenceEligible,
          timedDelayedOutcomes: item.timedDelayedOutcomes,
          timedIndependentRecoveries: item.timedIndependentRecoveries,
          timedDistinctSubtopics: item.timedDistinctSubtopics,
          totalTimedMinutes: item.totalTimedMinutes,
          observedIndependentRecoveriesPer10Minutes: item.observedIndependentRecoveriesPer10Minutes,
          efficiencyEligible: item.efficiencyEligible
        })),
        statusComparacaoMetodos: reviewMethodPreference.status,
        basePreferenciaMetodos: reviewMethodPreference.basis,
        metodoPreferidoObservado: reviewMethodPreference.preferredMethod,
        razoesComparacaoMetodos: [...reviewMethodPreference.reasons]
      }
    },
    decisaoSDE: {
      status: decision.status,
      disponibilidade: decision.availability,
      acoesPrioritarias: decision.actions.slice(0, 5).map((action) => ({
        prioridade: action.prioridade,
        tipo: action.tipo,
        disciplina: action.disciplinaNome,
        assunto: action.assuntoNome,
        subassunto: action.subassuntoNome ?? null,
        duracaoOperacionalMinutos: action.estimatedDurationMinutes,
        camadaConstitucional: action.camadaConstitucional,
        motivo: action.justificativaXAI.porQue,
        confianca: action.justificativaXAI.nivelConfianca,
        dadosAusentes: [...action.justificativaXAI.dadosAusentes],
        diagnosticPurpose: action.diagnosticPurpose ?? false,
        materialSugerido:
          configuracao.concursoAlvoId
            ? routePrivateStudyMaterial(privateMaterialCatalog, {
                concursoId: configuracao.concursoAlvoId,
                activity: action.tipo,
                disciplineId: action.disciplinaId,
                topicId: action.assuntoId,
                subtopicId: action.subassuntoId
              })
            : null,
        ranking: {
          isTied: action.rankingContext?.isTied ?? false,
          tiedActionCount: action.rankingContext?.tiedActionCount ?? 1,
          tieBreakRule: action.rankingContext?.tieBreakRule ?? null,
          note: action.rankingContext?.note ?? null
        }
      })),
      plano:
        decision.planner?.status === "SUCCESS"
          ? decision.planner.plan.blocos.flatMap((block) =>
              block.sessões.map((session) => ({
                sequencia: session.sequencia,
                tipo: session.tipo,
                disciplina: session.disciplinaNome,
                assunto: session.assuntoNome,
                duracaoMinutos: session.tempoMinutos
              }))
            )
          : null,
      protecoesPlanner:
        decision.planner?.status === "SUCCESS"
          ? decision.planner.plan.adjustments
              .filter((item) =>
                item.code === "NEW_CONTENT_PROGRESS_GUARD" ||
                item.code === "NEW_CONTENT_PROGRESS_GUARD_NOT_APPLIED"
              )
              .map((item) => item.reason)
          : [],
      avisos: [...decision.warnings],
      erros: [...decision.errors]
    }
  };
}
