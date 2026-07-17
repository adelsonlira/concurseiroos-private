import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  FileQuestion,
  Pause,
  Play,
  Save,
  Square,
  Timer
} from "lucide-react";
import { useConcurseiroStore } from "../store";
import { StudyActivityKind, StudySessionType } from "../types";
import { routePrivateStudyMaterial } from "../core/materials/materialPolicy";
import { privateMaterialProviderLabel, privateMaterialSourceRoleLabel } from "../core/materials/materialPresentation";
import { findCompetitionRuntimeDefinition } from "../config/concursos/registry";
import ExternalAttemptRecorder from "./ExternalAttemptRecorder";
import { resolveLatestQuestionBatchProgress } from "../core/prescription/questionBatchProgress";
import ExternalQuestionSourcePlanCard from "./ExternalQuestionSourcePlanCard";
import StudyFocusGuideCard from "./StudyFocusGuideCard";
import PrivatePdfOpenButton from "./PrivatePdfOpenButton";
import GuidedLearningCloseout from "./GuidedLearningCloseout";
import GuidedLearningActivation from "./GuidedLearningActivation";
import type { GuidedQuestionDraft, GuidedQuestionResponse, LearningCycleAssessment } from "../core/learning/types";
import {
  areGuidedQuestionDraftsComplete,
  toGuidedQuestionResponses
} from "../core/learning/guidedResponsePolicy";

const ACTIVITY_LABELS: Record<StudyActivityKind, string> = {
  teoria: "Teoria ativa",
  questoes: "Questões",
  revisao: "Revisão ativa",
  flashcards: "Flashcards",
  simulado: "Simulado"
};

function currentDateKey(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${hours > 0 ? `${pad(hours)}:` : ""}${pad(minutes)}:${pad(seconds)}`;
}

export default function FocusModeDesk({ onOpenQuestions, onAskCoach }: { onOpenQuestions?: () => void; onAskCoach?: () => void }) {
  const {
    isTimerRunning,
    timerSecondsElapsed,
    startStudyTimer,
    stopStudyTimer,
    tickStudyTimer,
    finishStudySession,
    disciplinas,
    assuntos,
    subassuntos,
    sessoesEstudo,
    tentativasQuestoes,
    configuracao,
    ultimaDecisaoSDE,
    executarSDEParaData
  } = useConcurseiroStore();

  const [selectedDiscId, setSelectedDiscId] = useState("");
  const [selectedAssId, setSelectedAssId] = useState("");
  const [selectedSubId, setSelectedSubId] = useState("");
  const [selectedActivity, setSelectedActivity] = useState<StudyActivityKind>("teoria");
  const [notesText, setNotesText] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [sessionSuccess, setSessionSuccess] = useState(false);
  const [completedActivity, setCompletedActivity] = useState<StudyActivityKind | null>(null);
  const [completedPrescriptionId, setCompletedPrescriptionId] = useState<string | null>(null);
  const [completedMaterialSource, setCompletedMaterialSource] = useState<string | undefined>();
  const [completedGuideQuestions, setCompletedGuideQuestions] = useState<string[]>([]);
  const [preStudyDrafts, setPreStudyDrafts] = useState<Record<number, GuidedQuestionDraft>>({});
  const [completedPreStudyResponses, setCompletedPreStudyResponses] = useState<GuidedQuestionResponse[]>([]);
  const [completedLearningAssessment, setCompletedLearningAssessment] = useState<LearningCycleAssessment | null>(null);
  const [markTheoryCompleted, setMarkTheoryCompleted] = useState(false);
  const [lastAppliedPrescriptionId, setLastAppliedPrescriptionId] = useState<string | null>(null);
  const [selectedQuestionSourceId, setSelectedQuestionSourceId] = useState("");

  const prescription = ultimaDecisaoSDE?.prescription?.current ?? null;
  const filteredAssuntos = assuntos.filter((item) => item.disciplinaId === selectedDiscId);
  const filteredSubassuntos = subassuntos.filter((item) => item.assuntoId === selectedAssId);

  const selectionMatchesPrescription = Boolean(
    prescription &&
      prescription.disciplineId === selectedDiscId &&
      prescription.topicId === selectedAssId &&
      (prescription.subtopicId ?? "") === selectedSubId &&
      prescription.activity === selectedActivity
  );
  const activeGuideQuestions = selectionMatchesPrescription
    ? prescription?.focusGuide?.questions ?? []
    : [];
  const guidedActivationComplete = activeGuideQuestions.length === 0 ||
    areGuidedQuestionDraftsComplete(activeGuideQuestions, preStudyDrafts);

  const selectedMaterial = useMemo(() => {
    if (selectionMatchesPrescription && prescription?.material) return prescription.material;
    if (!configuracao.concursoAlvoId || !selectedDiscId || !selectedAssId) return null;
    const privateMaterialCatalog =
      findCompetitionRuntimeDefinition(configuracao.concursoAlvoId)?.privateStudyMaterials ?? [];
    return routePrivateStudyMaterial(privateMaterialCatalog, {
      concursoId: configuracao.concursoAlvoId,
      activity: selectedActivity,
      diagnosticPurpose: selectionMatchesPrescription && prescription?.diagnosticPurpose === true,
      disciplineId: selectedDiscId,
      topicId: selectedAssId,
      subtopicId: selectedSubId || undefined
    });
  }, [
    selectionMatchesPrescription,
    prescription,
    configuracao.concursoAlvoId,
    selectedActivity,
    prescription?.diagnosticPurpose,
    selectedDiscId,
    selectedAssId,
    selectedSubId
  ]);

  const questionSourceOptions = useMemo(() => {
    if (selectedActivity !== "questoes") return [];
    const options: Array<{
      id: string;
      label: string;
      kind: "PRIVATE_MATERIAL" | "EXTERNAL_BANK";
    }> = [];
    const localQuestionSet = Boolean(
      selectedMaterial &&
        ["COMMENTED_QUESTIONS", "QUESTION_LIST", "SIMULATION"].includes(
          selectedMaterial.contentKind
        )
    );
    const externalRecommendations =
      prescription?.questionPractice?.externalSourcePlan?.recommendations ?? [];
    const externalIsPrimary = externalRecommendations.some(
      (item) => item.usage === "PRIMARY"
    );

    if (selectedMaterial && localQuestionSet && !externalIsPrimary) {
      options.push({
        id: `private:${selectedMaterial.materialId}`,
        label: `${privateMaterialProviderLabel(selectedMaterial.sourceProvider)} · ${selectedMaterial.materialTitle}`,
        kind: "PRIVATE_MATERIAL"
      });
    }
    if (selectionMatchesPrescription && externalIsPrimary) {
      for (const source of externalRecommendations) {
        options.push({
          id: `external:${source.sourceId}`,
          label: source.displayName,
          kind: "EXTERNAL_BANK"
        });
      }
    }
    return options;
  }, [
    selectedActivity,
    selectedMaterial,
    selectionMatchesPrescription,
    prescription?.questionPractice?.externalSourcePlan
  ]);

  const selectedQuestionSource =
    questionSourceOptions.find((item) => item.id === selectedQuestionSourceId) ??
    questionSourceOptions[0] ??
    null;

  useEffect(() => {
    if (selectedActivity !== "questoes") {
      if (selectedQuestionSourceId) setSelectedQuestionSourceId("");
      return;
    }
    if (questionSourceOptions.some((item) => item.id === selectedQuestionSourceId)) return;

    const externalIsPrimary = Boolean(
      prescription?.questionPractice?.externalSourcePlan?.recommendations.some(
        (item) => item.usage === "PRIMARY"
      )
    );
    const preferred = externalIsPrimary
      ? questionSourceOptions.find((item) => item.kind === "EXTERNAL_BANK")
      : questionSourceOptions.find((item) => item.kind === "PRIVATE_MATERIAL");
    setSelectedQuestionSourceId(preferred?.id ?? questionSourceOptions[0]?.id ?? "");
  }, [
    selectedActivity,
    selectedQuestionSourceId,
    questionSourceOptions,
    prescription?.questionPractice?.externalSourcePlan?.need
  ]);

  const latestQuestionBatch = useMemo(
    () =>
      resolveLatestQuestionBatchProgress({
        sessions: sessoesEstudo
          .filter((session) => session.atividadeEstudo === "questoes")
          .map((session) => ({
            sessionId: session.id,
            endedAt: session.dataFim,
            disciplineId: session.disciplinaId,
            topicId: session.assuntoId,
            subtopicId: session.subassuntoId,
            prescriptionId: session.decisaoSDE?.prescriptionId,
            targetQuestionCount: session.decisaoSDE?.targetQuestionCount,
            stretchQuestionCount: session.decisaoSDE?.stretchQuestionCount,
          diagnosticPurpose: session.decisaoSDE?.sdeDiagnosticPurpose
          })),
        attempts: tentativasQuestoes.map((attempt) => ({
          attemptedAt: attempt.respondidaEm,
          disciplineId: attempt.disciplinaId,
          topicId: attempt.assuntoId,
          subtopicId: attempt.subassuntoId,
          contextId: attempt.contextoId
        }))
      }),
    [sessoesEstudo, tentativasQuestoes]
  );

  const completedQuestionBatch =
    completedPrescriptionId && latestQuestionBatch?.prescriptionId === completedPrescriptionId
      ? latestQuestionBatch
      : null;

  const guidedCloseoutPending = Boolean(
    sessionSuccess &&
      completedPrescriptionId &&
      completedGuideQuestions.length > 0 &&
      completedLearningAssessment === null
  );

  const applyPrescription = () => {
    if (!prescription || isTimerRunning) return;
    setSelectedDiscId(prescription.disciplineId);
    setSelectedAssId(prescription.topicId);
    setSelectedSubId(prescription.subtopicId ?? "");
    setSelectedActivity(prescription.activity);
    setLastAppliedPrescriptionId(prescription.id);
    setMarkTheoryCompleted(false);
    setPreStudyDrafts({});
  };

  useEffect(() => {
    if (!isTimerRunning || isPaused) return;
    const interval = window.setInterval(() => tickStudyTimer(), 1000);
    return () => window.clearInterval(interval);
  }, [isTimerRunning, isPaused, tickStudyTimer]);

  useEffect(() => {
    if (subassuntos.length === 0) return;
    // Keep the completed prescription stable while the learner closes the
    // guided retrieval cycle. Recomputing here would replace the visible
    // prescription before its learning evidence has been recorded.
    if (guidedCloseoutPending) return;
    const today = currentDateKey(configuracao.disponibilidadeEstudo.timeZone);
    if (ultimaDecisaoSDE?.referenceDate !== today) executarSDEParaData(today);
  }, [
    subassuntos.length,
    guidedCloseoutPending,
    configuracao.disponibilidadeEstudo.timeZone,
    ultimaDecisaoSDE?.referenceDate,
    executarSDEParaData
  ]);

  useEffect(() => {
    if (
      prescription &&
      !isTimerRunning &&
      prescription.id !== lastAppliedPrescriptionId
    ) {
      applyPrescription();
    }
  }, [prescription?.id, isTimerRunning, lastAppliedPrescriptionId]);

  const handleToggleTimer = () => {
    if (isTimerRunning) {
      setIsPaused((paused) => !paused);
      return;
    }
    if (!selectedDiscId || !selectedAssId) {
      window.alert("A sessão precisa de disciplina e assunto definidos.");
      return;
    }
    if (!guidedActivationComplete) {
      window.alert("Registre a tentativa inicial de todas as perguntas-guia antes de iniciar a sessão.");
      return;
    }
    startStudyTimer(StudySessionType.STOPWATCH);
    setIsPaused(false);
    setSessionSuccess(false);
    setCompletedActivity(null);
    setCompletedPrescriptionId(null);
    setCompletedMaterialSource(undefined);
    setCompletedPreStudyResponses([]);
    setCompletedLearningAssessment(null);
  };

  const handleFinish = () => {
    if (!selectedDiscId || timerSecondsElapsed < 5) return;
    const finishedPrescriptionId = selectionMatchesPrescription ? prescription?.id ?? null : null;
    const finishedGuideQuestions = selectionMatchesPrescription ? prescription?.focusGuide?.questions ?? [] : [];
    const finishedPreStudyResponses = finishedGuideQuestions.length > 0
      ? toGuidedQuestionResponses(finishedGuideQuestions, preStudyDrafts)
      : [];
    const executedPrivateMaterial =
      selectedActivity !== "questoes" || selectedQuestionSource?.kind === "PRIVATE_MATERIAL"
        ? selectedMaterial
        : null;
    const materialSource =
      selectedActivity === "questoes"
        ? selectedQuestionSource?.label
        : selectedMaterial
          ? `${selectedMaterial.materialTitle} · ${selectedMaterial.sectionTitle} · páginas ${selectedMaterial.startPage}–${selectedMaterial.endPage}`
          : undefined;
    finishStudySession(
      selectedDiscId,
      selectedAssId || undefined,
      selectedSubId || undefined,
      notesText,
      {
        atividadeEstudo: selectedActivity,
        sdeReferenceDate: ultimaDecisaoSDE?.referenceDate,
        sdePrioridade: selectionMatchesPrescription ? prescription?.strategicPriority : undefined,
        sdeReasonCode: selectionMatchesPrescription ? prescription?.reasonCode : undefined,
        sdeDiagnosticPurpose: selectionMatchesPrescription ? prescription?.diagnosticPurpose : undefined,
        duracaoPlanejadaMinutos: selectionMatchesPrescription
          ? prescription?.durationMinutes ?? null
          : null,
        prescriptionId: selectionMatchesPrescription ? prescription?.id : undefined,
        targetQuestionCount: selectionMatchesPrescription
          ? prescription?.questionPractice?.targetQuestions ?? null
          : null,
        stretchQuestionCount: selectionMatchesPrescription
          ? prescription?.questionPractice?.stretchTargetQuestions ?? null
          : null,
        materialId: executedPrivateMaterial?.materialId,
        materialStartPage: executedPrivateMaterial?.startPage,
        materialEndPage: executedPrivateMaterial?.endPage,
        questionSourceId:
          selectedActivity === "questoes" ? selectedQuestionSource?.id : undefined,
        questionSourceLabel:
          selectedActivity === "questoes" ? selectedQuestionSource?.label : undefined,
        questionSourceKind:
          selectedActivity === "questoes" ? selectedQuestionSource?.kind : undefined,
        markTheoryCompleted:
          selectedActivity === "teoria" &&
          Boolean(selectedSubId) &&
          finishedGuideQuestions.length === 0 &&
          markTheoryCompleted
      }
    );
    setCompletedActivity(selectedActivity);
    setCompletedPrescriptionId(finishedPrescriptionId);
    setCompletedMaterialSource(materialSource);
    setCompletedGuideQuestions(finishedGuideQuestions);
    setCompletedPreStudyResponses(finishedPreStudyResponses);
    setCompletedLearningAssessment(null);
    setNotesText("");
    setMarkTheoryCompleted(false);
    setIsPaused(false);
    setSessionSuccess(true);
  };

  const handleCancel = () => {
    stopStudyTimer();
    setIsPaused(false);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-4 text-zinc-100 sm:p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="flex flex-col justify-between gap-3 border-b border-zinc-900 pb-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-blue-300">
              <Timer className="h-4 w-4" />
              Sessão guiada pelo coach
            </div>
            <h1 className="mt-2 text-xl font-bold text-zinc-100">
              Execute uma decisão por vez
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono uppercase text-zinc-600">Tempo líquido e evidências reais</span>
            <button type="button" onClick={onAskCoach} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-cyan-500/50">Tirar dúvida</button>
          </div>
        </header>

        {prescription && (
          <section className="rounded-2xl border border-blue-500/30 bg-blue-500/7 p-5">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-blue-300">
                  Prescrição atual
                </div>
                <h2 className="mt-2 text-xl font-bold text-white">
                  {ACTIVITY_LABELS[prescription.activity]} · {prescription.subtopicName ?? prescription.topicName}
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  {prescription.disciplineName} · {prescription.topicName}
                </p>
              </div>
              <div className="flex gap-2">
                <div className="rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-right">
                  <div className="text-[9px] font-mono uppercase text-zinc-500">Duração</div>
                  <div className="mt-1 text-lg font-bold">{prescription.durationMinutes} min</div>
                </div>
                {prescription.questionPractice && (
                  <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-right">
                    <div className="text-[9px] font-mono uppercase text-amber-400">Questões</div>
                    <div className="mt-1 text-lg font-bold text-amber-200">
                      {prescription.questionPractice.targetQuestions}–{prescription.questionPractice.stretchTargetQuestions}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {prescription.focusGuide && (
              <div className="mt-4">
                <StudyFocusGuideCard guide={prescription.focusGuide} />
              </div>
            )}

            <div className={`mt-4 rounded-xl border p-4 ${prescription.executionReadiness.status === "READY" ? "border-emerald-500/25 bg-emerald-500/5" : "border-amber-500/25 bg-amber-500/5"}`}>
              <h3 className="text-[10px] font-mono uppercase text-zinc-400">Prontidão de execução</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-300">{prescription.executionReadiness.reason}</p>
              <p className="mt-2 text-xs leading-relaxed text-cyan-200">{prescription.nextAction.afterCompletion}</p>
              {prescription.nextAction.preview && (
                <p className="mt-1 text-xs text-zinc-400">Depois: {prescription.nextAction.preview}</p>
              )}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/55 p-4">
                <h3 className="text-[10px] font-mono uppercase text-zinc-500">Roteiro da sessão</h3>
                <ol className="mt-3 space-y-2">
                  {prescription.executionSteps.map((step) => (
                    <li key={`${step.passo}-${step.phase}`} className="flex gap-3 text-xs leading-relaxed text-zinc-300">
                      <span className="font-mono text-blue-300">{step.passo}.</span>
                      <span className="flex-1">{step.descricao}</span>
                      <span className="shrink-0 font-mono text-zinc-600">{step.tempoMinutos} min</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/55 p-4">
                <h3 className="text-[10px] font-mono uppercase text-zinc-500">O que registrar</h3>
                <ul className="mt-3 space-y-2">
                  {prescription.completionEvidence.map((item) => (
                    <li key={item} className="flex gap-2 text-xs leading-relaxed text-zinc-300">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {!isTimerRunning && activeGuideQuestions.length > 0 && (!sessionSuccess || completedLearningAssessment !== null) && (
          <GuidedLearningActivation
            questions={activeGuideQuestions}
            drafts={preStudyDrafts}
            onChange={(questionIndex, draft) =>
              setPreStudyDrafts((state) => ({ ...state, [questionIndex]: draft }))
            }
          />
        )}

        <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
          <section className="flex min-h-[360px] flex-col items-center justify-center gap-6 rounded-2xl border border-zinc-800 bg-zinc-900/20 p-5">
            <div className="text-center">
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                Cronômetro de estudo líquido
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                {isTimerRunning ? (isPaused ? "Pausado" : "Sessão em andamento") : "Pronto para iniciar"}
              </p>
            </div>

            <div className="relative flex h-48 w-48 items-center justify-center rounded-full border-2 border-zinc-800 bg-zinc-950 shadow-2xl">
              {isTimerRunning && !isPaused && (
                <div className="absolute inset-0 animate-ping rounded-full border-2 border-blue-500 opacity-20" />
              )}
              <div className="text-center">
                <div className="text-4xl font-extrabold tracking-wider text-zinc-100">
                  {formatTime(timerSecondsElapsed)}
                </div>
                <div className="mt-1 text-[9px] font-mono uppercase text-zinc-600">
                  hora · minuto · segundo
                </div>
              </div>
            </div>

            <div className="flex w-full gap-2">
              <button
                type="button"
                onClick={handleToggleTimer}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition ${
                  isTimerRunning
                    ? isPaused
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-amber-600 hover:bg-amber-500"
                    : "bg-blue-600 hover:bg-blue-500"
                }`}
              >
                {isTimerRunning ? (
                  isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
                {isTimerRunning ? (isPaused ? "Retomar" : "Pausar") : "Iniciar sessão"}
              </button>

              {isTimerRunning && (
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={timerSecondsElapsed < 5}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Save className="h-4 w-4" />
                  Concluir
                </button>
              )}

              {isTimerRunning && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-red-400 transition hover:bg-zinc-800"
                  title="Descartar sessão"
                >
                  <Square className="h-4 w-4 fill-current" />
                </button>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/20 p-5">
            {selectedActivity === "questoes" && questionSourceOptions.length > 0 && (
              <label className="flex flex-col gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] p-4 text-[10px] font-mono uppercase text-cyan-300">
                Fonte da bateria
                <select
                  value={selectedQuestionSource?.id ?? ""}
                  onChange={(event) => setSelectedQuestionSourceId(event.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs normal-case text-zinc-200 outline-none focus:border-cyan-500"
                >
                  {questionSourceOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <span className="normal-case font-sans text-[11px] leading-relaxed text-zinc-500">
                  O coach definiu o conteúdo e a quantidade. Troque apenas a plataforma usada para executar a mesma bateria.
                </span>
              </label>
            )}

            {selectedMaterial ? (
              <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-4">
                <div className="flex items-start gap-3">
                  <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-indigo-300" />
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-300">
                      {selectedActivity === "questoes" && selectedQuestionSource?.kind === "EXTERNAL_BANK"
                        ? "Material para correção opcional"
                        : selectedActivity === "questoes" && prescription?.diagnosticPurpose
                          ? "Abra somente a seção de questões"
                          : selectedActivity === "questoes"
                            ? "Fonte da bateria"
                            : "Abra antes de iniciar"}
                    </div>
                    <div className="mt-1 text-[10px] font-mono uppercase tracking-wider text-indigo-300/80">
                      {privateMaterialSourceRoleLabel(selectedMaterial.sourceRole)} · {privateMaterialProviderLabel(selectedMaterial.sourceProvider)}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-zinc-200">
                      {selectedMaterial.sectionTitle}
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">Arquivo: {selectedMaterial.materialTitle}</p>
                    <p className="mt-2 text-base font-bold text-indigo-200">
                      Páginas {selectedMaterial.startPage}–{selectedMaterial.endPage}
                    </p>
                    {selectedMaterial.questionBank && (
                      <p className="mt-1 text-[11px] text-zinc-500">
                        Banco identificado: {selectedMaterial.questionBank}
                      </p>
                    )}
                    {selectedActivity === "questoes" && prescription?.diagnosticPurpose && selectedQuestionSource?.kind === "PRIVATE_MATERIAL" && (
                      <p className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-2 text-[11px] leading-relaxed text-amber-100/70">
                        Responda primeiro. Não leia teoria, comentários ou gabarito. Se a seção exibir a solução junto da questão, use o banco externo recomendado em vez deste PDF.
                      </p>
                    )}
                    <PrivatePdfOpenButton material={selectedMaterial} compact />
                  </div>
                </div>
              </div>
            ) : selectedActivity === "questoes" && selectedQuestionSource?.kind === "EXTERNAL_BANK" ? null : (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-xs leading-relaxed text-zinc-400">
                <div className="font-semibold text-amber-300">Material não localizado com segurança</div>
                <p className="mt-1">Use um material próprio que cubra exatamente o assunto selecionado e registre a fonte nas notas.</p>
              </div>
            )}

            {selectionMatchesPrescription &&
              selectedActivity === "questoes" &&
              prescription?.questionPractice?.externalSourcePlan && (
                <ExternalQuestionSourcePlanCard
                  plan={prescription.questionPractice.externalSourcePlan}
                />
              )}

            {selectionMatchesPrescription && prescription?.diagnosticFollowUp && (
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] p-4 text-[11px] leading-relaxed text-zinc-400">
                <div className="font-mono text-[10px] uppercase tracking-wider text-cyan-300">
                  Depois desta bateria
                </div>
                <p className="mt-2"><strong className="text-emerald-300">Se passar:</strong> {prescription.diagnosticFollowUp.onPass}</p>
                <p className="mt-2"><strong className="text-amber-300">Se não passar:</strong> {prescription.diagnosticFollowUp.onFail}</p>
              </div>
            )}

            <div className="flex flex-1 flex-col">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Registro da sessão
                </h3>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Anote apenas dúvidas, recuperações e erros úteis para a próxima decisão.
                </p>
              </div>
              <textarea
                value={notesText}
                onChange={(event) => setNotesText(event.target.value)}
                placeholder="Ex.: confundi 2FN com 3FN; consegui explicar dependência funcional sem consulta; revisar exemplo de chave composta."
                className="mt-3 min-h-[190px] flex-1 resize-none rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-300 outline-none transition focus:border-blue-500"
              />

              {selectedActivity === "teoria" && selectedSubId && activeGuideQuestions.length === 0 && (
                <label className="mt-3 flex items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-[11px] leading-relaxed text-zinc-400">
                  <input
                    type="checkbox"
                    checked={markTheoryCompleted}
                    onChange={(event) => setMarkTheoryCompleted(event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-blue-500"
                  />
                  <span>
                    Confirmo que cobri este subassunto e tentei recuperá-lo sem consulta. Só então o coach poderá avançar para diagnóstico por questões.
                  </span>
                </label>
              )}
              {selectedActivity === "teoria" && selectedSubId && activeGuideQuestions.length > 0 && (
                <p className="mt-3 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] p-3 text-[11px] leading-relaxed text-cyan-100/70">
                  A conclusão teórica será decidida pelo fechamento das perguntas-guia. Não é necessário marcar uma confirmação manual.
                </p>
              )}
            </div>
          </section>
        </div>

        {!isTimerRunning && (
          <details className="rounded-xl border border-zinc-800 bg-zinc-900/15 p-4">
            <summary className="cursor-pointer text-xs font-semibold text-zinc-400">
              Alterar manualmente a sessão recomendada
            </summary>
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
              Use somente quando houver uma restrição real não conhecida pelo coach. A alteração será registrada como execução manual.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <SelectField label="Atividade" value={selectedActivity} onChange={(value) => setSelectedActivity(value as StudyActivityKind)}>
                <option value="teoria">Teoria</option>
                <option value="questoes">Questões</option>
                <option value="revisao">Revisão</option>
                <option value="flashcards">Flashcards</option>
                <option value="simulado">Simulado</option>
              </SelectField>
              <SelectField
                label="Disciplina"
                value={selectedDiscId}
                onChange={(value) => {
                  setSelectedDiscId(value);
                  setSelectedAssId("");
                  setSelectedSubId("");
                }}
              >
                <option value="">Selecione...</option>
                {disciplinas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
              </SelectField>
              <SelectField
                label="Assunto"
                value={selectedAssId}
                disabled={!selectedDiscId}
                onChange={(value) => {
                  setSelectedAssId(value);
                  setSelectedSubId("");
                }}
              >
                <option value="">Selecione...</option>
                {filteredAssuntos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
              </SelectField>
              <SelectField
                label="Subassunto"
                value={selectedSubId}
                disabled={!selectedAssId}
                onChange={setSelectedSubId}
              >
                <option value="">Selecione...</option>
                {filteredSubassuntos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
              </SelectField>
            </div>
            {prescription && !selectionMatchesPrescription && (
              <button
                type="button"
                onClick={applyPrescription}
                className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-500/20"
              >
                Voltar à prescrição do coach
              </button>
            )}
          </details>
        )}

        {sessionSuccess && (
          <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <div className="flex-1">
                <h2 className="text-sm font-bold text-emerald-300">
                  {completedGuideQuestions.length > 0 && !completedLearningAssessment
                    ? "Tempo registrado; falta confirmar a aprendizagem"
                    : "Sessão registrada e plano recalculado"}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  {completedGuideQuestions.length > 0 && !completedLearningAssessment
                    ? "Responda agora sem consulta. O Coach só definirá avanço, repetição ou reaprendizagem depois desse fechamento."
                    : "O tempo, a decisão de origem, o material e as páginas foram incorporados às evidências da próxima orientação."}
                </p>
                {completedActivity === "questoes" && !completedQuestionBatch && (
                  <button
                    type="button"
                    onClick={onOpenQuestions}
                    className="mt-3 flex items-center gap-2 rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/25"
                  >
                    <FileQuestion className="h-4 w-4" />
                    Abrir registro de questões
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {sessionSuccess && completedPrescriptionId && completedGuideQuestions.length > 0 && (
          <GuidedLearningCloseout
            prescriptionId={completedPrescriptionId}
            questions={completedGuideQuestions}
            preStudyResponses={completedPreStudyResponses}
            onRecorded={(assessment) => {
              setCompletedLearningAssessment(assessment);
              executarSDEParaData(currentDateKey(configuracao.disponibilidadeEstudo.timeZone));
            }}
          />
        )}

        {sessionSuccess && completedQuestionBatch && (
          <section className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.04] p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-amber-300">
                  <FileQuestion className="h-4 w-4" /> Feche a bateria nesta tela
                </div>
                <h2 className="mt-2 text-base font-bold text-zinc-100">
                  Registre o resumo da bateria antes da próxima decisão
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  Para baterias grandes, informe total, acertos, erros, brancos e tempo uma única vez. O registro individual continua opcional.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/65 px-4 py-3 text-right">
                <div className="text-[9px] font-mono uppercase text-zinc-500">Progresso</div>
                <div className="mt-1 text-xl font-bold text-amber-200">
                  {completedQuestionBatch.completedQuestionCount}/{completedQuestionBatch.targetQuestionCount}
                </div>
              </div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-900">
              <div
                className="h-full rounded-full bg-amber-400 transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    (completedQuestionBatch.completedQuestionCount /
                      completedQuestionBatch.targetQuestionCount) *
                      100
                  )}%`
                }}
              />
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">
              {completedQuestionBatch.isTargetComplete
                ? completedQuestionBatch.isStretchComplete
                  ? "Meta e extensão concluídas. O coach já possui evidência suficiente desta bateria."
                  : `Meta mínima concluída. A extensão até ${completedQuestionBatch.stretchQuestionCount} questões é opcional e só deve continuar se a qualidade estiver estável.`
                : `Faltam ${completedQuestionBatch.remainingQuestionCount} questão(ões) para a meta mínima.`}
            </p>

            {!completedQuestionBatch.isStretchComplete && (
              <div className="mt-4">
                <ExternalAttemptRecorder
                  defaultDisciplineId={completedQuestionBatch.disciplineId}
                  defaultTopicId={completedQuestionBatch.topicId}
                  defaultSubtopicId={completedQuestionBatch.subtopicId}
                  defaultSource={completedMaterialSource}
                  defaultQuestionCount={completedQuestionBatch.remainingQuestionCount}
                  contextId={completedQuestionBatch.prescriptionId}
                  diagnosticPurpose={completedQuestionBatch.diagnosticPurpose}
                  lockScope
                />
              </div>
            )}

            {completedQuestionBatch.isStretchComplete && onOpenQuestions && (
              <button
                type="button"
                onClick={onOpenQuestions}
                className="mt-4 flex items-center gap-2 text-xs font-semibold text-zinc-500 transition hover:text-zinc-300"
              >
                <FileQuestion className="h-4 w-4" /> Abrir histórico da bateria
              </button>
            )}
          </section>
        )}

        <section className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/10 p-4 text-xs leading-relaxed text-zinc-500">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
          <p>
            O cronômetro registra execução, não aprendizado presumido. Questões, recuperações e conclusão teórica precisam ser confirmadas explicitamente para alterar o diagnóstico.
          </p>
        </section>
      </div>
    </div>
  );
}

function SelectField(props: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[10px] font-mono uppercase text-zinc-500">
      {props.label}
      <select
        value={props.value}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
        className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs normal-case text-zinc-300 disabled:opacity-40"
      >
        {props.children}
      </select>
    </label>
  );
}
