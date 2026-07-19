import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, ChevronDown, Clock3, Pause, Play, RefreshCw, ShieldCheck, Square, X } from "lucide-react";
import {
  deriveOptionalStudyState,
  findOptionalStudyMaterial,
  OPTIONAL_STUDY_QUICK_DURATIONS,
  validateManualOptionalChoice,
  type OptionalStudyContext,
  type OptionalStudyRecommendationOption,
  type OptionalStudyResultKind,
} from "../core/optionalStudy";
import type { ExternalEvidenceConsultation, ExternalEvidenceErrorCause, ExternalEvidenceSource } from "../core/externalEvidence/types";
import { useConcurseiroStore } from "../store";

const METHOD_LABELS: Record<string, string> = {
  theory_notebooklm: "Teoria no NotebookLM",
  continue_theory: "Continuação de teoria",
  prerequisite_recovery: "Recuperação de pré-requisito",
  guided_reading: "Leitura orientada",
  active_recall: "Recuperação ativa",
  fgv_questions: "Questões FGV",
  short_question_batch: "Lote curto de questões",
  timed_question_batch: "Bateria cronometrada",
  review_due: "Revisão programada",
  error_review: "Revisão de erros",
  flashcards: "Flashcards",
  technical_practice: "Prática técnica",
  mini_simulation: "Mini-simulado",
  light_organization: "Organização leve",
};

function resultKind(option: OptionalStudyRecommendationOption): OptionalStudyResultKind {
  if (["fgv_questions", "short_question_batch", "timed_question_batch"].includes(option.method)) return "questions";
  if (option.method === "mini_simulation") return "simulation";
  if (["review_due", "error_review", "active_recall", "flashcards"].includes(option.method)) return "review";
  if (option.method === "technical_practice") return "technical_practice";
  if (option.method === "light_organization") return "organization";
  return "theory";
}

const FIELD = "mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100";

export default function OptionalStudyCard({ localDate, context }: { localDate: string; context: OptionalStudyContext }) {
  const {
    optionalStudyLedger,
    disciplinas,
    assuntos,
    subassuntos,
    biblioteca,
    sessoesEstudo,
    gerarRecomendacaoEstudoOpcional,
    manterDescansoOpcional,
    ocultarEstudoOpcionalHoje,
    aceitarEstudoOpcional,
    pausarEstudoOpcional,
    retomarEstudoOpcional,
    concluirEstudoOpcional,
    interromperEstudoOpcional,
  } = useConcurseiroStore();
  const derived = useMemo(() => deriveOptionalStudyState(optionalStudyLedger, localDate), [optionalStudyLedger, localDate]);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showManualPicker, setShowManualPicker] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [manualDisciplineId, setManualDisciplineId] = useState("");
  const [manualTopicId, setManualTopicId] = useState("");
  const [manualSubtopicId, setManualSubtopicId] = useState("");
  const [manualMethod, setManualMethod] = useState<OptionalStudyRecommendationOption["method"]>("active_recall");
  const [manualEnvironment, setManualEnvironment] = useState<OptionalStudyRecommendationOption["environment"]>("concurseiroos");
  const [manualMaterialId, setManualMaterialId] = useState("");
  const [manualSource, setManualSource] = useState<ExternalEvidenceSource | "">("");
  const [manualBoard, setManualBoard] = useState("");
  const [duration, setDuration] = useState(30);
  const [customDuration, setCustomDuration] = useState("");
  const [actualMinutes, setActualMinutes] = useState(30);
  const [total, setTotal] = useState(5);
  const [correct, setCorrect] = useState(0);
  const [blank, setBlank] = useState(0);
  const [source, setSource] = useState<ExternalEvidenceSource | "">("");
  const [board, setBoard] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [consultation, setConsultation] = useState<ExternalEvidenceConsultation>("no");
  const [batchType, setBatchType] = useState("");
  const [conditions, setConditions] = useState("");
  const [errorCause, setErrorCause] = useState<ExternalEvidenceErrorCause | "">("");
  const [notes, setNotes] = useState("");
  const [pagesOrSection, setPagesOrSection] = useState("");
  const [activeRecallPerformed, setActiveRecallPerformed] = useState(false);
  const [completionCriterion, setCompletionCriterion] = useState("");
  const [remainingDoubts, setRemainingDoubts] = useState("");
  const [reviewPerformance, setReviewPerformance] = useState<"difficult" | "intermediate" | "fluent">("intermediate");
  const [rememberedContent, setRememberedContent] = useState("");
  const [persistentErrors, setPersistentErrors] = useState("");
  const [needsNewReview, setNeedsNewReview] = useState(false);
  const [technicalTask, setTechnicalTask] = useState("");
  const [observableResult, setObservableResult] = useState("");
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [technicalDifficulty, setTechnicalDifficulty] = useState<"low" | "medium" | "high" | "not_informed">("not_informed");
  const [helpNeeded, setHelpNeeded] = useState(false);
  const [artifactDescription, setArtifactDescription] = useState("");
  const [operationalAction, setOperationalAction] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!derived.recommendation && !derived.hidden && !derived.restKept) gerarRecomendacaoEstudoOpcional(localDate, context);
  }, [context, derived.hidden, derived.recommendation, derived.restKept, gerarRecomendacaoEstudoOpcional, localDate]);

  useEffect(() => {
    if (!derived.recommendation) return;
    const option = derived.recommendation.primary;
    setSelectedOptionId((value) => value ?? option.optionId);
    setDuration(option.durationMinutes);
    setActualMinutes(option.durationMinutes);
    setManualDisciplineId((value) => value || option.disciplineId);
    setManualTopicId((value) => value || option.topicId);
    setManualSubtopicId((value) => value || option.subtopicId || "");
  }, [derived.recommendation]);

  useEffect(() => {
    if (!derived.selectedOption) return;
    setSource(derived.selectedOption.suggestedSource ?? (derived.selectedOption.environment === "treino_fgv" ? "treino_fgv" : derived.selectedOption.environment === "qconcursos" ? "qconcursos" : ""));
    setBoard(derived.selectedOption.suggestedExaminingBoard ?? (derived.selectedOption.environment === "treino_fgv" ? "FGV" : ""));
  }, [derived.selectedOption]);

  if (derived.hidden || derived.restKept) {
    return <section className="rounded-2xl border border-zinc-800 bg-zinc-900/25 p-5" data-testid="optional-study-dismissed"><h2 className="text-sm font-semibold text-zinc-200">Estudo opcional</h2><p className="mt-2 text-xs leading-relaxed text-zinc-500">{derived.restKept ? "Descanso mantido. Nenhuma sessão, pendência ou evidência negativa foi criada." : "Sugestão ocultada por hoje, sem qualquer efeito no plano."}</p></section>;
  }
  if (!derived.recommendation) {
    return <section className="rounded-2xl border border-zinc-800 bg-zinc-900/25 p-5" aria-busy="true"><div className="flex items-center gap-2 text-sm text-zinc-300"><RefreshCw className="h-4 w-4 animate-spin" /> Carregando recomendação opcional…</div></section>;
  }

  const recommendation = derived.recommendation;
  const options = [recommendation.primary, ...recommendation.alternatives];
  const selected = options.find((item) => item.optionId === selectedOptionId) ?? recommendation.primary;
  const chosenDuration = customDuration.trim() ? Number(customDuration) : duration;
  const overLimit = chosenDuration > 120;
  const manualTopics = assuntos.filter((item) => item.disciplinaId === manualDisciplineId && !item.isDeleted);
  const manualSubtopics = subassuntos.filter((item) => item.assuntoId === manualTopicId && !item.isDeleted);
  const manualDiscipline = disciplinas.find((item) => item.id === manualDisciplineId);
  const manualTopic = assuntos.find((item) => item.id === manualTopicId);
  const manualSubtopic = subassuntos.find((item) => item.id === manualSubtopicId);
  const manualMatch = manualDiscipline && manualTopic ? findOptionalStudyMaterial(biblioteca, manualDiscipline.id, manualTopic.id, manualSubtopic?.id) : { confidence: "none" as const };
  const manualMaterials = biblioteca.filter((item) => !item.isDeleted && (item.id === manualMatch.material?.id || item.disciplinaId === manualDisciplineId || item.assuntoId === manualTopicId));
  const manualMaterial = biblioteca.find((item) => item.id === manualMaterialId) ?? manualMatch.material;
  const weeklyMinutes = recommendation.snapshot.weeklyStudiedMinutes;
  const manualQuestionMethod = ["fgv_questions", "short_question_batch", "timed_question_batch", "mini_simulation"].includes(manualMethod);
  const manualWarnings = validateManualOptionalChoice({
    durationMinutes: chosenDuration,
    materialMatchConfidence: manualMaterial ? manualMatch.confidence : "none",
    prerequisiteAdequate: manualSubtopicId ? !(recommendation.snapshot.prerequisiteBlockedSubtopicIds ?? []).includes(manualSubtopicId) : null,
    weeklyStudiedMinutes: weeklyMinutes,
    method: manualMethod,
    environment: manualEnvironment,
    sourceInformed: !manualQuestionMethod || Boolean(manualSource),
    examiningBoardInformed: !manualQuestionMethod || manualEnvironment !== "qconcursos" || Boolean(manualBoard),
  });
  const manualOption: OptionalStudyRecommendationOption | undefined = manualDiscipline && manualTopic ? {
    ...selected,
    optionId: `optional-manual-${manualDiscipline.id}-${manualTopic.id}-${manualMethod}`,
    disciplineId: manualDiscipline.id,
    disciplineName: manualDiscipline.nome,
    topicId: manualTopic.id,
    topicName: manualTopic.nome,
    subtopicId: manualSubtopic?.id,
    subtopicName: manualSubtopic?.nome,
    method: manualMethod,
    environment: manualEnvironment,
    materialId: manualMaterial?.id,
    materialLabel: manualMaterial?.titulo,
    materialMatchConfidence: manualMaterial ? manualMatch.confidence : "none",
    durationMinutes: chosenDuration,
    objective: `Executar uma atividade opcional de ${METHOD_LABELS[manualMethod] ?? manualMethod}.`,
    completionCriterion: "Registrar somente o resultado efetivamente realizado.",
    rationale: "Escolha manual validada pelas regras canônicas de duração, pré-requisito, material, ambiente, fonte e banca.",
    expectedPedagogicalEffect: "Produzir estudo real e evidência somente quando houver resultado observável.",
    warnings: manualWarnings,
    supportSignals: ["escolha manual explícita"],
    prerequisiteAdequate: manualSubtopicId ? !(recommendation.snapshot.prerequisiteBlockedSubtopicIds ?? []).includes(manualSubtopicId) : null,
    origin: "manual",
    sdeVersion: "1.0",
    suggestedSource: manualSource || undefined,
    suggestedExaminingBoard: manualBoard.trim() || undefined,
  } : undefined;

  if (derived.activeSessionId && derived.selectedOption) {
    const active = derived.selectedOption;
    const kind = resultKind(active);
    const wrong = Math.max(0, total - correct - blank);
    const submit = () => {
      const result = concluirEstudoOpcional(derived.activeSessionId!, {
        kind,
        actualMinutes,
        notes: notes || undefined,
        ...(kind === "questions" || kind === "simulation" ? {
          totalQuestions: total,
          correctAnswers: correct,
          wrongAnswers: wrong,
          blankAnswers: blank,
          source: source || undefined,
          examiningBoard: board.trim() || undefined,
          sourceReference: sourceReference.trim() || undefined,
          consultedMaterial: consultation,
          batchType: batchType.trim() || undefined,
          resolutionConditions: conditions.trim() || undefined,
          primaryErrorCause: errorCause || undefined,
        } : {}),
        ...(kind === "theory" ? {
          materialId: active.materialId,
          materialLabel: active.materialLabel,
          pagesOrSection: pagesOrSection.trim() || undefined,
          activeRecallPerformed,
          objectiveCriteriaMet: Boolean(completionCriterion.trim()),
          completionCriterionReported: completionCriterion.trim() || undefined,
          remainingDoubts: remainingDoubts.trim() || undefined,
        } : {}),
        ...(kind === "review" ? { reviewPerformance, rememberedContent: rememberedContent.trim() || undefined, persistentErrors: persistentErrors.trim() || undefined, needsNewReview } : {}),
        ...(kind === "technical_practice" ? { technicalTask: technicalTask.trim(), observableResult: observableResult.trim() || undefined, taskCompleted, technicalDifficulty, helpNeeded, artifactDescription: artifactDescription.trim() || undefined } : {}),
        ...(kind === "organization" ? { operationalAction: operationalAction.trim() } : {}),
      });
      setMessage(result.success ? "Atividade opcional registrada normalmente." : result.error ?? "Não foi possível concluir.");
    };
    return (
      <section className="max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.05] p-5" data-testid="optional-study-session">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-mono uppercase tracking-wider text-emerald-300">Atividade opcional — sem obrigação no plano</p><h2 className="mt-2 text-lg font-bold text-zinc-100">{METHOD_LABELS[active.method] ?? active.method}</h2><p className="mt-1 text-sm text-zinc-400">{active.disciplineName} · {active.topicName}</p></div><span className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">{derived.sessionStatus === "paused" ? "Pausada" : "Em andamento"}</span></div>
        <p className="mt-4 text-sm leading-relaxed text-zinc-300">{active.objective}</p>
        <div className="mt-4 flex flex-wrap gap-2">{derived.sessionStatus === "paused" ? <button onClick={() => retomarEstudoOpcional(derived.activeSessionId!)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"><Play className="mr-2 inline h-4 w-4" />Retomar</button> : <button onClick={() => pausarEstudoOpcional(derived.activeSessionId!)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200"><Pause className="mr-2 inline h-4 w-4" />Pausar</button>}<button onClick={() => { const result = interromperEstudoOpcional(derived.activeSessionId!, actualMinutes); setMessage(result.success ? "Atividade interrompida sem penalidade." : result.error ?? "Não foi possível interromper."); }} className="rounded-lg border border-amber-500/40 px-4 py-2 text-sm text-amber-200"><Square className="mr-2 inline h-4 w-4" />Interromper</button></div>

        <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4" data-testid={`optional-result-form-${kind}`}>
          <h3 className="text-xs font-semibold text-zinc-200">Registrar resultado efetivamente realizado</h3>
          <label className="mt-3 block text-xs text-zinc-400">Tempo real (minutos)<input type="number" min={1} value={actualMinutes} onChange={(event) => setActualMinutes(Number(event.target.value))} className={`${FIELD} sm:max-w-48`} /></label>
          {(kind === "questions" || kind === "simulation") && <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-zinc-400">Plataforma/origem<select value={source} onChange={(event) => setSource(event.target.value as ExternalEvidenceSource | "")} className={FIELD}><option value="">Não informada</option><option value="qconcursos">QConcursos</option><option value="treino_fgv">Treino FGV</option><option value="simulado_externo">Simulado externo</option><option value="outra">Outra</option></select></label>
            <label className="text-xs text-zinc-400">Banca<input value={board} onChange={(event) => setBoard(event.target.value)} placeholder="Não informada" className={FIELD} /></label>
            <label className="text-xs text-zinc-400">Referência do lote<input value={sourceReference} onChange={(event) => setSourceReference(event.target.value)} className={FIELD} /></label>
            <label className="text-xs text-zinc-400">Tipo de lote<input value={batchType} onChange={(event) => setBatchType(event.target.value)} className={FIELD} /></label>
            <label className="text-xs text-zinc-400">Total<input type="number" min={1} value={total} onChange={(event) => setTotal(Number(event.target.value))} className={FIELD} /></label>
            <label className="text-xs text-zinc-400">Acertos<input type="number" min={0} value={correct} onChange={(event) => setCorrect(Number(event.target.value))} className={FIELD} /></label>
            <label className="text-xs text-zinc-400">Brancos<input type="number" min={0} value={blank} onChange={(event) => setBlank(Number(event.target.value))} className={FIELD} /></label>
            <p className="self-end pb-2 text-xs text-zinc-500">Erros calculados: {wrong}</p>
            <label className="text-xs text-zinc-400">Consulta<select value={consultation} onChange={(event) => setConsultation(event.target.value as ExternalEvidenceConsultation)} className={FIELD}><option value="no">Não</option><option value="occasionally">Ocasionalmente</option><option value="yes">Sim</option><option value="not_applicable">Não se aplica</option></select></label>
            <label className="text-xs text-zinc-400">Causa principal do erro<select value={errorCause} onChange={(event) => setErrorCause(event.target.value as ExternalEvidenceErrorCause | "")} className={FIELD}><option value="">Não informada</option><option value="conceptual_gap">Lacuna conceitual</option><option value="missing_prerequisite">Pré-requisito</option><option value="interpretation">Interpretação</option><option value="application">Aplicação</option><option value="memory">Memória</option><option value="distraction">Distração</option><option value="time_management">Gestão do tempo</option><option value="guessing">Chute</option></select></label>
            <label className="text-xs text-zinc-400 sm:col-span-2">Condições da resolução<textarea value={conditions} onChange={(event) => setConditions(event.target.value)} className={FIELD} /></label>
          </div>}
          {kind === "theory" && <div className="mt-3 grid gap-3 sm:grid-cols-2"><p className="text-xs text-zinc-400">Material: <span className="text-zinc-200">{active.materialLabel ?? "não informado"}</span></p><label className="text-xs text-zinc-400">Páginas ou seção<input value={pagesOrSection} onChange={(event) => setPagesOrSection(event.target.value)} className={FIELD} /></label><label className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={activeRecallPerformed} onChange={(event) => setActiveRecallPerformed(event.target.checked)} /> Recuperação ativa realizada</label><label className="text-xs text-zinc-400">Critério de conclusão informado<input value={completionCriterion} onChange={(event) => setCompletionCriterion(event.target.value)} className={FIELD} /></label><label className="text-xs text-zinc-400 sm:col-span-2">Dúvidas restantes<textarea value={remainingDoubts} onChange={(event) => setRemainingDoubts(event.target.value)} className={FIELD} /></label><p className="sm:col-span-2 text-xs text-amber-200">O registro de teoria não marca automaticamente o subassunto como concluído nem concede mastery.</p></div>}
          {kind === "review" && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs text-zinc-400">Desempenho<select value={reviewPerformance} onChange={(event) => setReviewPerformance(event.target.value as typeof reviewPerformance)} className={FIELD}><option value="difficult">Difícil</option><option value="intermediate">Intermediário</option><option value="fluent">Fluente</option></select></label><label className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={needsNewReview} onChange={(event) => setNeedsNewReview(event.target.checked)} /> Nova revisão necessária</label><label className="text-xs text-zinc-400">Conteúdo lembrado<textarea value={rememberedContent} onChange={(event) => setRememberedContent(event.target.value)} className={FIELD} /></label><label className="text-xs text-zinc-400">Erros persistentes<textarea value={persistentErrors} onChange={(event) => setPersistentErrors(event.target.value)} className={FIELD} /></label></div>}
          {kind === "technical_practice" && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs text-zinc-400">Tarefa realizada<input value={technicalTask} onChange={(event) => setTechnicalTask(event.target.value)} className={FIELD} /></label><label className="text-xs text-zinc-400">Dificuldade<select value={technicalDifficulty} onChange={(event) => setTechnicalDifficulty(event.target.value as typeof technicalDifficulty)} className={FIELD}><option value="not_informed">Não informada</option><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></label><label className="text-xs text-zinc-400">Resultado observável<textarea value={observableResult} onChange={(event) => setObservableResult(event.target.value)} className={FIELD} /></label><label className="text-xs text-zinc-400">Artefato ou evidência<textarea value={artifactDescription} onChange={(event) => setArtifactDescription(event.target.value)} className={FIELD} /></label><label className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={taskCompleted} onChange={(event) => setTaskCompleted(event.target.checked)} /> Tarefa concluída</label><label className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={helpNeeded} onChange={(event) => setHelpNeeded(event.target.checked)} /> Precisou de ajuda</label></div>}
          {kind === "organization" && <label className="mt-3 block text-xs text-zinc-400">Ação operacional realizada<textarea value={operationalAction} onChange={(event) => setOperationalAction(event.target.value)} className={FIELD} /></label>}
          <label className="mt-3 block text-xs text-zinc-400">Observação estruturada<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={FIELD} /></label>
          <button onClick={submit} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"><CheckCircle2 className="mr-2 inline h-4 w-4" />Concluir e registrar</button>
        </div>
        {message && <p className="mt-3 text-xs text-cyan-200" role="status">{message}</p>}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.04] p-5" data-testid="optional-study-card">
      <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" /><div><p className="text-[10px] font-mono uppercase tracking-[0.16em] text-cyan-300">Estudo opcional</p><h2 className="mt-2 text-lg font-bold text-zinc-100">{context === "rest_day_optional" ? "Hoje é seu dia de descanso" : "Seu estudo planejado está concluído"}</h2><p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">{context === "rest_day_optional" ? "Seu plano não exige estudo hoje. Você pode manter o descanso ou escolher uma atividade opcional." : "Você cumpriu a orientação de hoje. Caso ainda tenha tempo e disposição, o Coach pode sugerir uma atividade extra opcional."}</p><p className="mt-2 text-xs font-semibold text-cyan-100">Esta atividade não é obrigatória. Ignorá-la não altera seu plano, sua aderência ou seu progresso. Se realizada, seus resultados serão registrados normalmente.</p></div></div>
      <article className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/55 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold text-cyan-200">Recomendação principal</p><h3 className="mt-1 text-base font-bold text-zinc-100">{METHOD_LABELS[selected.method] ?? selected.method}</h3><p className="mt-1 text-xs text-zinc-500">{selected.disciplineName} · {selected.topicName}{selected.subtopicName ? ` · ${selected.subtopicName}` : ""}</p></div><span className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300"><Clock3 className="mr-1 inline h-4 w-4" />{chosenDuration} min</span></div><p className="mt-3 text-sm leading-relaxed text-zinc-300">{selected.objective}</p><dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2"><div><dt className="text-zinc-500">Por quê</dt><dd className="mt-1 text-zinc-300">{selected.rationale}</dd></div><div><dt className="text-zinc-500">Critério de conclusão</dt><dd className="mt-1 text-zinc-300">{selected.completionCriterion}</dd></div><div><dt className="text-zinc-500">Ambiente/material</dt><dd className="mt-1 text-zinc-300">{selected.materialLabel ?? selected.environment}</dd></div><div><dt className="text-zinc-500">Confiança do vínculo</dt><dd className="mt-1 text-zinc-300">{selected.materialMatchConfidence ?? "none"}</dd></div></dl>{(selected.warnings.length > 0 || overLimit) && <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-xs text-amber-200">{[...selected.warnings, ...(overLimit ? ["Essa duração ultrapassa sua disponibilidade diária normal de 120 minutos. Confirme somente se hoje você possui disponibilidade excepcional."] : [])].join(" ")}</div>}</article>
      {showDurationPicker && <div className="mt-4 flex flex-wrap gap-2" aria-label="Durações rápidas" data-testid="optional-duration-picker">{OPTIONAL_STUDY_QUICK_DURATIONS.map((minutes) => <button key={minutes} onClick={() => { setCustomDuration(""); setDuration(minutes); }} className={`rounded-lg border px-3 py-2 text-xs ${duration === minutes && !customDuration ? "border-cyan-400 bg-cyan-500/10 text-cyan-100" : "border-zinc-700 text-zinc-300"}`}>{minutes} min</button>)}<label className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400">Personalizada<input aria-label="Duração personalizada" type="number" min={1} value={customDuration} onChange={(event) => setCustomDuration(event.target.value)} className="w-20 bg-transparent text-zinc-100 outline-none" /></label></div>}
      {showManualPicker && <div className="mt-4 grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950/45 p-4 sm:grid-cols-2" data-testid="optional-manual-picker">
        <label className="text-xs text-zinc-400">Disciplina<select value={manualDisciplineId} onChange={(event) => { setManualDisciplineId(event.target.value); const first = assuntos.find((item) => item.disciplinaId === event.target.value && !item.isDeleted); setManualTopicId(first?.id ?? ""); setManualSubtopicId(""); }} className={FIELD}>{disciplinas.filter((item) => !item.isDeleted).map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
        <label className="text-xs text-zinc-400">Assunto<select value={manualTopicId} onChange={(event) => { setManualTopicId(event.target.value); setManualSubtopicId(""); }} className={FIELD}>{manualTopics.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
        <label className="text-xs text-zinc-400">Subassunto<select value={manualSubtopicId} onChange={(event) => setManualSubtopicId(event.target.value)} className={FIELD}><option value="">Não especificado</option>{manualSubtopics.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
        <label className="text-xs text-zinc-400">Método<select value={manualMethod} onChange={(event) => setManualMethod(event.target.value as OptionalStudyRecommendationOption["method"])} className={FIELD}>{Object.entries(METHOD_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-xs text-zinc-400">Ambiente<select value={manualEnvironment} onChange={(event) => setManualEnvironment(event.target.value as OptionalStudyRecommendationOption["environment"])} className={FIELD}>{(["notebooklm", "qconcursos", "treino_fgv", "concurseiroos", "material", "manual"] as const).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="text-xs text-zinc-400">Material disponível<select value={manualMaterialId} onChange={(event) => setManualMaterialId(event.target.value)} className={FIELD}><option value="">Nenhum selecionado</option>{manualMaterials.map((item) => <option key={item.id} value={item.id}>{item.titulo}</option>)}</select></label>
        {manualQuestionMethod && <><label className="text-xs text-zinc-400">Plataforma/origem<select value={manualSource} onChange={(event) => setManualSource(event.target.value as ExternalEvidenceSource | "")} className={FIELD}><option value="">Não informada</option><option value="qconcursos">QConcursos</option><option value="treino_fgv">Treino FGV</option><option value="simulado_externo">Simulado externo</option><option value="outra">Outra</option></select></label><label className="text-xs text-zinc-400">Banca<input value={manualBoard} onChange={(event) => setManualBoard(event.target.value)} placeholder="Não informada" className={FIELD} /></label></>}
        {manualWarnings.length ? <p className="sm:col-span-2 text-xs text-amber-200">{manualWarnings.join(" ")}</p> : null}
      </div>}
      {showAlternatives && <div className="mt-4 grid gap-3 sm:grid-cols-2" data-testid="optional-study-alternatives">{options.map((option) => <button key={option.optionId} onClick={() => { setSelectedOptionId(option.optionId); setDuration(option.durationMinutes); setCustomDuration(""); }} className={`rounded-xl border p-4 text-left ${selected.optionId === option.optionId ? "border-cyan-400 bg-cyan-500/10" : "border-zinc-800 bg-zinc-950/40"}`}><span className="text-sm font-semibold text-zinc-200">{METHOD_LABELS[option.method] ?? option.method}</span><span className="mt-2 block text-xs leading-relaxed text-zinc-500">{option.rationale}</span></button>)}</div>}
      <details className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-xs text-zinc-400"><summary className="cursor-pointer font-semibold text-zinc-200">Por que esta atividade foi sugerida?</summary><ul className="mt-3 space-y-1">{recommendation.explanation.signalsUsed.map((signal) => <li key={signal}>• {signal}</li>)}</ul><p className="mt-2">Tempo escolhido: {chosenDuration} min. Material: {selected.materialLabel ?? "nenhum material inventado"}.</p>{recommendation.explanation.missingInformation.length > 0 && <p className="mt-2 text-amber-200">Dados ausentes: {recommendation.explanation.missingInformation.join(", ")}.</p>}<p className="mt-2 text-cyan-200">{recommendation.explanation.shadowModeNotice}</p></details>
      <div className="mt-5 flex flex-wrap gap-2"><button onClick={() => { const result = aceitarEstudoOpcional({ recommendationId: recommendation.recommendationId, optionId: selected.optionId, durationMinutes: chosenDuration, manualOption: showManualPicker ? manualOption : undefined }); setMessage(result.success ? result.warning ?? "Atividade iniciada." : result.error ?? "Não foi possível iniciar."); }} className="rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white hover:bg-cyan-500"><Play className="mr-2 inline h-4 w-4 fill-current" />Iniciar atividade opcional</button><button onClick={() => setShowAlternatives((value) => !value)} className="rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-200"><ChevronDown className="mr-2 inline h-4 w-4" />Ver outras opções</button><button onClick={() => setShowDurationPicker((value) => !value)} className="rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-200"><Clock3 className="mr-2 inline h-4 w-4" />Escolher duração</button><button onClick={() => setShowManualPicker((value) => !value)} className="rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-200"><RefreshCw className="mr-2 inline h-4 w-4" />Escolher assunto ou método</button><button onClick={() => manterDescansoOpcional(localDate, context)} className="rounded-xl border border-emerald-500/30 px-4 py-3 text-sm text-emerald-200"><BookOpen className="mr-2 inline h-4 w-4" />Manter descanso</button><button onClick={() => ocultarEstudoOpcionalHoje(localDate, context)} className="rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-400"><X className="mr-2 inline h-4 w-4" />Ocultar por hoje</button></div>
      {message && <p className="mt-3 text-xs text-cyan-200" role="status">{message}</p>}
    </section>
  );
}
