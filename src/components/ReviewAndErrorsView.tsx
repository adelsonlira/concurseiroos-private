import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  TimerReset,
  XCircle
} from "lucide-react";
import { useConcurseiroStore } from "../store";
import type { CronogramaRevisao } from "../types";
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
    detail: "Há pelo menos dois acertos depois do último erro. Isso não prova domínio definitivo.",
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
  DIAGNOSTICO_APTO_SEM_TEORIA: "Conhecimento prévio demonstrado",
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

function formatElapsed(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
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

function reviewProtocol(schedule: CronogramaRevisao): string[] {
  if (schedule.modoProximaRevisao === "REAPRENDIZAGEM_IMEDIATA") {
    return [
      "Tente responder ou explicar sem consultar o material.",
      "Se falhar, consulte somente o trecho necessário e identifique a lacuna.",
      "Feche o material e faça uma nova tentativa antes de registrar o resultado."
    ];
  }

  if (schedule.modoProximaRevisao === "PRATICA_INTERCALADA") {
    return [
      "Recupere o conceito sem consulta e resolva um exemplo curto.",
      "Compare-o com um conceito próximo para evitar reconhecimento superficial.",
      "Registre o quanto conseguiu recuperar de forma independente."
    ];
  }

  return [
    "Explique o conceito ou resolva uma questão sem abrir o material.",
    "Consulte apenas depois da tentativa e corrija diferenças importantes.",
    "Registre se a recuperação foi independente, com esforço ou não ocorreu."
  ];
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
          ...history,
          desempenhoAutoAvaliado: history.desempenhoAutoAvaliado as ReviewPerformance,
          racionalIntervalo: history.racionalIntervalo ? [...history.racionalIntervalo] : undefined
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
          (left, right) =>
            left.proximaRevisaoData.localeCompare(right.proximaRevisaoData) ||
            left.id.localeCompare(right.id)
        ),
    [cronogramasRevisao, dueScheduleIds]
  );

  const errorSummaries = useMemo(
    () => buildErrorTopicSummaries(tentativasQuestoes),
    [tentativasQuestoes]
  );
  const interleavedQueue = useMemo(
    () =>
      buildInterleavedReviewQueue({
        schedules: coreSchedules,
        errorSummaries,
        referenceDate: today,
        maxItems: 12
      }),
    [coreSchedules, errorSummaries, today]
  );

  const orderedDueSchedules = useMemo(() => {
    const dueById = new Map<string, CronogramaRevisao>(
      dueSchedules.map((schedule): [string, CronogramaRevisao] => [schedule.id, schedule])
    );
    const ordered: CronogramaRevisao[] = [];
    const seen = new Set<string>();

    for (const item of interleavedQueue) {
      const schedule = dueById.get(item.scheduleId);
      if (!schedule || seen.has(schedule.id)) continue;
      ordered.push(schedule);
      seen.add(schedule.id);
    }
    for (const schedule of dueSchedules) {
      if (seen.has(schedule.id)) continue;
      ordered.push(schedule);
      seen.add(schedule.id);
    }
    return ordered;
  }, [dueSchedules, interleavedQueue]);

  const priorityReasonsByScheduleId = useMemo(
    () => new Map(interleavedQueue.map((item) => [item.scheduleId, item.priorityReasons])),
    [interleavedQueue]
  );
  const activeSchedule = activeReviewTimer
    ? cronogramasRevisao.find(
        (item) => item.id === activeReviewTimer.scheduleId && !item.desabilitada && !item.isDeleted
      ) ?? null
    : null;
  const primarySchedule = activeSchedule ?? orderedDueSchedules[0] ?? null;
  const remainingDueSchedules = orderedDueSchedules.filter(
    (schedule) => schedule.id !== primarySchedule?.id
  );

  useEffect(() => {
    if (!activeReviewTimer) return;
    if (!activeSchedule) {
      sessionStorage.removeItem(ACTIVE_REVIEW_TIMER_KEY);
      setActiveReviewTimer(null);
    }
  }, [activeReviewTimer, activeSchedule]);

  const futureSchedules = useMemo(
    () =>
      cronogramasRevisao
        .filter((item) => !item.isDeleted && !dueScheduleIds.has(item.id))
        .sort((left, right) => {
          if (left.desabilitada !== right.desabilitada) return left.desabilitada ? 1 : -1;
          return (
            left.proximaRevisaoData.localeCompare(right.proximaRevisaoData) ||
            left.id.localeCompare(right.id)
          );
        })
        .slice(0, 12),
    [cronogramasRevisao, dueScheduleIds]
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

  const withoutLaterCorrect = errorSummaries.filter(
    (item) => item.estadoRecuperacao === "SEM_ACERTO_POSTERIOR"
  ).length;
  const repeatedRecovery = errorSummaries.filter(
    (item) => item.estadoRecuperacao === "DOIS_OU_MAIS_ACERTOS_POSTERIORES"
  ).length;
  const totalDeclaredErrors = errorSummaries.reduce((sum, item) => sum + item.totalErros, 0);

  const startReviewTimer = (scheduleId: string) => {
    if (activeReviewTimer && activeReviewTimer.scheduleId !== scheduleId) return;
    const now = Date.now();
    const timer = { scheduleId, startedAtMs: now };
    setTimerNowMs(now);
    sessionStorage.setItem(ACTIVE_REVIEW_TIMER_KEY, JSON.stringify(timer));
    setActiveReviewTimer(timer);
  };

  const cancelReviewTimer = () => {
    sessionStorage.removeItem(ACTIVE_REVIEW_TIMER_KEY);
    setActiveReviewTimer(null);
  };

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
    if (result.success) cancelReviewTimer();
  };

  const primaryDiscipline = primarySchedule
    ? disciplineById.get(primarySchedule.disciplinaId)
    : null;
  const primarySubject = primarySchedule ? subjectById.get(primarySchedule.assuntoId) : null;
  const primarySubtopic = primarySchedule ? subtopicById.get(primarySchedule.subassuntoId) : null;
  const primaryReasons = primarySchedule
    ? priorityReasonsByScheduleId.get(primarySchedule.id) ?? []
    : [];

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-4 text-zinc-100 sm:p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="flex flex-col justify-between gap-3 border-b border-zinc-900 pb-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-blue-300">
              <RotateCcw className="h-4 w-4" /> Fila de recuperação do coach
            </div>
            <h1 className="mt-2 text-xl font-bold text-zinc-100">Revise uma lacuna por vez</h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500">
              O coach ordena o que está vencido. Você tenta recuperar sem consulta, corrige apenas o necessário e registra o resultado real.
            </p>
          </div>
          <div className="rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-[10px] font-mono text-zinc-400">
            {formatDate(today)} · {dueSchedules.length} pendente(s)
          </div>
        </header>

        {primarySchedule ? (
          <section className="rounded-2xl border border-blue-500/30 bg-blue-500/[0.06] p-5">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-blue-300">
                  {activeReviewTimer?.scheduleId === primarySchedule.id ? "Revisão em andamento" : "Faça agora"}
                </div>
                <h2 className="mt-2 text-xl font-bold text-white">
                  {primarySubtopic?.nome ?? primarySchedule.subassuntoId}
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  {primaryDiscipline?.nome ?? "Disciplina"} · {primarySubject?.nome ?? "Assunto"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-zinc-500">
                  <span className="rounded border border-zinc-800 bg-zinc-950/50 px-2 py-1">
                    {reviewModeLabel(primarySchedule.modoProximaRevisao)}
                  </span>
                  <span className="rounded border border-zinc-800 bg-zinc-950/50 px-2 py-1">
                    {primarySchedule.gatilhoOrigem
                      ? TRIGGER_LABELS[primarySchedule.gatilhoOrigem]
                      : "Origem não informada"}
                  </span>
                  <span className="rounded border border-zinc-800 bg-zinc-950/50 px-2 py-1">
                    Venceu em {formatDate(primarySchedule.proximaRevisaoData)}
                  </span>
                </div>
              </div>

              {activeReviewTimer?.scheduleId === primarySchedule.id ? (
                <div className="rounded-xl border border-blue-500/30 bg-zinc-950/70 px-5 py-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-[10px] font-mono uppercase text-blue-300">
                    <TimerReset className="h-4 w-4" /> Tempo de recuperação
                  </div>
                  <div className="mt-2 font-mono text-3xl font-bold text-white">
                    {formatElapsed(
                      Math.floor((timerNowMs - activeReviewTimer.startedAtMs) / 1000)
                    )}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => startReviewTimer(primarySchedule.id)}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  <PlayCircle className="h-5 w-5" /> Iniciar revisão
                </button>
              )}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/55 p-4">
                <h3 className="text-[10px] font-mono uppercase text-zinc-500">Protocolo</h3>
                <ol className="mt-3 space-y-3">
                  {reviewProtocol(primarySchedule).map((step, index) => (
                    <li key={step} className="flex gap-3 text-xs leading-relaxed text-zinc-300">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 font-mono text-[10px] text-blue-300">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/55 p-4">
                <h3 className="text-[10px] font-mono uppercase text-zinc-500">Por que veio primeiro</h3>
                <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                  {primaryReasons.length > 0
                    ? primaryReasons.join(" · ")
                    : "É a revisão ativa mais antiga e vencida da fila."}
                </p>
                <p className="mt-3 text-[10px] leading-relaxed text-zinc-600">
                  Método prescrito: {primarySchedule.metodoProximaRevisao
                    ? REVIEW_METHOD_LABELS[primarySchedule.metodoProximaRevisao]
                    : "protocolo de recuperação compatível com dados legados"}.
                </p>
              </div>
            </div>

            {activeReviewTimer?.scheduleId === primarySchedule.id && (
              <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/65 p-4">
                <div className="text-[10px] font-mono uppercase text-zinc-500">
                  Como foi a recuperação sem consulta?
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {(["HARD", "MEDIUM", "EASY"] as ReviewPerformance[]).map((performance) => (
                    <button
                      key={performance}
                      type="button"
                      onClick={() => handleReview(primarySchedule.id, performance)}
                      className={`rounded-lg border px-3 py-3 text-xs font-semibold transition ${
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
                </div>
                <button
                  type="button"
                  onClick={cancelReviewTimer}
                  className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-600 transition hover:text-zinc-300"
                >
                  <XCircle className="h-4 w-4" /> Cancelar sem registrar
                </button>
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.05] p-8 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
            <h2 className="mt-3 text-base font-semibold text-zinc-200">Fila de revisão em dia</h2>
            <p className="mt-1 text-xs text-zinc-500">
              O coach criará novos ciclos quando houver teoria concluída, erro ou acerto com baixa confiança.
            </p>
          </section>
        )}

        {remainingDueSchedules.length > 0 && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/25 p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-zinc-200">Depois desta</h2>
              <p className="mt-1 text-[11px] text-zinc-500">
                A ordem alterna assuntos quando isso não compromete a recuperação de uma lacuna crítica.
              </p>
            </div>
            <div className="space-y-2">
              {remainingDueSchedules.map((schedule, index) => {
                const discipline = disciplineById.get(schedule.disciplinaId);
                const subject = subjectById.get(schedule.assuntoId);
                const subtopic = subtopicById.get(schedule.subassuntoId);
                const reasons = priorityReasonsByScheduleId.get(schedule.id) ?? [];
                return (
                  <article
                    key={schedule.id}
                    className="flex flex-col justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-700 font-mono text-[10px] text-zinc-500">
                        {index + 2}
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-zinc-300">
                          {subtopic?.nome ?? schedule.subassuntoId}
                        </h3>
                        <p className="mt-1 text-[10px] text-zinc-600">
                          {discipline?.nome ?? "Disciplina"} · {subject?.nome ?? "Assunto"}
                        </p>
                        {reasons.length > 0 && (
                          <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-zinc-600">
                            {reasons.join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        disabled={Boolean(activeReviewTimer)}
                        onClick={() => startReviewTimer(schedule.id)}
                        className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-300 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <PlayCircle className="h-4 w-4" /> Iniciar
                      </button>
                      <button
                        type="button"
                        onClick={() => definirRevisaoDesabilitada(schedule.id, true)}
                        className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-600 transition hover:text-zinc-300"
                      >
                        <PauseCircle className="h-4 w-4" /> Pausar
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <details className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-5">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" /> Como o coach está decidindo
                </h2>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Métricas e política ficam disponíveis para auditoria, sem competir com a próxima ação.
                </p>
              </div>
              <span className="text-[10px] font-mono text-zinc-600">DETALHES</span>
            </div>
          </summary>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Vencidas" value={String(dueSchedules.length)} detail="Ciclos ativos realmente vencidos" />
            <Metric label="Erros" value={String(totalDeclaredErrors)} detail={`${errorSummaries.length} subassunto(s)`} />
            <Metric label="Sem acerto posterior" value={String(withoutLaterCorrect)} detail="Maior necessidade de recuperação" />
            <Metric label="Recuperação repetida" value={String(repeatedRecovery)} detail="Dois ou mais acertos posteriores" />
          </div>

          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="text-xs font-semibold text-zinc-300">Política adaptativa</div>
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">{ADAPTIVE_POLICY_SUMMARY}</p>
            <p className="mt-2 text-[10px] font-mono text-zinc-700">{REVIEW_POLICY_VERSION}</p>
          </div>

          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="text-xs font-semibold text-zinc-300">Aprendizado do próprio sistema</div>
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
              {methodPreference.status === "OBSERVED_PREFERENCE" ||
              methodPreference.status === "OBSERVED_EFFICIENCY_PREFERENCE"
                ? methodPreference.preferredMethod
                  ? `Preferência observada: ${REVIEW_METHOD_LABELS[methodPreference.preferredMethod]}.`
                  : "Preferência observada sem método elegível."
                : methodPreference.status === "INCONCLUSIVE"
                  ? "Comparação inconclusiva; alternância preservada."
                  : "Ainda coletando evidência comparável."}
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {flexibleMethodEvidence.map((item) => (
                <div key={item.method} className="rounded-lg border border-zinc-800 p-3 text-[10px] text-zinc-500">
                  <div className="font-semibold text-zinc-300">{REVIEW_METHOD_LABELS[item.method]}</div>
                  <p className="mt-1">
                    {item.delayedOutcomes} resultado(s) tardio(s) · {item.distinctSubtopics} subassunto(s) · recuperação independente {item.successRate === null ? "indisponível" : `${Math.round(item.successRate * 100)}%`}.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </details>

        <details className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-5">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                  <ClipboardList className="h-4 w-4 text-red-400" /> Caderno de erros
                </h2>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Consulte quando precisar entender a origem da fila ou reforçar manualmente um ciclo.
                </p>
              </div>
              <span className="rounded-full border border-zinc-800 px-2.5 py-1 text-[10px] text-zinc-500">
                {errorSummaries.length} tópico(s)
              </span>
            </div>
          </summary>

          <div className="mt-5 space-y-3">
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
                <article key={summary.subassuntoId} className="rounded-xl border border-zinc-800 bg-zinc-950/55 p-4">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-mono uppercase text-zinc-600">
                        {discipline?.nome ?? "Disciplina"} · {subject?.nome ?? "Assunto"}
                      </div>
                      <h3 className="mt-1 text-sm font-semibold text-zinc-200">
                        {subtopic?.nome ?? summary.subassuntoId}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-zinc-500">
                        <span>{summary.totalErros} erro(s)</span>
                        <span>·</span>
                        <span>Último: {formatDate(summary.ultimoErroEm)}</span>
                        <span>·</span>
                        <span>{summary.acertosAposUltimoErro} acerto(s) posterior(es)</span>
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
                        {schedule?.desabilitada
                          ? "Reativar revisão"
                          : schedule
                            ? "Reforçar ciclo"
                            : "Agendar revisão"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
            {errorSummaries.length === 0 && (
              <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-xs text-zinc-500">
                Nenhum erro foi registrado. Isso significa ausência de dados, não ausência de dificuldades.
              </div>
            )}
          </div>
        </details>

        <details className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-5">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                  <CalendarClock className="h-4 w-4 text-zinc-500" /> Próximas revisões
                </h2>
                <p className="mt-1 text-[11px] text-zinc-500">Planejamento futuro e ciclos pausados.</p>
              </div>
              <span className="text-[10px] font-mono text-zinc-600">{futureSchedules.length} VISÍVEIS</span>
            </div>
          </summary>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
                        {schedule.desabilitada
                          ? "Pausada"
                          : `${formatDate(schedule.proximaRevisaoData)} · ${reviewModeLabel(schedule.modoProximaRevisao)}`}
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
                    ) : (
                      <button
                        type="button"
                        onClick={() => definirRevisaoDesabilitada(schedule.id, true)}
                        className="text-zinc-700 transition hover:text-zinc-400"
                        aria-label="Pausar revisão"
                      >
                        <PauseCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {futureSchedules.length === 0 && (
              <div className="text-xs text-zinc-600">Nenhuma revisão futura ativa.</div>
            )}
          </div>
        </details>

        <section className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/10 p-4 text-xs leading-relaxed text-zinc-500">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <p>
            A autoavaliação descreve apenas esta tentativa de recuperação. Ela não comprova domínio e não substitui resultados posteriores em questões.
          </p>
        </section>
      </div>
    </div>
  );
}

function Metric(props: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
      <span className="text-[10px] font-mono uppercase tracking-wide text-zinc-500">{props.label}</span>
      <div className="mt-2 text-2xl font-bold text-zinc-100">{props.value}</div>
      <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">{props.detail}</p>
    </div>
  );
}
