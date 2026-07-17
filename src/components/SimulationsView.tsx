import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  Play,
  Save,
  ShieldAlert,
  TimerReset,
} from "lucide-react";
import { compareSimulationAnalyses } from "../core/simulations/simulationEngine";
import type { SimulationKind, SimulationSource } from "../core/simulations/types";
import { useConcurseiroStore } from "../store";

const SOURCES: SimulationSource[] = [
  {
    id: "qconcursos",
    label: "Qconcursos",
    kind: "EXTERNAL_BANK",
    reference: "Qconcursos — assinatura do usuário; filtros e quantidade registrados no plano",
  },
  {
    id: "estrategia-questoes",
    label: "Estratégia Questões",
    kind: "EXTERNAL_BANK",
    reference: "Estratégia Questões — assinatura do usuário; filtros e quantidade registrados no plano",
  },
];

function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function statusLabel(status: "CRIADO" | "EM_ANDAMENTO" | "CONCLUIDO"): string {
  if (status === "CRIADO") return "Pronto para iniciar";
  if (status === "EM_ANDAMENTO") return "Em andamento";
  return "Concluído";
}

export default function SimulationsView() {
  const {
    activeConcursoId,
    configuracao,
    disciplinas,
    simulados,
    createSimulationPlan,
    startSimulado,
    recordSimulationDisciplineResult,
    finishSimulado,
  } = useConcurseiroStore();
  const competitionId = activeConcursoId ?? configuracao.concursoAlvoId;
  const availableDisciplines = useMemo(
    () => disciplinas.filter((discipline) => discipline.concursoId === competitionId),
    [competitionId, disciplinas],
  );

  const [kind, setKind] = useState<SimulationKind>("PARTIAL");
  const [sourceId, setSourceId] = useState(SOURCES[0].id);
  const [selectedDisciplineIds, setSelectedDisciplineIds] = useState<string[]>(
    availableDisciplines.slice(0, 1).map((item) => item.id),
  );
  const [title, setTitle] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedSimuladoId, setSelectedSimuladoId] = useState<string | null>(
    simulados[simulados.length - 1]?.id ?? null,
  );
  const [clockNow, setClockNow] = useState(Date.now());
  const [drafts, setDrafts] = useState<
    Record<string, { correct: string; blank: string; minutes: string }>
  >({});

  useEffect(() => {
    if (selectedDisciplineIds.length === 0 && availableDisciplines[0]) {
      setSelectedDisciplineIds([availableDisciplines[0].id]);
    }
  }, [availableDisciplines, selectedDisciplineIds.length]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedSimulado = useMemo(
    () => simulados.find((item) => item.id === selectedSimuladoId) ?? simulados[simulados.length - 1] ?? null,
    [selectedSimuladoId, simulados],
  );

  useEffect(() => {
    if (!selectedSimulado?.plano) return;
    setDrafts(
      Object.fromEntries(
        selectedSimulado.plano.disciplines.map((discipline) => {
          const recorded = selectedSimulado.resultadosPorDisciplina?.[discipline.disciplineId];
          return [
            discipline.disciplineId,
            {
              correct: recorded ? String(recorded.correct) : "",
              blank: recorded ? String(recorded.blank) : "0",
              minutes: recorded ? String(Math.ceil(recorded.elapsedSeconds / 60)) : "",
            },
          ];
        }),
      ),
    );
  }, [selectedSimulado?.id]);

  const elapsedSeconds = selectedSimulado?.status === "EM_ANDAMENTO"
    ? Math.max(0, Math.floor((clockNow - new Date(selectedSimulado.iniciadoEm).getTime()) / 1000))
    : selectedSimulado?.tempoEstudoGastoSegundos ?? 0;
  const remainingSeconds = selectedSimulado
    ? Math.max(0, selectedSimulado.tempoLimiteSegundos - elapsedSeconds)
    : 0;

  const previousComparable = useMemo(() => {
    if (!selectedSimulado?.plano || !selectedSimulado.analise) return null;
    const previous = [...simulados]
      .filter(
        (item) =>
          item.id !== selectedSimulado.id &&
          item.status === "CONCLUIDO" &&
          item.plano &&
          item.analise,
      )
      .sort((left, right) => (right.concluidoEm ?? "").localeCompare(left.concluidoEm ?? ""))
      .find((item) => {
        const comparison = compareSimulationAnalyses(
          selectedSimulado.plano!,
          selectedSimulado.analise!,
          item.plano!,
          item.analise!,
        );
        return comparison.comparable;
      });
    if (!previous?.plano || !previous.analise) return null;
    return {
      previous,
      comparison: compareSimulationAnalyses(
        selectedSimulado.plano,
        selectedSimulado.analise,
        previous.plano,
        previous.analise,
      ),
    };
  }, [selectedSimulado, simulados]);

  const handleCreate = () => {
    setFeedback(null);
    const source = SOURCES.find((item) => item.id === sourceId) ?? SOURCES[0];
    const result = createSimulationPlan({
      title,
      kind,
      source,
      selectedDisciplineIds: kind === "PARTIAL" ? selectedDisciplineIds : undefined,
    });
    if (!result.success || !result.id) {
      setFeedback({ type: "error", text: result.error ?? "Não foi possível criar o simulado." });
      return;
    }
    setSelectedSimuladoId(result.id);
    setTitle("");
    setFeedback({ type: "success", text: "Composição oficial criada com fonte identificada." });
  };

  const toggleDiscipline = (disciplineId: string) => {
    setSelectedDisciplineIds((current) =>
      current.includes(disciplineId)
        ? current.filter((item) => item !== disciplineId)
        : [...current, disciplineId],
    );
  };

  const recordDiscipline = (disciplineId: string) => {
    if (!selectedSimulado?.plano) return;
    const discipline = selectedSimulado.plano.disciplines.find(
      (item) => item.disciplineId === disciplineId,
    );
    if (!discipline) return;
    const draft = drafts[disciplineId] ?? { correct: "", blank: "0", minutes: "" };
    const correct = Number(draft.correct);
    const blank = Number(draft.blank || 0);
    const minutes = Number(draft.minutes);
    const wrong = discipline.questionCount - correct - blank;
    const result = recordSimulationDisciplineResult(selectedSimulado.id, {
      disciplineId,
      correct,
      wrong,
      blank,
      elapsedSeconds: Math.round(minutes * 60),
    });
    setFeedback({
      type: result.success ? "success" : "error",
      text: result.success
        ? `${discipline.disciplineName}: resultado registrado.`
        : result.error ?? "Não foi possível registrar o resultado.",
    });
  };

  const handleFinish = () => {
    if (!selectedSimulado) return;
    const result = finishSimulado(selectedSimulado.id);
    setFeedback({
      type: result.success ? "success" : "error",
      text: result.success
        ? "Simulado concluído e analisado sem alterar automaticamente o ranking do SDE."
        : result.error ?? "Não foi possível concluir o simulado.",
    });
  };

  const allResultsRecorded = Boolean(
    selectedSimulado?.plano?.disciplines.every(
      (discipline) => selectedSimulado.resultadosPorDisciplina?.[discipline.disciplineId],
    ),
  );

  return (
    <div className="h-full overflow-y-auto bg-zinc-950 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6 pb-12">
        <header>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-400">Simulados oficiais</p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-100">Parciais e completos sem questões inventadas</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-500">
            A composição usa as quantidades, pesos e duração do edital. O ConcurseiroOS registra a fonte, o tempo, os brancos e a pontuação, mas não gera enunciados, alternativas ou gabaritos.
          </p>
        </header>

        <section className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/55 p-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Criar composição</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-zinc-400">
                Tipo
                <select
                  value={kind}
                  onChange={(event) => setKind(event.target.value as SimulationKind)}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                >
                  <option value="PARTIAL">Parcial por disciplina</option>
                  <option value="FULL">Completo — 70 questões</option>
                </select>
              </label>
              <label className="text-xs text-zinc-400">
                Fonte identificada
                <select
                  value={sourceId}
                  onChange={(event) => setSourceId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                >
                  {SOURCES.map((source) => (
                    <option key={source.id} value={source.id}>{source.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-3 block text-xs text-zinc-400">
              Nome opcional
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={kind === "FULL" ? "Simulado completo #1" : "Parcial — Português e Inglês"}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
              />
            </label>

            {kind === "PARTIAL" && (
              <div className="mt-4">
                <p className="text-xs font-medium text-zinc-300">Disciplinas</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {availableDisciplines.map((discipline) => (
                    <label key={discipline.id} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-300">
                      <input
                        type="checkbox"
                        checked={selectedDisciplineIds.includes(discipline.id)}
                        onChange={() => toggleDiscipline(discipline.id)}
                      />
                      {discipline.nome}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleCreate}
              disabled={kind === "PARTIAL" && selectedDisciplineIds.length === 0}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileCheck2 className="h-4 w-4" />
              Montar simulado
            </button>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-semibold text-amber-100">Portões de confiança</h3>
                <ul className="mt-2 space-y-2 text-xs leading-relaxed text-zinc-400">
                  <li>• A fonte precisa permanecer identificada no histórico.</li>
                  <li>• Resultados agregados não criam incidência histórica.</li>
                  <li>• O Gemini não monta questões nem altera o plano.</li>
                  <li>• O SDE só recebe evidência temática quando o subassunto real for registrado.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {feedback && (
          <div className={`rounded-xl border p-3 text-sm ${feedback.type === "success" ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-200" : "border-red-500/25 bg-red-500/8 text-red-200"}`}>
            {feedback.text}
          </div>
        )}

        {selectedSimulado?.plano && (
          <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/45 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-blue-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-300">{selectedSimulado.tipo === "FULL" ? "Completo" : "Parcial"}</span>
                  <span className="rounded bg-zinc-800 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-400">{statusLabel(selectedSimulado.status)}</span>
                </div>
                <h2 className="mt-2 text-lg font-semibold text-zinc-100">{selectedSimulado.titulo}</h2>
                <p className="mt-1 text-xs text-zinc-500">Fonte: {selectedSimulado.fonte?.label} · {selectedSimulado.plano.officialDocument}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2 text-xs text-zinc-500"><Clock3 className="h-4 w-4" /> Tempo restante</div>
                <p className={`mt-1 font-mono text-xl font-semibold ${remainingSeconds === 0 && selectedSimulado.status === "EM_ANDAMENTO" ? "text-red-400" : "text-zinc-100"}`}>{formatDuration(remainingSeconds)}</p>
                <p className="mt-1 text-[10px] text-zinc-600">Limite {selectedSimulado.plano.durationMinutes} min</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><p className="text-[10px] uppercase tracking-wide text-zinc-600">Questões</p><p className="mt-1 text-lg font-semibold text-zinc-100">{selectedSimulado.plano.totalQuestions}</p></div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><p className="text-[10px] uppercase tracking-wide text-zinc-600">Pontos máximos</p><p className="mt-1 text-lg font-semibold text-zinc-100">{selectedSimulado.plano.maximumPoints}</p></div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><p className="text-[10px] uppercase tracking-wide text-zinc-600">Fonte</p><p className="mt-1 text-sm font-semibold text-zinc-100">{selectedSimulado.plano.source.label}</p></div>
            </div>

            {selectedSimulado.status === "CRIADO" && (
              <button type="button" onClick={() => startSimulado(selectedSimulado.id)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
                <Play className="h-4 w-4" /> Iniciar cronômetro
              </button>
            )}

            <div className="space-y-3">
              {selectedSimulado.plano.disciplines.map((discipline) => {
                const draft = drafts[discipline.disciplineId] ?? { correct: "", blank: "0", minutes: "" };
                const correct = Number(draft.correct);
                const blank = Number(draft.blank || 0);
                const wrong = Number.isFinite(correct) && Number.isFinite(blank)
                  ? discipline.questionCount - correct - blank
                  : NaN;
                const recorded = selectedSimulado.resultadosPorDisciplina?.[discipline.disciplineId];
                return (
                  <article key={discipline.disciplineId} className="rounded-xl border border-zinc-800 bg-zinc-950/55 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-100">{discipline.disciplineName}</h3>
                        <p className="mt-1 text-xs text-zinc-500">{discipline.questionCount} questões · {discipline.pointsPerQuestion} ponto(s) cada · máximo {discipline.maximumPoints}</p>
                        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">{discipline.sourceInstruction}</p>
                      </div>
                      {recorded && <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> Registrado</span>}
                    </div>

                    {selectedSimulado.status !== "CONCLUIDO" && (
                      <div className="mt-4 grid gap-3 sm:grid-cols-4">
                        <label className="text-[11px] text-zinc-500">Acertos<input type="number" min="0" max={discipline.questionCount} value={draft.correct} onChange={(event) => setDrafts((current) => ({ ...current, [discipline.disciplineId]: { ...draft, correct: event.target.value } }))} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" /></label>
                        <label className="text-[11px] text-zinc-500">Em branco<input type="number" min="0" max={discipline.questionCount} value={draft.blank} onChange={(event) => setDrafts((current) => ({ ...current, [discipline.disciplineId]: { ...draft, blank: event.target.value } }))} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" /></label>
                        <label className="text-[11px] text-zinc-500">Erros<input readOnly value={Number.isFinite(wrong) ? wrong : ""} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-400" /></label>
                        <label className="text-[11px] text-zinc-500">Tempo (min)<input type="number" min="0" value={draft.minutes} onChange={(event) => setDrafts((current) => ({ ...current, [discipline.disciplineId]: { ...draft, minutes: event.target.value } }))} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" /></label>
                        <button type="button" onClick={() => recordDiscipline(discipline.disciplineId)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-500/15 sm:col-span-4 sm:justify-self-start"><Save className="h-4 w-4" /> Salvar disciplina</button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {selectedSimulado.status !== "CONCLUIDO" && (
              <button type="button" onClick={handleFinish} disabled={!allResultsRecorded} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">
                <BarChart3 className="h-4 w-4" /> Concluir e analisar
              </button>
            )}

            {selectedSimulado.analise && (
              <div className="space-y-4 border-t border-zinc-800 pt-5">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><p className="text-[10px] uppercase text-zinc-600">Pontuação</p><p className="mt-1 text-xl font-semibold text-zinc-100">{selectedSimulado.analise.points}/{selectedSimulado.analise.maximumPoints}</p></div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><p className="text-[10px] uppercase text-zinc-600">Acertos</p><p className="mt-1 text-xl font-semibold text-emerald-300">{selectedSimulado.analise.totalCorrect}</p></div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><p className="text-[10px] uppercase text-zinc-600">Erros</p><p className="mt-1 text-xl font-semibold text-red-300">{selectedSimulado.analise.totalWrong}</p></div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><p className="text-[10px] uppercase text-zinc-600">Brancos</p><p className="mt-1 text-xl font-semibold text-amber-300">{selectedSimulado.analise.totalBlank}</p></div>
                </div>

                {selectedSimulado.analise.zeroScoreDisciplineIds.length > 0 && (
                  <div className="flex gap-3 rounded-xl border border-red-500/25 bg-red-500/8 p-4 text-sm text-red-200"><AlertTriangle className="h-5 w-5 shrink-0" /><p>Risco eliminatório observado: ao menos uma disciplina terminou sem ponto. Isso é um alerta do resultado registrado, não uma previsão.</p></div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">Plano automático de correção</h3>
                  <p className="mt-1 text-xs text-zinc-500">A ordem abaixo não é um cronograma paralelo: ela organiza a correção deste simulado. O SDE só muda quando houver evidência real por subassunto.</p>
                  <div className="mt-3 space-y-3">
                    {selectedSimulado.analise.correctionPlan.length === 0 ? (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-200">Nenhum erro ou branco registrado neste simulado.</div>
                    ) : selectedSimulado.analise.correctionPlan.map((action) => (
                      <article key={action.disciplineId} className="rounded-xl border border-zinc-800 bg-zinc-950/55 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-blue-400">Passo {action.order}</p>
                        <h4 className="mt-1 text-sm font-semibold text-zinc-100">{action.disciplineName}</h4>
                        <p className="mt-1 text-xs leading-relaxed text-zinc-400">{action.reason}</p>
                        <ol className="mt-3 space-y-1 text-xs leading-relaxed text-zinc-500">{action.instructions.map((instruction, index) => <li key={instruction}>{index + 1}. {instruction}</li>)}</ol>
                      </article>
                    ))}
                  </div>
                </div>

                {previousComparable?.comparison.comparable && (
                  <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-violet-200"><TimerReset className="h-4 w-4" /> Comparação com {previousComparable.previous.titulo}</div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-4 text-xs text-zinc-400">
                      <p>Pontos: <strong className="text-zinc-100">{previousComparable.comparison.pointsDelta! >= 0 ? "+" : ""}{previousComparable.comparison.pointsDelta}</strong></p>
                      <p>Acertos: <strong className="text-zinc-100">{previousComparable.comparison.correctDelta! >= 0 ? "+" : ""}{previousComparable.comparison.correctDelta}</strong></p>
                      <p>Brancos: <strong className="text-zinc-100">{previousComparable.comparison.blankDelta! >= 0 ? "+" : ""}{previousComparable.comparison.blankDelta}</strong></p>
                      <p>Tempo: <strong className="text-zinc-100">{formatDuration(Math.abs(previousComparable.comparison.elapsedSecondsDelta ?? 0))} {Number(previousComparable.comparison.elapsedSecondsDelta) <= 0 ? "mais rápido" : "mais lento"}</strong></p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {simulados.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-100">Histórico recente</h2>
            <div className="mt-3 grid gap-2">
              {[...simulados].reverse().slice(0, 8).map((simulado) => (
                <button key={simulado.id} type="button" onClick={() => setSelectedSimuladoId(simulado.id)} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/45 px-4 py-3 text-left transition hover:border-zinc-700">
                  <div><p className="text-sm font-medium text-zinc-200">{simulado.titulo}</p><p className="mt-1 text-[11px] text-zinc-500">{simulado.fonte?.label ?? "Registro legado"} · {statusLabel(simulado.status)}</p></div>
                  <ExternalLink className="h-4 w-4 text-zinc-600" />
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
