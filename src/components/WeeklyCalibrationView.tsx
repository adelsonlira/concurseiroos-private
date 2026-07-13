import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CalendarRange,
  CheckCircle2,
  Clock3,
  FileQuestion,
  Gauge,
  RotateCcw,
  ShieldCheck
} from "lucide-react";
import { buildWeeklyCalibrationReport } from "../core/weekly/weeklyCalibration";
import { useConcurseiroStore } from "../store";

function todayKey(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(dateKey: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${dateKey}T12:00:00.000Z`));
}

function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  if (hours === 0) return `${remainder} min`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}min`;
}

const ACTIVITY_LABELS: Record<string, string> = {
  teoria: "Teoria",
  questoes: "Questões",
  revisao: "Revisão",
  flashcards: "Flashcards",
  simulado: "Simulado",
  SEM_CLASSIFICACAO: "Sem classificação"
};

export default function WeeklyCalibrationView() {
  const {
    configuracao,
    sessoesEstudo,
    tentativasQuestoes,
    cronogramasRevisao,
    historicoAtividades,
    subassuntos
  } = useConcurseiroStore();
  const currentDate = todayKey(configuracao.disponibilidadeEstudo.timeZone);
  const [referenceDate, setReferenceDate] = useState(currentDate);

  const report = useMemo(
    () =>
      buildWeeklyCalibrationReport({
        referenceDate,
        availability: configuracao.disponibilidadeEstudo,
        sessions: sessoesEstudo,
        attempts: tentativasQuestoes,
        reviewSchedules: cronogramasRevisao,
        activities: historicoAtividades,
        subtopics: subassuntos
      }),
    [
      referenceDate,
      configuracao.disponibilidadeEstudo,
      sessoesEstudo,
      tentativasQuestoes,
      cronogramasRevisao,
      historicoAtividades,
      subassuntos
    ]
  );

  const activityEntries = (Object.entries(
    report.execution.minutesByActivity
  ) as Array<[string, number]>)
    .filter(([, minutes]) => minutes > 0)
    .sort((a, b) => b[1] - a[1]);
  const totalActivityMinutes = activityEntries.reduce((sum, [, minutes]) => sum + minutes, 0);

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-6 text-zinc-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-mono uppercase tracking-wide text-blue-300">
                <CalendarRange className="h-4 w-4" /> Calibração semanal
              </div>
              <h1 className="text-xl font-bold">Execução real, sem nota de produtividade</h1>
              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-zinc-400">
                O relatório confronta disponibilidade, tempo efetivamente registrado, questões, revisões e avanço confirmado. Ele não estima aprovação, não transforma presença em aprendizagem e não pune semanas incompletas com uma pontuação arbitrária.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-2">
              <button
                type="button"
                onClick={() => setReferenceDate((value) => shiftDays(value, -7))}
                className="rounded-lg border border-zinc-800 p-2 text-zinc-400 hover:text-zinc-200"
                aria-label="Semana anterior"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-44 text-center text-[11px] font-mono text-zinc-300">
                {formatDate(report.period.startDate)} — {formatDate(report.period.endDate)}
              </div>
              <button
                type="button"
                disabled={referenceDate >= currentDate}
                onClick={() => setReferenceDate((value) => shiftDays(value, 7))}
                className="rounded-lg border border-zinc-800 p-2 text-zinc-400 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Semana seguinte"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Disponibilidade da semana"
            value={formatMinutes(report.availability.scheduledMinutes)}
            detail={`${report.availability.scheduledStudyDays} dia(s) configurados`}
            icon={<Clock3 className="h-5 w-5 text-blue-400" />}
          />
          <Metric
            label="Tempo registrado"
            value={formatMinutes(report.availability.recordedMinutes)}
            detail={`${report.availability.daysWithRecordedStudy} dia(s) com estudo`}
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />}
          />
          <Metric
            label="Questões reais"
            value={String(report.questions.attempts)}
            detail={
              report.questions.observedAccuracy === null
                ? "Sem taxa observável"
                : `${Math.round(report.questions.observedAccuracy * 100)}% de acertos observados`
            }
            icon={<FileQuestion className="h-5 w-5 text-amber-400" />}
          />
          <Metric
            label="Avanço confirmado"
            value={String(report.progression.newlyConfirmedSubtopics)}
            detail={`${report.progression.remainingIncompleteSubtopics} subassunto(s) ainda incompletos`}
            icon={<BookOpenCheck className="h-5 w-5 text-violet-400" />}
          />
        </section>

        {report.guardrails.protectNewContentNextWeek && (
          <section className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.05] p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-400" />
              <div>
                <h2 className="text-sm font-semibold text-amber-200">Proteção de avanço permanece ativa</h2>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-100/65">
                  {report.guardrails.reason} Isso não remove revisões ou riscos eliminatórios de prioridade superior.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-5 xl:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <Gauge className="h-4 w-4 text-blue-400" /> Distribuição real do tempo
            </h2>
            <p className="mt-1 text-[11px] text-zinc-500">
              Somente sessões registradas. A distribuição descreve a semana; não é uma proporção ideal prescrita.
            </p>
            <div className="mt-4 space-y-3">
              {activityEntries.map(([activity, minutes]) => {
                const width = totalActivityMinutes > 0 ? (minutes / totalActivityMinutes) * 100 : 0;
                return (
                  <div key={activity}>
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">{ACTIVITY_LABELS[activity] ?? activity}</span>
                      <span className="font-mono text-zinc-300">{formatMinutes(minutes)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
              {activityEntries.length === 0 && (
                <p className="rounded-lg border border-dashed border-zinc-800 p-5 text-center text-xs text-zinc-600">
                  Nenhuma sessão registrada neste período.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <RotateCcw className="h-4 w-4 text-emerald-400" /> Recuperações da semana
            </h2>
            <p className="mt-1 text-[11px] text-zinc-500">
              Resultado autoavaliado e duração real são mantidos separados. Revisões sem tempo não entram na comparação de eficiência.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SmallMetric label="Concluídas" value={String(report.reviews.completed)} />
              <SmallMetric label="Cronometradas" value={String(report.reviews.timedCompleted)} />
              <SmallMetric label="Tempo medido" value={formatMinutes(report.reviews.timedMinutes)} />
              <SmallMetric label="Falhas" value={String(report.reviews.failedRecoveries)} />
            </div>
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 text-[11px] text-zinc-500">
              <div className="flex justify-between"><span>Com esforço</span><span className="font-mono text-zinc-300">{report.reviews.effortfulRecoveries}</span></div>
              <div className="mt-2 flex justify-between"><span>Com fluência</span><span className="font-mono text-zinc-300">{report.reviews.fluentRecoveries}</span></div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
            <h2 className="text-sm font-semibold text-zinc-200">Planejado × executado</h2>
            <p className="mt-1 text-[11px] text-zinc-500">
              A comparação usa apenas sessões que preservaram a duração recomendada pelo SDE.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <SmallMetric label="Sessões rastreadas" value={`${report.execution.sessionsWithPlanTrace}/${report.execution.totalSessions}`} />
              <SmallMetric label="Planejado" value={formatMinutes(report.execution.plannedMinutesForTracedSessions)} />
              <SmallMetric label="Executado" value={formatMinutes(report.execution.actualMinutesForTracedSessions)} />
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-zinc-600">
              Diferença observada: {report.execution.observedPlanDifferenceMinutes >= 0 ? "+" : ""}{formatMinutes(Math.abs(report.execution.observedPlanDifferenceMinutes))}{report.execution.observedPlanDifferenceMinutes < 0 ? " abaixo" : " acima"}. A diferença não é classificada automaticamente como boa ou ruim.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <AlertTriangle className="h-4 w-4 text-amber-400" /> Qualidade dos dados
            </h2>
            <div className="mt-3 space-y-2">
              {report.dataQuality.gaps.map((gap) => (
                <div key={gap} className="rounded-lg border border-amber-500/15 bg-amber-500/[0.035] px-3 py-2 text-[10px] leading-relaxed text-amber-100/65">
                  {gap}
                </div>
              ))}
              {report.dataQuality.gaps.length === 0 && (
                <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.035] px-3 py-2 text-[10px] text-emerald-200/70">
                  Nenhuma lacuna estrutural foi detectada nos registros desta semana.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <h2 className="text-sm font-semibold text-zinc-200">Leitura objetiva da semana</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {report.observations.map((observation) => (
              <div key={observation} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 text-[11px] leading-relaxed text-zinc-400">
                {observation}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric(props: { label: string; value: string; detail: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wide text-zinc-500">{props.label}</span>
        {props.icon}
      </div>
      <div className="mt-3 text-2xl font-bold text-zinc-100">{props.value}</div>
      <p className="mt-1 text-[10px] text-zinc-600">{props.detail}</p>
    </div>
  );
}

function SmallMetric(props: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
      <div className="text-lg font-bold text-zinc-200">{props.value}</div>
      <div className="mt-1 text-[9px] font-mono uppercase text-zinc-600">{props.label}</div>
    </div>
  );
}
