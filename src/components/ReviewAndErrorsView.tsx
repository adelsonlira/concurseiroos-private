import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  TimerReset,
  XCircle
} from "lucide-react";
import { useConcurseiroStore } from "../store";
import {
  ADAPTIVE_POLICY_SUMMARY,
  buildErrorTopicSummaries,
  buildInterleavedReviewQueue,
  buildReviewMethodEvidence,
  getDueReviewSchedules,
  REVIEW_METHOD_LABELS,
  REVIEW_POLICY_VERSION,
  selectObservedPreferredReviewMethod
} from "../core/review/reviewEngine";
import type {
  ErrorCause,
  RecoveryEvidenceState,
  ReviewMethod,
  ReviewPerformance,
  ReviewScheduleLike,
  ReviewTrigger
} from "../core/review/types";

const RECOVERY_LABELS: Record<
  RecoveryEvidenceState,
  { label: string; detail: string; className: string }
> = {
  SEM_ACERTO_POSTERIOR: {
    label: "Sem acerto posterior",
    detail: "Ainda não existe uma tentativa correta registrada depois do último erro.",
    className: "border-red-500/30 bg-red-500/10 text-red-300"
  },
  UM_ACERTO_POSTERIOR: {
    label: "Recuperação inicial observada",
    detail: "Existe um acerto posterior ao último erro; ainda é pouca evidência.",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-300"
  },
  DOIS_OU_MAIS_ACERTOS_POSTERIORES: {
    label: "Recuperação repetida observada",
    detail: "Há pelo menos dois acertos registrados depois do último erro. Isso não prova domínio definitivo.",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  }
};

const ERROR_CAUSE_LABELS: Record<ErrorCause, string> = {
  LACUNA_CONTEUDO: "Lacuna de conteúdo",
  INTERPRETACAO: "Interpretação",
  APLICACAO: "Aplicação do conceito",
  MEMORIA: "Memória",
  "DISTRAÇÃO": "Distração",
  PRESSAO_TEMPO: "Pressão de tempo",
  DESCONHECIDA: "Causa não identificada"
};

const TRIGGER_LABELS: Record<ReviewTrigger, string> = {
  ERRO_QUESTAO: "Erro em questão",
  ACERTO_BAIXA_CONFIANCA: "Acerto com baixa confiança",
  TEORIA_CONCLUIDA: "Teoria concluída",
  MANUAL: "Agendamento manual"
};

const ACTIVE_REVIEW_TIMER_KEY = "CONCURSEIRO_OS_ACTIVE_REVIEW_TIMER";

function loadActiveReviewTimer(): { scheduleId: string; startedAtMs: number } | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const parsed = JSON.parse(sessionStorage.getItem(ACTIVE_REVIEW_TIMER_KEY) ?? "null");
    if (
      parsed &&
      typeof parsed.scheduleId === "string" &&
      Number.isFinite(parsed.startedAtMs) &&
      parsed.startedAtMs > 0 &&
      parsed.startedAtMs <= Date.now()
    ) {
      return parsed;
    }
  } catch {
    sessionStorage.removeItem(ACTIVE_REVIEW_TIMER_KEY);
  }
  return null;
}

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

function formatDate(dateKeyOrTimestamp: string): string {
  const dateKey = dateKeyOrTimestamp.slice(0, 10);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${dateKey}T12:00:00`));
}

function performanceLabel(performance: ReviewPerformance): string {
  if (performance === "HARD") return "Não recuperei";
  if (performance === "MEDIUM") return "Recuperei com esforço";
  return "Recuperei com fluência";
}

function reviewModeLabel(mode: string | undefined): string {
  if (mode === "REAPRENDIZAGEM_IMEDIATA") return "Correção + nova tentativa";
  if (mode === "PRATICA_INTERCALADA") return "Prática intercalada";
  return "Recuperação ativa";
}

function formatElapsed(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export default function ReviewAndErrorsView() {
  const {
    disciplinas,
    assuntos,
    subassuntos,
    tentativasQuestoes,
    cronogramasRevisao,
    configuracao,
    agendarRevisaoSubassunto,
    concluirRevisaoProgramada,
    definirRevisaoDesabilitada
  } = useConcurseiroStore();
  const [activeReviewTimer, setActiveReviewTimer] = useState<{
    scheduleId: string;
    startedAtMs: number;
  } | null>(loadActiveReviewTimer);
  const [timerNowMs, setTimerNowMs] = useState(Date.now());

  useEffect(() => {
    if (!activeReviewTimer) return;
    setTimerNowMs(Date.now());
    const intervalId = window.setInterval(() => setTimerNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [activeReviewTimer]);

  const today = currentDateKey(configuracao.disponibilidadeEstudo.timeZone);
  const disciplineById = useMemo(
    () => new Map(disciplinas.map((item) => [item.id, item])),
    [disciplinas]
  );
  const subjectById = useMemo(
    () => new Map(assuntos.map((item) => [item.id, item])),
    [assuntos]
  );
  const subtopicById = useMemo(
    () => new Map(subassuntos.map((item) => [item.id, item])),
    [subassuntos]
  );

  const coreSchedules = useMemo<ReviewScheduleLike[]>(
    () =>
      cronogramasRevisao.map((item) => ({
        ...item,
        historicoTentativas: item.historicoTentativas.map((history) => ({
          revisadoEm: history.revisadoEm,
          desempenhoAutoAvaliado: history.desempenhoAutoAvaliado as ReviewPerformance,
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
      })),
    [cronogramasRevisao]
  );

  const dueScheduleIds = useMemo(
    () => new Set(getDueReviewSchedules(coreSchedules, today).map((item) => item.id)),
    [coreSchedules, today]
  );
  const dueSchedules = useMemo(
    () =>
      cronogramasRevisao
        .filter((item) => dueScheduleIds.has(item.id))
        .sort(
          (a, b) =>
            a.proximaRevisaoData.localeCompare(b.proximaRevisaoData) || a.id.localeCompare(b.id)
        ),
    [cronogramasRevisao, dueScheduleIds]
  );
  useEffect(() => {
    if (!activeReviewTimer) return;
    const stillExists = cronogramasRevisao.some(
      (item) => item.id === activeReviewTimer.scheduleId && !item.desabilitada && !item.isDeleted
    );
    if (!stillExists) {
      sessionStorage.removeItem(ACTIVE_REVIEW_TIMER_KEY);
      setActiveReviewTimer(null);
    }
  }, [activeReviewTimer, cronogramasRevisao]);

  const futureSchedules = useMemo(
    () =>
      cronogramasRevisao
        .filter((item) => !item.isDeleted && !dueScheduleIds.has(item.id))
        .sort((a, b) => {
          if (a.desabilitada !== b.desabilitada) return a.desabilitada ? 1 : -1;
          return a.proximaRevisaoData.localeCompare(b.proximaRevisaoData) || a.id.localeCompare(b.id);
        })
        .slice(0, 12),
    [cronogramasRevisao, dueScheduleIds]
  );

  const errorSummaries = useMemo(
    () => buildErrorTopicSummaries(tentativasQuestoes),
    [tentativasQuestoes]
  );
  const withoutLaterCorrect = errorSummaries.filter(
    (item) => item.estadoRecuperacao === "SEM_ACERTO_POSTERIOR"
  ).length;
  const repeatedRecovery = errorSummaries.filter(
    (item) => item.estadoRecuperacao === "DOIS_OU_MAIS_ACERTOS_POSTERIORES"
  ).length;
  const totalDeclaredErrors = errorSummaries.reduce((sum, item) => sum + item.totalErros, 0);
  const interleavedQueue = useMemo(
    () => buildInterleavedReviewQueue({
      schedules: coreSchedules,
      errorSummaries,
      referenceDate: today,
      maxItems: 6
    }),
    [coreSchedules, errorSummaries, today]
  );
  const methodEvidence = useMemo(
    () => buildReviewMethodEvidence(coreSchedules),
    [coreSchedules]
  );
  const methodPreference = useMemo(
    () => selectObservedPreferredReviewMethod(methodEvidence),
    [methodEvidence]
  );
  const flexibleMethodEvidence = methodEvidence.filter((item) =>
    (["ADAPTIVE_RETRIEVAL", "INTERLEAVED_RETRIEVAL"] as ReviewMethod[]).includes(item.method)
  );

  const handleReview = (scheduleId: string, performance: ReviewPerformance) => {
    if (!activeReviewTimer || activeReviewTimer.scheduleId !== scheduleId) return;
    const elapsedSeconds = Math.max(
      1,
      Math.floor((Date.now() - activeReviewTimer.startedAtMs) / 1000)
    );
    const result = concluirRevisaoProgramada(scheduleId, {
      performance,
      tempoGastoSegundos: elapsedSeconds,
      duracaoFonte: "TIMER"
    });
    if (result.success) {
      sessionStorage.removeItem(ACTIVE_REVIEW_TIMER_KEY);
      setActiveReviewTimer(null);
    }
  };

  const startReviewTimer = (scheduleId: string) => {
    if (activeReviewTimer && activeReviewTimer.scheduleId !== scheduleId) return;
    const now = Date.now();
    const timer = { scheduleId, startedAtMs: now };
    setTimerNowMs(now);
    sessionStorage.setItem(ACTIVE_REVIEW_TIMER_KEY, JSON.stringify(timer));
    setActiveReviewTimer(timer);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-6 text-zinc-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-mono uppercase tracking-wide text-blue-300">
                <RotateCcw className="h-4 w-4" /> Recuperação ativa
              </div>
              <h1 className="text-xl font-bold">Revisões e caderno de erros</h1>
              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-zinc-400">
                O sistema usa recuperação sem consulta, correção imediata quando houver falha, crescimento adaptativo do intervalo e prática intercalada. A agenda responde às evidências registradas e ao tempo restante até a prova; nenhuma autoavaliação é tratada como domínio comprovado.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-3 text-[11px] text-zinc-400">
              <div className="flex items-center gap-2 font-mono text-zinc-300">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> Política transparente
              </div>
              <p className="mt-1 max-w-sm leading-relaxed">
                {ADAPTIVE_POLICY_SUMMARY}
              </p>
              <p className="mt-1 text-[10px] text-zinc-600">{REVIEW_POLICY_VERSION}</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Metric
            label="Revisões vencidas hoje"
            value={String(dueSchedules.length)}
            detail="Somente ciclos ativos e realmente vencidos"
            icon={<CalendarClock className="h-5 w-5 text-blue-400" />}
          />
          <Metric
            label="Erros registrados"
            value={String(totalDeclaredErrors)}
            detail={`${errorSummaries.length} subassunto(s) com erro`}
            icon={<CircleAlert className="h-5 w-5 text-red-400" />}
          />
          <Metric
            label="Sem acerto posterior"
            value={String(withoutLaterCorrect)}
            detail="Fila mais urgente do caderno de erros"
            icon={<AlertTriangle className="h-5 w-5 text-amber-400" />}
          />
          <Metric
            label="Recuperação repetida"
            value={String(repeatedRecovery)}
            detail="Dois ou mais acertos após o último erro"
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />}
          />
        </section>

        <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.035] p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div className="max-w-3xl">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                <ClipboardList className="h-4 w-4 text-emerald-400" /> Aprendizado do próprio sistema
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                O comparador usa somente resultados de recuperação registrados em uma sessão posterior. Ele não declara causalidade, não troca o método com amostra pequena e mantém uma parcela determinística de exploração para evitar ficar preso a uma escolha antiga.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-[10px] text-zinc-400">
              {(methodPreference.status === "OBSERVED_PREFERENCE" ||
                methodPreference.status === "OBSERVED_EFFICIENCY_PREFERENCE") &&
              methodPreference.preferredMethod
                ? `Preferência observada (${methodPreference.basis === "EFFICIENCY" ? "eficiência" : "retenção"}): ${REVIEW_METHOD_LABELS[methodPreference.preferredMethod]}`
                : methodPreference.status === "INCONCLUSIVE"
                  ? "Comparação inconclusiva: alternância preservada"
                  : "Coletando evidência comparável"}
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {flexibleMethodEvidence.map((item) => (
              <div key={item.method} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                <div className="text-xs font-semibold text-zinc-200">{REVIEW_METHOD_LABELS[item.method]}</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-zinc-500 sm:grid-cols-4">
                  <div><span className="block font-mono text-zinc-300">{item.delayedOutcomes}</span>resultados tardios</div>
                  <div><span className="block font-mono text-zinc-300">{item.distinctSubtopics}</span>subassuntos</div>
                  <div><span className="block font-mono text-zinc-300">{item.successRate === null ? "—" : `${Math.round(item.successRate * 100)}%`}</span>recuperação independente</div>
                  <div><span className="block font-mono text-zinc-300">{item.observedIndependentRecoveriesPer10Minutes === null ? "—" : item.observedIndependentRecoveriesPer10Minutes.toFixed(2)}</span>recuperações/10 min</div>
                </div>
                <p className="mt-2 text-[10px] text-zinc-600">
                  {item.preferenceEligible
                    ? "Gate de retenção atingido."
                    : "Retenção: faltam 8 resultados tardios e 3 subassuntos."}
                  {" "}
                  {item.efficiencyEligible
                    ? "Gate de eficiência atingido."
                    : `Eficiência: ${item.timedDelayedOutcomes}/12 resultados cronometrados, ${item.timedDistinctSubtopics}/4 subassuntos e ${Math.round(item.totalTimedMinutes)}/30 min.`}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-blue-500/20 bg-blue-500/[0.04] px-3 py-2 text-[10px] leading-relaxed text-blue-200/75">
            Proteção de avanço: quando houver conteúdo ainda não estudado e a janela diária comportar, o Planner reserva uma sessão executável de teoria nova. Revisões excedentes permanecem na fila em vez de ocupar automaticamente todo o dia.
          </div>
        </section>

        <section className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-5">
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <RotateCcw className="h-4 w-4 text-blue-400" /> Bloco intercalado sugerido
            </h2>
            <p className="mt-1 text-[11px] text-zinc-500">
              Ordem determinística das revisões vencidas, alternando assuntos quando possível. Prioriza falhas sem recuperação e não mistura conteúdos ainda não compreendidos apenas por variedade.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {interleavedQueue.map((item, index) => {
              const subtopic = subtopicById.get(item.subassuntoId);
              const subject = subjectById.get(item.assuntoId);
              return (
                <div key={item.scheduleId} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                  <div className="text-[10px] font-mono text-blue-300">ETAPA {index + 1}</div>
                  <div className="mt-1 text-xs font-semibold text-zinc-200">{subtopic?.nome ?? item.subassuntoId}</div>
                  <div className="mt-1 text-[10px] text-zinc-600">{subject?.nome ?? item.assuntoId}</div>
                  <div className="mt-2 text-[10px] leading-relaxed text-zinc-500">{item.priorityReasons.join(" · ")}</div>
                </div>
              );
            })}
            {interleavedQueue.length === 0 && (
              <div className="text-xs text-zinc-600">Nenhuma revisão vencida para compor um bloco intercalado hoje.</div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Fila de revisões vencidas</h2>
              <p className="mt-1 text-[11px] text-zinc-500">
                Primeiro tente explicar ou resolver sem consultar. Se falhar, consulte apenas o necessário, corrija e faça uma nova tentativa na mesma sessão. Depois registre o resultado da recuperação.
              </p>
            </div>
            <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-2.5 py-1 text-[10px] font-mono text-blue-300">
              {formatDate(today)}
            </span>
          </div>

          <div className="space-y-3">
            {dueSchedules.map((schedule) => {
              const discipline = disciplineById.get(schedule.disciplinaId);
              const subject = subjectById.get(schedule.assuntoId);
              const subtopic = subtopicById.get(schedule.subassuntoId);
              return (
                <article key={schedule.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono uppercase text-zinc-600">
                        {discipline?.nome ?? "Disciplina"} · {subject?.nome ?? "Assunto"}
                      </div>
                      <h3 className="mt-1 text-sm font-semibold text-zinc-200">
                        {subtopic?.nome ?? schedule.subassuntoId}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-zinc-500">
                        <span className="rounded border border-zinc-800 px-2 py-1">
                          Vencimento: {formatDate(schedule.proximaRevisaoData)}
                        </span>
                        <span className="rounded border border-zinc-800 px-2 py-1">
                          Gatilho: {schedule.gatilhoOrigem ? TRIGGER_LABELS[schedule.gatilhoOrigem] : "legado/não informado"}
                        </span>
                        <span className="rounded border border-zinc-800 px-2 py-1">
                          Recuperações registradas: {schedule.historicoTentativas.length}
                        </span>
                        <span className="rounded border border-zinc-800 px-2 py-1">
                          Próximo modo: {reviewModeLabel(schedule.modoProximaRevisao)}
                        </span>
                        <span className="rounded border border-zinc-800 px-2 py-1">
                          Método: {schedule.metodoProximaRevisao ? REVIEW_METHOD_LABELS[schedule.metodoProximaRevisao] : "migração pendente"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {activeReviewTimer?.scheduleId === schedule.id ? (
                        <>
                          <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 font-mono text-xs text-blue-200">
                            <TimerReset className="h-4 w-4" />
                            {formatElapsed(Math.floor((timerNowMs - activeReviewTimer.startedAtMs) / 1000))}
                          </div>
                          {(["HARD", "MEDIUM", "EASY"] as ReviewPerformance[]).map((performance) => (
                            <button
                              key={performance}
                              type="button"
                              onClick={() => handleReview(schedule.id, performance)}
                              className={`rounded-lg border px-3 py-2 text-xs transition ${
                                performance === "HARD"
                                  ? "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                                  : performance === "MEDIUM"
                                    ? "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                              }`}
                            >
                              {performanceLabel(performance)}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              sessionStorage.removeItem(ACTIVE_REVIEW_TIMER_KEY);
                              setActiveReviewTimer(null);
                            }}
                            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-500 transition hover:text-zinc-300"
                          >
                            <XCircle className="h-4 w-4" /> Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={Boolean(activeReviewTimer)}
                          onClick={() => startReviewTimer(schedule.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-300 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                          title={activeReviewTimer ? "Finalize ou cancele a revisão em andamento." : undefined}
                        >
                          <PlayCircle className="h-4 w-4" /> Iniciar revisão
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={activeReviewTimer?.scheduleId === schedule.id}
                        onClick={() => definirRevisaoDesabilitada(schedule.id, true)}
                        className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-500 transition hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <PauseCircle className="h-4 w-4" /> Pausar ciclo
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            {dueSchedules.length === 0 && (
              <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center">
                <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500/70" />
                <p className="mt-2 text-sm text-zinc-300">Nenhuma revisão programada está vencida.</p>
                <p className="mt-1 text-[11px] text-zinc-600">
                  Novos ciclos surgem de teoria explicitamente concluída, erros e acertos com baixa confiança.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <ClipboardList className="h-4 w-4 text-red-400" /> Caderno de erros derivado
            </h2>
            <p className="mt-1 text-[11px] text-zinc-500">
              Cada item nasce de um erro real. O estado de recuperação considera apenas acertos registrados depois do erro mais recente naquele subassunto.
            </p>
          </div>

          <div className="space-y-3">
            {errorSummaries.map((summary) => {
              const discipline = disciplineById.get(summary.disciplinaId);
              const subject = subjectById.get(summary.assuntoId);
              const subtopic = subtopicById.get(summary.subassuntoId);
              const recovery = RECOVERY_LABELS[summary.estadoRecuperacao];
              const schedule = cronogramasRevisao.find(
                (item) => item.subassuntoId === summary.subassuntoId && !item.isDeleted
              );
              const causes = (
                Object.entries(summary.causasDeclaradas) as Array<[ErrorCause, number | undefined]>
              ).filter((entry): entry is [ErrorCause, number] => (entry[1] ?? 0) > 0);

              return (
                <article key={summary.subassuntoId} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-mono uppercase text-zinc-600">
                        {discipline?.nome ?? "Disciplina"} · {subject?.nome ?? "Assunto"}
                      </div>
                      <h3 className="mt-1 text-sm font-semibold text-zinc-200">
                        {subtopic?.nome ?? summary.subassuntoId}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-zinc-500">
                        <span className="rounded border border-zinc-800 px-2 py-1">
                          {summary.totalErros} erro(s)
                        </span>
                        <span className="rounded border border-zinc-800 px-2 py-1">
                          Último erro: {formatDate(summary.ultimoErroEm)}
                        </span>
                        <span className="rounded border border-zinc-800 px-2 py-1">
                          {summary.acertosAposUltimoErro} acerto(s) posterior(es)
                        </span>
                      </div>

                      {causes.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {causes.map(([cause, count]) => (
                            <span key={cause} className="rounded-full bg-zinc-900 px-2.5 py-1 text-[10px] text-zinc-400">
                              {ERROR_CAUSE_LABELS[cause]}: {count}
                            </span>
                          ))}
                        </div>
                      )}

                      {summary.notasRecentes.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {summary.notasRecentes.map((note) => (
                            <blockquote key={note.tentativaId} className="border-l-2 border-zinc-700 pl-3 text-[11px] leading-relaxed text-zinc-400">
                              {note.nota}
                            </blockquote>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex w-full shrink-0 flex-col gap-2 lg:w-72">
                      <div className={`rounded-lg border px-3 py-2 text-[11px] ${recovery.className}`}>
                        <div className="font-semibold">{recovery.label}</div>
                        <p className="mt-1 opacity-80">{recovery.detail}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => agendarRevisaoSubassunto(summary.subassuntoId, "MANUAL")}
                        className="flex items-center justify-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-300 transition hover:bg-blue-500/20"
                      >
                        <RotateCcw className="h-4 w-4" />
                        {schedule?.desabilitada ? "Reativar revisão" : schedule ? "Reforçar ciclo" : "Agendar revisão"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            {errorSummaries.length === 0 && (
              <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-xs text-zinc-500">
                Nenhum erro foi registrado ainda. Isso significa ausência de dados, não ausência de dificuldades.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Próximas revisões</h2>
              <p className="mt-1 text-[11px] text-zinc-500">Até doze ciclos futuros, ordenados por data.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {futureSchedules.map((schedule) => {
              const subtopic = subtopicById.get(schedule.subassuntoId);
              return (
                <div key={schedule.id} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-zinc-300">
                        {subtopic?.nome ?? schedule.subassuntoId}
                      </p>
                      <p className="mt-1 text-[10px] text-zinc-600">
                        {schedule.desabilitada ? "Pausada" : formatDate(schedule.proximaRevisaoData)} · {reviewModeLabel(schedule.modoProximaRevisao)} · intervalo {schedule.ultimaDecisaoIntervaloDias ?? "não calibrado"} dia(s)
                      </p>
                    </div>
                    {schedule.desabilitada ? (
                      <button
                        type="button"
                        onClick={() => definirRevisaoDesabilitada(schedule.id, false)}
                        className="text-zinc-600 transition hover:text-emerald-400"
                        aria-label="Reativar revisão"
                      >
                        <PlayCircle className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
            {futureSchedules.length === 0 && (
              <div className="text-xs text-zinc-600">Nenhuma revisão futura ativa.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric(props: { label: string; value: string; detail: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/35 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-mono uppercase tracking-wide text-zinc-500">{props.label}</span>
        {props.icon}
      </div>
      <div className="mt-3 text-2xl font-bold text-zinc-100">{props.value}</div>
      <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">{props.detail}</p>
    </div>
  );
}
