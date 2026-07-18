import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Circle,
  Clock3,
  Flag,
  LockKeyhole,
  Play,
  RotateCcw,
  Square,
  X,
} from "lucide-react";
import { PILOT_DIAGNOSTIC_CATALOG } from "../features/pilotDiagnostic/catalog";
import { resolvePilotDiagnosticAsset } from "../features/pilotDiagnostic/assetRegistry";
import { countPilotDiagnosticProgress } from "../features/pilotDiagnostic/engine";
import { usePilotDiagnosticStore } from "../features/pilotDiagnostic/store";
import type {
  DiagnosticCorrectionStatus,
  FinalizedPilotDiagnosticAttempt,
} from "../features/pilotDiagnostic/types";

import type { PilotDiagnosticNavigationOptions, PilotDiagnosticRoute } from "../features/pilotDiagnostic/navigation";
import {
  buildPilotDiagnosticResultRoute,
  PILOT_DIAGNOSTIC_ACTIVE_ROUTE,
  PILOT_DIAGNOSTIC_LANDING_ROUTE,
  resolvePilotDiagnosticScreen,
} from "../features/pilotDiagnostic/navigation";

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}min`;
  return `${minutes}min ${String(seconds).padStart(2, "0")}s`;
}

function correctionLabel(status: DiagnosticCorrectionStatus): string {
  if (status === "CORRECT") return "Correta";
  if (status === "INCORRECT") return "Incorreta";
  return "Em branco";
}

function ResultView({ result, onNewAttempt }: {
  result: FinalizedPilotDiagnosticAttempt;
  onNewAttempt: () => void;
}) {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-emerald-900/60 bg-emerald-950/20 p-5 sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">Tentativa finalizada</p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-100">{PILOT_DIAGNOSTIC_CATALOG.title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
          Resultado experimental, isolado e sem efeito sobre SDE, domínio, prioridades, mastery, sessões planejadas ou incidência histórica.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Acertos", `${result.correctCount}/24`],
          ["Erros", String(result.wrongCount)],
          ["Em branco", String(result.blankCount)],
          ["Percentual", `${result.percentage.toFixed(2)}%`],
          ["Tempo", formatDuration(result.durationSeconds)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
            <p className="text-xs font-medium text-zinc-500">{label}</p>
            <p className="mt-2 text-xl font-semibold text-zinc-100">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-lg font-semibold text-zinc-100">Resultado por área</h2>
        <p className="mt-1 text-sm text-zinc-500">Agregação exclusiva pela área de seleção operacional do diagnóstico.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-3">Área</th>
                <th className="px-3 py-3">Acertos</th>
                <th className="px-3 py-3">Erros</th>
                <th className="px-3 py-3">Brancos</th>
                <th className="px-3 py-3">Percentual</th>
              </tr>
            </thead>
            <tbody>
              {result.areaResults.map((area) => (
                <tr key={area.selectionArea} className="border-b border-zinc-900 text-zinc-300">
                  <td className="px-3 py-3 font-medium text-zinc-200">{area.selectionArea}</td>
                  <td className="px-3 py-3">{area.correct}/{area.total}</td>
                  <td className="px-3 py-3">{area.wrong}</td>
                  <td className="px-3 py-3">{area.blank}</td>
                  <td className="px-3 py-3">{area.percentage.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-lg font-semibold text-zinc-100">{result.coverage.label}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-sm font-semibold text-zinc-200">Cobertura principal</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-100">
              {result.coverage.principal.correct}/{result.coverage.principal.total}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {result.coverage.principal.wrong} erros · {result.coverage.principal.blank} em branco · {result.coverage.principal.percentage.toFixed(2)}%
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-sm font-semibold text-zinc-200">Cobertura complementar</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-100">
              {result.coverage.complementary.correct}/{result.coverage.complementary.total}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {result.coverage.complementary.wrong} erros · {result.coverage.complementary.blank} em branco · {result.coverage.complementary.percentage.toFixed(2)}%
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-lg font-semibold text-zinc-100">Correção operacional</h2>
        <p className="mt-1 text-sm text-zinc-500">Sem explicações sintéticas nesta versão.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {result.corrections.map((correction) => {
            const tone = correction.status === "CORRECT"
              ? "border-emerald-900/60 bg-emerald-950/20"
              : correction.status === "INCORRECT"
                ? "border-rose-900/60 bg-rose-950/20"
                : "border-amber-900/60 bg-amber-950/20";
            return (
              <div key={correction.questionId} className={`rounded-xl border p-4 ${tone}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-zinc-100">Questão {correction.position}</p>
                  <span className="text-xs font-medium text-zinc-400">{correctionLabel(correction.status)}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-zinc-500">Resposta marcada</p>
                    <p className="mt-1 font-semibold text-zinc-200">{correction.selectedAnswer ?? "Em branco"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Resposta operacional</p>
                    <p className="mt-1 font-semibold text-zinc-200">{correction.operationalAnswer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNewAttempt}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800"
        >
          <RotateCcw className="h-4 w-4" /> Nova tentativa
        </button>
      </div>
    </div>
  );
}



interface PilotDiagnosticViewProps {
  route: PilotDiagnosticRoute;
  onNavigate: (route: PilotDiagnosticRoute, options?: PilotDiagnosticNavigationOptions) => void;
}

export default function PilotDiagnosticView({ route, onNavigate }: PilotDiagnosticViewProps) {
  const {
    hydrated,
    activeAttempt: storedActiveAttempt,
    finalizedAttempts,
    submitting,
    error,
    hydrate,
    start,
    answer,
    toggleReview,
    navigate,
    cancel,
    finalize,
    clearError,
  } = usePilotDiagnosticStore();
  const [reviewingFinish, setReviewingFinish] = useState(false);
  const [confirmedFinish, setConfirmedFinish] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => hydrate(), [hydrate]);
  useEffect(() => {
    if (!storedActiveAttempt || route.view !== "active_attempt") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [route.view, storedActiveAttempt]);
  useEffect(() => {
    if (route.view !== "active_attempt") {
      setReviewingFinish(false);
      setConfirmedFinish(false);
    }
  }, [route.view]);

  const screen = useMemo(
    () => resolvePilotDiagnosticScreen(route, {
      activeAttempt: storedActiveAttempt,
      finalizedAttempts,
    }),
    [finalizedAttempts, route, storedActiveAttempt],
  );

  useEffect(() => {
    if (!hydrated || screen.view === route.view) return;
    onNavigate(PILOT_DIAGNOSTIC_LANDING_ROUTE, { replace: true });
  }, [hydrated, onNavigate, route.view, screen.view]);

  if (!hydrated) {
    return <div className="flex h-full items-center justify-center bg-zinc-950 text-sm text-zinc-500">Carregando diagnóstico…</div>;
  }

  const startAttempt = () => {
    clearError();
    if (storedActiveAttempt) {
      onNavigate(PILOT_DIAGNOSTIC_ACTIVE_ROUTE);
      return;
    }
    const result = start();
    if (result.success) {
      onNavigate(PILOT_DIAGNOSTIC_ACTIVE_ROUTE);
    } else if (result.error) {
      window.alert(result.error);
    }
  };

  if (screen.view === "finalized_result") {
    return (
      <div className="h-full overflow-y-auto bg-zinc-950 p-4 sm:p-6">
        <div className="mx-auto max-w-6xl pb-12">
          <ResultView result={screen.result} onNewAttempt={startAttempt} />
        </div>
      </div>
    );
  }

  if (screen.view === "landing") {
    const resume = screen.primaryAction === "resume";
    return (
      <div className="h-full overflow-y-auto bg-zinc-950 p-4 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-6 pb-12">
          <header className="rounded-2xl border border-blue-900/60 bg-blue-950/20 p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-400">Fluxo experimental e isolado</p>
            <h1 className="mt-3 text-2xl font-semibold text-zinc-100 sm:text-3xl">{PILOT_DIAGNOSTIC_CATALOG.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
              24 questões em ordem fixa, duração sugerida de 50 minutos e sem penalização por erro. O resultado não altera mastery, SDE, prioridades, sessões, simulados oficiais ou incidência histórica.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-zinc-300">
              <span className="rounded-full border border-zinc-800 bg-zinc-950/70 px-3 py-1.5">24 questões</span>
              <span className="rounded-full border border-zinc-800 bg-zinc-950/70 px-3 py-1.5">50 minutos sugeridos</span>
              <span className="rounded-full border border-zinc-800 bg-zinc-950/70 px-3 py-1.5">Sem efeito no plano</span>
            </div>
            <button
              type="button"
              onClick={startAttempt}
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              <Play className="h-4 w-4" /> {resume ? "Retomar diagnóstico" : "Iniciar diagnóstico"}
            </button>
          </header>

          {screen.finalizedAttempts.length > 0 && (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <h2 className="text-lg font-semibold text-zinc-100">Tentativas finalizadas</h2>
              <div className="mt-4 space-y-2">
                {[...screen.finalizedAttempts].reverse().map((attempt) => (
                  <button
                    key={attempt.attemptId}
                    type="button"
                    onClick={() => onNavigate(buildPilotDiagnosticResultRoute(attempt.attemptId))}
                    className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-left transition hover:border-zinc-700"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-zinc-200">{new Date(attempt.endedAt).toLocaleString("pt-BR")}</span>
                      <span className="mt-1 block text-xs text-zinc-500">{attempt.correctCount}/24 · {attempt.percentage.toFixed(2)}%</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-zinc-600" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  const activeAttempt = screen.attempt;
  const question = PILOT_DIAGNOSTIC_CATALOG.questions[activeAttempt.currentPosition - 1];
  const progress = countPilotDiagnosticProgress(activeAttempt);
  const selectedAnswer = activeAttempt.answers[question.questionId];
  const markedForReview = activeAttempt.reviewQuestionIds.includes(question.questionId);
  const elapsedSeconds = Math.max(0, Math.floor((now - Date.parse(activeAttempt.startedAt)) / 1000));

  const handleCancel = () => {
    const confirmed = window.confirm("Cancelar esta tentativa? Nenhum resultado será registrado.");
    if (!confirmed) return;
    cancel();
    onNavigate(PILOT_DIAGNOSTIC_LANDING_ROUTE, { replace: true });
  };

  const handleFinalize = async () => {
    if (!confirmedFinish) return;
    const result = await finalize();
    if (result.success && result.attemptId) {
      setReviewingFinish(false);
      setConfirmedFinish(false);
      onNavigate(buildPilotDiagnosticResultRoute(result.attemptId), { replace: true });
    }
  };
  if (reviewingFinish) {
    const blankPositions = PILOT_DIAGNOSTIC_CATALOG.questions
      .filter((item) => activeAttempt.answers[item.questionId] === undefined)
      .map((item) => item.position);
    return (
      <div className="h-full overflow-y-auto bg-zinc-950 p-4 sm:p-6">
        <div className="mx-auto max-w-3xl space-y-5 pb-12">
          <button
            type="button"
            onClick={() => { setReviewingFinish(false); setConfirmedFinish(false); }}
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-200"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar às questões
          </button>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400">Revisão antes do envio</p>
            <h1 className="mt-2 text-2xl font-semibold text-zinc-100">Confirmar encerramento</h1>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-xs text-zinc-500">Questões respondidas</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-100">{progress.answered}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-xs text-zinc-500">Questões em branco</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-100">{progress.blank}</p>
              </div>
            </div>
            {blankPositions.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 text-sm text-amber-200">
                <div className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Em branco: {blankPositions.join(", ")}. Elas serão registradas separadamente.</p>
                </div>
              </div>
            )}
            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
              <input
                type="checkbox"
                checked={confirmedFinish}
                onChange={(event) => setConfirmedFinish(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-900"
              />
              <span>
                <span className="block text-sm font-semibold text-zinc-200">Confirmo o encerramento definitivo desta tentativa.</span>
                <span className="mt-1 block text-xs leading-5 text-zinc-500">Após finalizar, respostas e resultado serão imutáveis no aplicativo.</span>
              </span>
            </label>
            {error && <p className="mt-4 rounded-lg border border-rose-900/50 bg-rose-950/20 p-3 text-sm text-rose-300">{error}</p>}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={submitting}
                onClick={() => { setReviewingFinish(false); setConfirmedFinish(false); }}
                className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
              >
                Continuar respondendo
              </button>
              <button
                type="button"
                disabled={!confirmedFinish || submitting}
                onClick={() => void handleFinalize()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <LockKeyhole className="h-4 w-4" /> {submitting ? "Finalizando…" : "Finalizar tentativa"}
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-zinc-950 p-3 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-4 pb-12">
        <header className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-400">Diagnóstico piloto ativo</p>
            <h1 className="mt-1 text-lg font-semibold text-zinc-100">{PILOT_DIAGNOSTIC_CATALOG.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1.5"><Clock3 className="h-3.5 w-3.5" /> {formatDuration(elapsedSeconds)}</span>
            <span className="rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1.5">{progress.answered} respondidas</span>
            <span className="rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1.5">{progress.blank} em branco</span>
            <button type="button" onClick={handleCancel} className="inline-flex items-center gap-1.5 rounded-full border border-rose-900/50 bg-rose-950/20 px-3 py-1.5 text-rose-300 hover:bg-rose-950/40"><X className="h-3.5 w-3.5" /> Cancelar</button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <main className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Questão {question.position} de 24</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className={`rounded-full px-2.5 py-1 ${selectedAnswer ? "bg-emerald-950 text-emerald-300" : "bg-zinc-800 text-zinc-400"}`}>
                    {selectedAnswer ? "Respondida" : "Não respondida"}
                  </span>
                  {markedForReview && <span className="rounded-full bg-amber-950 px-2.5 py-1 text-amber-300">Marcada para revisão</span>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleReview(question.questionId)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${markedForReview ? "border-amber-700 bg-amber-950/40 text-amber-300" : "border-zinc-700 bg-zinc-950/50 text-zinc-400 hover:text-zinc-200"}`}
              >
                <Bookmark className="h-4 w-4" /> {markedForReview ? "Remover marca" : "Marcar para revisão"}
              </button>
            </div>

            <p className="mt-6 whitespace-pre-wrap text-base leading-7 text-zinc-100">{question.stem}</p>
            {question.statementAssetKeys.map((assetKey) => {
              const src = resolvePilotDiagnosticAsset(assetKey);
              return src ? <img key={assetKey} src={src} alt={`Ilustração da questão ${question.position}`} className="mt-5 max-h-[32rem] max-w-full rounded-xl border border-zinc-800 bg-white object-contain p-2" /> : null;
            })}

            <div className="mt-6 space-y-3">
              {question.alternatives.map((alternative) => {
                const isSelected = selectedAnswer === alternative.label;
                const asset = alternative.assetKey ? resolvePilotDiagnosticAsset(alternative.assetKey) : null;
                return (
                  <button
                    key={alternative.label}
                    type="button"
                    onClick={() => answer(question.questionId, alternative.label)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${isSelected ? "border-blue-500 bg-blue-950/30" : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700"}`}
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${isSelected ? "border-blue-400 bg-blue-500 text-white" : "border-zinc-700 text-zinc-400"}`}>{alternative.label}</span>
                    <span className="min-w-0 flex-1">
                      {alternative.text && <span className="block whitespace-pre-wrap text-sm leading-6 text-zinc-200">{alternative.text}</span>}
                      {asset && <img src={asset} alt={`Alternativa ${alternative.label} da questão ${question.position}`} className="max-h-40 max-w-full rounded-lg bg-white object-contain p-2" />}
                    </span>
                    {isSelected ? <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-blue-400" /> : <Circle className="mt-1 h-5 w-5 shrink-0 text-zinc-700" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-7 flex flex-col gap-3 border-t border-zinc-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                disabled={question.position === 1}
                onClick={() => navigate(question.position - 1)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowLeft className="h-4 w-4" /> Anterior
              </button>
              {question.position < 24 ? (
                <button
                  type="button"
                  onClick={() => navigate(question.position + 1)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  Próxima <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { clearError(); setReviewingFinish(true); }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  <Flag className="h-4 w-4" /> Revisar e encerrar
                </button>
              )}
            </div>
          </main>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
              <h2 className="text-sm font-semibold text-zinc-200">Mapa das questões</h2>
              <div className="mt-4 grid grid-cols-6 gap-2 lg:grid-cols-4">
                {PILOT_DIAGNOSTIC_CATALOG.questions.map((item) => {
                  const isCurrent = item.position === question.position;
                  const isAnswered = activeAttempt.answers[item.questionId] !== undefined;
                  const isReview = activeAttempt.reviewQuestionIds.includes(item.questionId);
                  return (
                    <button
                      key={item.questionId}
                      type="button"
                      aria-label={`Ir para questão ${item.position}`}
                      onClick={() => navigate(item.position)}
                      className={`relative flex aspect-square items-center justify-center rounded-lg border text-xs font-bold transition ${isCurrent ? "border-blue-400 bg-blue-600 text-white" : isAnswered ? "border-emerald-800 bg-emerald-950/50 text-emerald-300" : "border-zinc-800 bg-zinc-950/60 text-zinc-500 hover:border-zinc-700"}`}
                    >
                      {item.position}
                      {isReview && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-zinc-950 bg-amber-400" />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 space-y-2 text-xs text-zinc-500">
                <p className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Respondida</p>
                <p className="flex items-center gap-2"><Square className="h-3.5 w-3.5" /> Não respondida</p>
                <p className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Marcada para revisão</p>
              </div>
            </section>
            <button
              type="button"
              onClick={() => { clearError(); setReviewingFinish(true); }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-800 bg-emerald-950/30 px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-950/50"
            >
              <Flag className="h-4 w-4" /> Revisar e encerrar
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
