import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Flag, Play, RotateCcw, Square, X } from "lucide-react";
import { resolveFgvTrainingAsset } from "../features/fgvTraining/assetResolver";
import { FGV_TRAINING_CATALOG, FGV_TRAINING_QUESTION_BY_ID, getFgvTrainingPrimaryItems, getFgvTrainingSelectionAreas } from "../features/fgvTraining/catalog";
import { DEFAULT_FGV_TRAINING_FILTERS, normalizeFgvTrainingAdherenceFilter } from "../features/fgvTraining/defaults";
import { countFgvTrainingProgress, filterFgvTrainingQuestions } from "../features/fgvTraining/engine";
import { FGV_TRAINING_ALTERNATIVE_IMAGE_CLASS_NAME, FGV_TRAINING_SCROLL_CONTAINER_CLASS_NAME, FGV_TRAINING_STATEMENT_IMAGE_CLASS_NAME } from "../features/fgvTraining/layout";
import { buildFgvTrainingResultRoute, FGV_TRAINING_ACTIVE_ROUTE, FGV_TRAINING_LANDING_ROUTE, resolveFgvTrainingScreen, type FgvTrainingNavigationOptions, type FgvTrainingRoute } from "../features/fgvTraining/navigation";
import { useFgvTrainingStore } from "../features/fgvTraining/store";
import type { FgvTrainingAggregateResult, FgvTrainingFilters, FgvTrainingQuestionCorrection, FinalizedFgvTrainingAttempt } from "../features/fgvTraining/types";

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}min ${String(seconds).padStart(2, "0")}s`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
}

function statusLabel(status: FgvTrainingQuestionCorrection["status"]): string {
  return status === "CORRECT" ? "Correta" : status === "INCORRECT" ? "Incorreta" : "Em branco";
}

function AggregateTable({ title, rows }: { title: string; rows: FgvTrainingAggregateResult[] }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-zinc-800 text-xs uppercase text-zinc-500">
            <tr><th className="px-3 py-3">Dimensão</th><th className="px-3 py-3">Acertos</th><th className="px-3 py-3">Erros</th><th className="px-3 py-3">Brancos</th><th className="px-3 py-3">%</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-zinc-900 text-zinc-300">
                <td className="px-3 py-3 font-medium text-zinc-200">{row.label}</td>
                <td className="px-3 py-3">{row.correct}/{row.total}</td>
                <td className="px-3 py-3">{row.wrong}</td>
                <td className="px-3 py-3">{row.blank}</td>
                <td className="px-3 py-3">{row.percentage.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ResultView({ result, onLanding }: { result: FinalizedFgvTrainingAttempt; onLanding: () => void }) {
  return (
    <div className={FGV_TRAINING_SCROLL_CONTAINER_CLASS_NAME} data-testid="fgv-training-scroll-container" data-training-screen="finalized_training">
      <div className="space-y-6">
        <header className="rounded-2xl border border-blue-900/60 bg-blue-950/20 p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-400">Treino finalizado</p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-100">Treino FGV — Banco de Dados</h1>
          <p className="mt-2 text-sm text-zinc-400">Treino manual e isolado. O resultado não altera SDE, mastery, prioridades, sessões ou simulados oficiais.</p>
        </header>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[["Acertos", `${result.correctCount}/${result.totalQuestions}`], ["Erros", String(result.wrongCount)], ["Em branco", String(result.blankCount)], ["Percentual", `${result.percentage.toFixed(2)}%`], ["Duração", formatDuration(result.durationSeconds)]].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="text-xs text-zinc-500">{label}</p><p className="mt-2 text-xl font-semibold text-zinc-100">{value}</p>
            </div>
          ))}
        </section>
        <AggregateTable title="Resultado por área" rows={result.areaResults} />
        <AggregateTable title="Resultado por item primário" rows={result.itemResults} />
        <AggregateTable title="Aderência direta e parcial" rows={result.adherenceResults} />
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="text-lg font-semibold text-zinc-100">Correção</h2>
          <p className="mt-1 text-sm text-zinc-500">Sem explicações por IA.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {result.corrections.map((correction) => {
              const question = FGV_TRAINING_QUESTION_BY_ID.get(correction.questionId);
              const tone = correction.status === "CORRECT" ? "border-emerald-900/60 bg-emerald-950/20" : correction.status === "INCORRECT" ? "border-rose-900/60 bg-rose-950/20" : "border-amber-900/60 bg-amber-950/20";
              return (
                <article key={correction.questionId} className={`rounded-xl border p-4 ${tone}`}>
                  <div className="flex justify-between gap-3"><p className="font-semibold text-zinc-100">Questão {correction.position}</p><span className="text-xs text-zinc-400">{statusLabel(correction.status)}</span></div>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-zinc-400">{question?.stem}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-zinc-500">Marcada</p><p className="mt-1 font-semibold">{correction.selectedAnswer ?? "Em branco"}</p></div><div><p className="text-xs text-zinc-500">Operacional</p><p className="mt-1 font-semibold">{correction.operationalAnswer}</p></div></div>
                </article>
              );
            })}
          </div>
        </section>
        <div className="flex justify-end"><button type="button" onClick={onLanding} className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-200"><RotateCcw className="h-4 w-4" /> Voltar ao Treino FGV</button></div>
      </div>
    </div>
  );
}

interface Props {
  route: FgvTrainingRoute;
  onNavigate: (route: FgvTrainingRoute, options?: FgvTrainingNavigationOptions) => void;
}

export default function FgvTrainingView({ route, onNavigate }: Props) {
  const store = useFgvTrainingStore();
  const [filters, setFilters] = useState<FgvTrainingFilters>(() => ({ ...DEFAULT_FGV_TRAINING_FILTERS }));
  const [reviewingFinish, setReviewingFinish] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => store.hydrate(), [store.hydrate]);
  useEffect(() => {
    if (route.view !== "active_training") {
      store.clearAttemptError();
      setReviewingFinish(false);
    }
  }, [route.view, store.clearAttemptError]);
  useEffect(() => {
    if (!store.activeAttempt || route.view !== "active_training") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [route.view, store.activeAttempt]);

  const screen = useMemo(
    () => resolveFgvTrainingScreen(route, { activeAttempt: store.activeAttempt, finalizedAttempts: store.finalizedAttempts }),
    [route, store.activeAttempt, store.finalizedAttempts],
  );
  useEffect(() => {
    if (store.hydrated && screen.view !== route.view) {
      store.clearTransientState();
      onNavigate(FGV_TRAINING_LANDING_ROUTE, { replace: true });
    }
  }, [store.hydrated, screen.view, route.view, onNavigate, store.clearTransientState]);

  const available = useMemo(() => filterFgvTrainingQuestions(filters).length, [filters]);
  const selectionAreas = useMemo(getFgvTrainingSelectionAreas, []);
  const primaryItems = useMemo(getFgvTrainingPrimaryItems, []);

  if (!store.hydrated) return <div className="flex h-full items-center justify-center text-sm text-zinc-500">Carregando Treino FGV…</div>;

  if (screen.view === "finalized_training") {
    return <ResultView result={screen.result} onLanding={() => { store.clearTransientState(); onNavigate(FGV_TRAINING_LANDING_ROUTE); }} />;
  }

  if (screen.view === "landing") {
    const startOrResume = () => {
      store.clearTransientState();
      if (screen.activeAttempt) return onNavigate(FGV_TRAINING_ACTIVE_ROUTE);
      const result = store.start(filters);
      if (result.success) onNavigate(FGV_TRAINING_ACTIVE_ROUTE);
    };
    return (
      <div className={FGV_TRAINING_SCROLL_CONTAINER_CLASS_NAME} data-testid="fgv-training-scroll-container" data-training-screen="landing">
        <div className="space-y-6">
          <header className="rounded-2xl border border-blue-900/70 bg-blue-950/20 p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-400">Ferramenta manual e isolada</p>
            <h1 className="mt-2 text-3xl font-semibold text-zinc-100">Treino FGV</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">Estude questões FGV de Banco de Dados com filtros operacionais. O treino não altera SDE, mastery, prioridades, sessões planejadas ou simulados oficiais.</p>
            <div className="mt-5 flex flex-wrap gap-3"><span className="rounded-full border border-zinc-800 px-3 py-1.5 text-sm">{FGV_TRAINING_CATALOG.eligibleQuestionCount} questões disponíveis</span><span className="rounded-full border border-zinc-800 px-3 py-1.5 text-sm">301 assets validados</span><span className="rounded-full border border-zinc-800 px-3 py-1.5 text-sm">Sem efeito no plano</span></div>
          </header>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="text-lg font-semibold">Filtros</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="text-xs text-zinc-400">Área<select value={filters.selectionArea ?? ""} onChange={(event) => setFilters((current) => ({ ...current, selectionArea: event.target.value || null }))} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200"><option value="">Todas</option>{selectionAreas.map((area) => <option key={area} value={area}>{area}</option>)}</select></label>
              <label className="text-xs text-zinc-400">Item primário<select value={filters.primaryItemId ?? ""} onChange={(event) => setFilters((current) => ({ ...current, primaryItemId: event.target.value || null }))} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200"><option value="">Todos</option>{primaryItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="text-xs text-zinc-400">Aderência<select data-testid="fgv-training-adherence-filter" value={filters.adherence} onChange={(event) => setFilters((current) => ({ ...current, adherence: normalizeFgvTrainingAdherenceFilter(event.target.value) }))} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200"><option value="DIRECT">Direta</option><option value="PARTIAL">Parcial</option><option value="BOTH">Direta e parcial</option></select></label>
              <label className="text-xs text-zinc-400">Quantidade<select value={filters.quantity} onChange={(event) => setFilters((current) => ({ ...current, quantity: Number(event.target.value) as FgvTrainingFilters["quantity"] }))} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200">{FGV_TRAINING_CATALOG.allowedQuantities.map((quantity) => <option key={quantity} value={quantity}>{quantity}</option>)}</select></label>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-zinc-400">{available} questões correspondem aos filtros.{available > 0 && available < filters.quantity ? ` O treino será iniciado com ${available}.` : ""}</p><button type="button" disabled={!screen.activeAttempt && available === 0} onClick={startOrResume} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Play className="h-4 w-4" /> {screen.activeAttempt ? "Retomar treino" : "Iniciar treino"}</button></div>
            {store.landingError ? <p className="mt-3 text-sm text-rose-400" role="alert">{store.landingError}</p> : null}
          </section>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="text-lg font-semibold">Histórico básico</h2>
            <div className="mt-4 space-y-2">{screen.finalizedAttempts.length === 0 ? <p className="text-sm text-zinc-500">Nenhum treino finalizado.</p> : [...screen.finalizedAttempts].reverse().map((attempt) => <button key={attempt.attemptId} type="button" onClick={() => { store.clearTransientState(); onNavigate(buildFgvTrainingResultRoute(attempt.attemptId)); }} className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-left"><div><p className="font-semibold text-zinc-100">{formatDate(attempt.endedAt)}</p><p className="mt-1 text-xs text-zinc-500">{attempt.totalQuestions} questões · {attempt.correctCount} acertos · {attempt.percentage.toFixed(2)}% · {formatDuration(attempt.durationSeconds)}</p><p className="mt-1 text-[11px] text-zinc-600">{attempt.filters.selectionArea ?? "Todas as áreas"} · {attempt.filters.adherence === "BOTH" ? "aderência direta e parcial" : attempt.filters.adherence === "DIRECT" ? "aderência direta" : "aderência parcial"}</p></div><ArrowRight className="h-4 w-4 text-zinc-600" /></button>)}</div>
          </section>
        </div>
      </div>
    );
  }

  const attempt = screen.attempt;
  const questionId = attempt.questionOrder[attempt.currentIndex];
  const question = FGV_TRAINING_QUESTION_BY_ID.get(questionId)!;
  const selected = attempt.answers[questionId];
  const checked = attempt.checkedCorrections[questionId];
  const progress = countFgvTrainingProgress(attempt);
  const duration = Math.max(0, Math.floor((now - Date.parse(attempt.startedAt)) / 1000));
  const finalize = async () => {
    const result = await store.finalize();
    if (result.success && result.attemptId) onNavigate(buildFgvTrainingResultRoute(result.attemptId), { replace: true });
  };

  return (
    <div className={FGV_TRAINING_SCROLL_CONTAINER_CLASS_NAME} data-testid="fgv-training-scroll-container" data-training-screen="active_training">
      <div className="space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div><p className="text-xs uppercase tracking-wider text-blue-400">Treino FGV</p><h1 className="mt-1 text-xl font-semibold">Questão {attempt.currentIndex + 1} de {attempt.questionOrder.length}</h1><p className="mt-1 text-xs text-zinc-500">{question.selectionArea} · {question.primaryItem.name}</p></div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400"><span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" /> {formatDuration(duration)}</span><button type="button" onClick={() => store.toggleReview(questionId)} className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 ${attempt.reviewQuestionIds.includes(questionId) ? "border-amber-600 text-amber-300" : "border-zinc-700"}`}><Flag className="h-4 w-4" /> Revisão</button><button type="button" onClick={() => { if (window.confirm("Cancelar o treino ativo? Nenhum resultado será criado.")) { store.cancel(); onNavigate(FGV_TRAINING_LANDING_ROUTE, { replace: true }); } }} className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-2"><X className="h-4 w-4" /> Cancelar</button></div>
        </header>
        <section className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5" data-testid="fgv-training-question-card">
          <p className="whitespace-pre-wrap break-words text-sm leading-7 text-zinc-200">{question.stem}</p>
          {question.statementAssetPaths.map((path) => { const src = resolveFgvTrainingAsset(path); return src ? <img key={path} src={src} alt="Elemento visual do enunciado" className={FGV_TRAINING_STATEMENT_IMAGE_CLASS_NAME} data-testid="fgv-training-statement-image" /> : null; })}
          <div className="mt-5 space-y-3">
            {question.alternatives.map((alternative) => {
              const active = selected === alternative.label;
              const asset = alternative.assetPath ? resolveFgvTrainingAsset(alternative.assetPath) : null;
              return (
                <button key={alternative.label} type="button" data-testid={`fgv-training-alternative-${alternative.label}`} disabled={Boolean(checked)} onClick={() => store.answer(questionId, alternative.label)} className={`flex w-full min-w-0 gap-3 rounded-xl border p-4 text-left transition ${active ? "border-blue-500 bg-blue-950/30" : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700"} disabled:cursor-not-allowed`}>
                  <span className="shrink-0 font-bold text-blue-400">{alternative.label}</span>
                  <span className="min-w-0 flex-1 break-words text-sm leading-6 text-zinc-200">{alternative.text || <span className="text-zinc-500">Alternativa em imagem</span>}{asset ? <img src={asset} alt={`Alternativa ${alternative.label}`} className={FGV_TRAINING_ALTERNATIVE_IMAGE_CLASS_NAME} data-testid={`fgv-training-alternative-image-${alternative.label}`} /> : null}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            {checked ? <div className={`rounded-xl border px-4 py-3 text-sm ${checked.status === "CORRECT" ? "border-emerald-800 bg-emerald-950/30 text-emerald-300" : "border-rose-800 bg-rose-950/30 text-rose-300"}`}><strong>{checked.status === "CORRECT" ? "Resposta correta" : "Resposta incorreta"}</strong> · marcada {checked.selectedAnswer} · operacional {checked.operationalAnswer}</div> : <button type="button" disabled={!selected || store.checkingQuestionId === questionId} onClick={() => void store.check(questionId)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> {store.checkingQuestionId === questionId ? "Conferindo…" : "Conferir resposta"}</button>}
            <div className="text-xs text-zinc-500">Respondidas {progress.answered} · conferidas {progress.checked} · em branco {progress.blank}</div>
          </div>
          {store.attemptError ? <p className="mt-3 text-sm text-rose-400" role="alert">{store.attemptError}</p> : null}
        </section>
        <div className="flex flex-wrap items-center justify-between gap-3" data-testid="fgv-training-navigation">
          <button type="button" disabled={attempt.currentIndex === 0} onClick={() => store.navigate(attempt.currentIndex - 1)} className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm disabled:opacity-40"><ArrowLeft className="h-4 w-4" /> Anterior</button>
          <div className="flex max-w-full flex-wrap justify-center gap-1">{attempt.questionOrder.map((id, index) => { const isAnswered = Boolean(attempt.answers[id]); const isChecked = Boolean(attempt.checkedCorrections[id]); return <button key={id} type="button" onClick={() => store.navigate(index)} className={`flex h-8 w-8 items-center justify-center rounded text-xs ${index === attempt.currentIndex ? "bg-blue-600 text-white" : isChecked ? "bg-emerald-950 text-emerald-300" : isAnswered ? "bg-zinc-800 text-zinc-200" : "bg-zinc-900 text-zinc-500"}`}>{index + 1}</button>; })}</div>
          {attempt.currentIndex < attempt.questionOrder.length - 1 ? <button type="button" onClick={() => store.navigate(attempt.currentIndex + 1)} className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm">Próxima <ArrowRight className="h-4 w-4" /></button> : <button type="button" onClick={() => { store.clearAttemptError(); setReviewingFinish(true); }} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold"><Square className="h-4 w-4" /> Finalizar</button>}
        </div>
        {reviewingFinish ? <section className="rounded-2xl border border-amber-800/60 bg-amber-950/20 p-5"><h2 className="font-semibold text-zinc-100">Encerrar treino?</h2><p className="mt-2 text-sm text-zinc-400">Respondidas: {progress.answered} · conferidas: {progress.checked} · em branco: {progress.blank}.</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => setReviewingFinish(false)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm">Continuar treino</button><button type="button" disabled={store.submitting} onClick={() => void finalize()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{store.submitting ? "Finalizando…" : "Confirmar finalização"}</button></div></section> : null}
        <div className="h-1" aria-hidden="true" />
      </div>
    </div>
  );
}
