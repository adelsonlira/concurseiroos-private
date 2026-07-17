import { ReactNode, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileQuestion,
  MapPin,
  Play,
  ShieldCheck,
  Target,
  Timer
} from "lucide-react";
import { APP_RELEASE_CHANNEL, APP_VERSION } from "../config/appMetadata";
import { useConcurseiroStore } from "../store";
import { privateMaterialProviderLabel, privateMaterialSourceRoleLabel } from "../core/materials/materialPresentation";
import type { StudyActivityKind } from "../types";
import ExternalQuestionSourcePlanCard from "./ExternalQuestionSourcePlanCard";
import StudyFocusGuideCard from "./StudyFocusGuideCard";
import PrivatePdfOpenButton from "./PrivatePdfOpenButton";
import { buildCoachOperationalCommand } from "../core/coach/operationalCoach";
import { buildOnboardingPlan } from "../core/onboarding/onboarding";
import { presentDecisionWarning } from "../core/presentation/decisionWarnings";

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

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} min`;
  if (remainder === 0) return `${hours} h`;
  return `${hours} h ${remainder} min`;
}

export default function DashboardView({ onStartSession, onAskCoach }: { onStartSession?: () => void; onAskCoach?: () => void }) {
  const {
    concursos,
    assuntos,
    tentativasQuestoes,
    sessoesEstudo,
    configuracao,
    biblioteca,
    isTimerRunning,
    activeConcursoId,
    setActiveConcurso,
    ultimaDecisaoSDE,
    executarSDEParaData
  } = useConcurseiroStore();

  const referenceDate = currentDateKey(configuracao.disponibilidadeEstudo.timeZone);
  const activeConcurso =
    concursos.find((item) => item.id === activeConcursoId) ?? concursos[0] ?? null;

  useEffect(() => {
    if (!configuracao.concursoAlvoId || assuntos.length === 0) return;
    if (ultimaDecisaoSDE?.referenceDate !== referenceDate) {
      executarSDEParaData(referenceDate);
    }
  }, [
    referenceDate,
    configuracao.concursoAlvoId,
    assuntos.length,
    ultimaDecisaoSDE?.referenceDate,
    executarSDEParaData
  ]);

  const metrics = useMemo(() => {
    const totalMinutes = sessoesEstudo.reduce(
      (sum, session) => sum + Math.ceil(session.tempoGastoSegundos / 60),
      0
    );
    const correct = tentativasQuestoes.filter((attempt) => attempt.acertou).length;
    return {
      totalMinutes,
      attempts: tentativasQuestoes.length,
      hitRate:
        tentativasQuestoes.length > 0
          ? Math.round((correct / tentativasQuestoes.length) * 100)
          : null,
      studiedDays: new Set(
        sessoesEstudo.map((session) => session.dataLocal ?? session.dataFim.slice(0, 10))
      ).size
    };
  }, [sessoesEstudo, tentativasQuestoes]);

  const prescription = ultimaDecisaoSDE?.prescription?.current ?? null;
  const upcoming = ultimaDecisaoSDE?.prescription?.upcoming ?? [];
  const availability = ultimaDecisaoSDE?.availability;
  const operationalCommand = buildCoachOperationalCommand({ prescription, timerRunning: isTimerRunning });
  const onboardingPlan = buildOnboardingPlan({
    competitionSelected: Boolean(configuracao.concursoAlvoId),
    examDateKnown: Boolean(activeConcurso?.dataProva),
    availabilityConfigured: configuracao.disponibilidadeEstudo.weekly.some((day) => day.enabled && day.totalMinutes > 0),
    hasMaterialLocator: biblioteca.some((item) => Boolean(item.privateMaterial)),
    hasQuestionSource: true,
    backupConfigured: Boolean(configuracao.ultimoSyncTimestamp),
  });
  const externalQuestionSourceIsPrimary = Boolean(
    prescription?.questionPractice?.externalSourcePlan?.recommendations.some(
      (item) => item.usage === "PRIMARY"
    )
  );
  const localQuestionSourceIsPrimary = Boolean(
    prescription?.activity === "questoes" &&
      prescription.material &&
      ["COMMENTED_QUESTIONS", "QUESTION_LIST", "SIMULATION"].includes(
        prescription.material.contentKind
      ) &&
      !externalQuestionSourceIsPrimary
  );

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-4 text-zinc-100 sm:p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-blue-300">
                  Seu coach de hoje
                </span>
                <span>{referenceDate}</span>
                <span>v{APP_VERSION} · {APP_RELEASE_CHANNEL}</span>
              </div>
              <h1 className="mt-3 text-xl font-bold text-zinc-100">
                {activeConcurso?.nome ?? "Nenhum concurso selecionado"}
              </h1>
              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-zinc-500">
                O Coach elimina escolhas operacionais desnecessárias, mas mantém incertezas visíveis e nunca transforma estudo em promessa de aprovação.
              </p>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-blue-400" />
                  {configuracao.localProva ?? "Local ainda não definido"}
                </span>
                {activeConcurso?.dataProva && (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-purple-400" />
                    Prova em {new Date(activeConcurso.dataProva).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {concursos.length > 1 && (
                <select
                  value={activeConcursoId ?? ""}
                  onChange={(event) => setActiveConcurso(event.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200"
                >
                  {concursos.map((concurso) => (
                    <option key={concurso.id} value={concurso.id}>
                      {concurso.nome}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </header>

        {!onboardingPlan.readyToStudy && (
          <StatusCard tone="danger" icon={<AlertTriangle className="h-5 w-5" />} title="Configuração mínima ainda incompleta">
            {onboardingPlan.primaryInstruction}
          </StatusCard>
        )}

        {ultimaDecisaoSDE?.status === "INVALID_INPUT" && (
          <StatusCard
            tone="danger"
            icon={<AlertTriangle className="h-5 w-5" />}
            title="O coach não conseguiu calcular uma decisão segura"
          >
            <ul className="space-y-1">
              {ultimaDecisaoSDE.errors.map((error) => (
                <li key={error}>• {error}</li>
              ))}
            </ul>
          </StatusCard>
        )}

        {ultimaDecisaoSDE?.status === "NO_TIME_AVAILABLE" && (
          <StatusCard
            tone="success"
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="Seu estudo planejado de hoje está concluído"
          >
            O dia está configurado como descanso ou todo o tempo disponível já foi registrado. O sistema não cria tarefas apenas para preencher espaço.
          </StatusCard>
        )}

        {prescription && ultimaDecisaoSDE?.status === "SUCCESS" && (
          <section className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-zinc-900/50 to-zinc-950 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-blue-300">
                  <Target className="h-4 w-4" />
                  Faça agora
                </div>
                <h2 className="mt-3 text-2xl font-bold leading-tight text-white">
                  {operationalCommand.headline}
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  {prescription.disciplineName} · {prescription.topicName}
                </p>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-blue-100/80">
                  {operationalCommand.instruction}
                </p>
              </div>

              <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-1">
                <CoachMetric label="Duração" value={formatMinutes(prescription.durationMinutes)} />
                {prescription.questionPractice && (
                  <CoachMetric
                    label="Meta de questões"
                    value={`${prescription.questionPractice.targetQuestions}–${prescription.questionPractice.stretchTargetQuestions}`}
                  />
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-4">
                {prescription.focusGuide && <StudyFocusGuideCard guide={prescription.focusGuide} />}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/55 p-4">
                  <h3 className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                    Como executar
                  </h3>
                  <ol className="mt-3 space-y-3">
                    {prescription.executionSteps.map((step) => (
                      <li key={`${step.passo}-${step.phase}`} className="flex gap-3 text-sm leading-relaxed text-zinc-300">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 text-[10px] font-bold text-blue-300">
                          {step.passo}
                        </span>
                        <span className="flex-1">{step.descricao}</span>
                        <span className="shrink-0 text-[11px] font-mono text-zinc-500">
                          {step.tempoMinutos} min
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>

                {prescription.questionPractice && (
                  <>
                    <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
                      <h3 className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-amber-300">
                        <FileQuestion className="h-4 w-4" />
                        Bateria prescrita
                      </h3>
                      <p className="mt-2 text-sm font-semibold text-zinc-200">
                        Resolva {prescription.questionPractice.targetQuestions} questões; faça até {prescription.questionPractice.stretchTargetQuestions} se mantiver qualidade e tempo.
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                        {prescription.questionPractice.practiceMinutes} min para responder e {prescription.questionPractice.correctionMinutes} min para corrigir, fechar a solução e refazer os erros.
                      </p>
                    </div>
                    {prescription.diagnosticFollowUp && (
                      <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/[0.04] p-4">
                        <h3 className="text-[10px] font-mono uppercase tracking-wider text-cyan-300">
                          O objetivo desta primeira bateria
                        </h3>
                        <p className="mt-2 text-xs leading-relaxed text-zinc-300">
                          Esta é uma triagem de conhecimento prévio, não a rotina inteira do assunto. O aplicativo não inventa questões: use a fonte indicada e responda antes de estudar a teoria.
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
                            <p className="text-[10px] font-mono uppercase text-emerald-300">
                              Se demonstrar conhecimento
                            </p>
                            <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                              {prescription.diagnosticFollowUp.onPass}
                            </p>
                          </div>
                          <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3">
                            <p className="text-[10px] font-mono uppercase text-amber-300">
                              Se a evidência for insuficiente
                            </p>
                            <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                              {prescription.diagnosticFollowUp.onFail}
                            </p>
                          </div>
                        </div>
                        <p className="mt-3 text-[10px] leading-relaxed text-zinc-500">
                          Para adiar teoria: pelo menos {prescription.diagnosticFollowUp.minimumQuestions} questões, {prescription.diagnosticFollowUp.minimumHitRatePercent}% de acerto, nenhum branco, nenhuma consulta e todos os acertos com confiança média ou alta.
                        </p>
                      </div>
                    )}
                    {prescription.questionPractice.externalSourcePlan && (
                      <ExternalQuestionSourcePlanCard plan={prescription.questionPractice.externalSourcePlan} />
                    )}
                  </>
                )}
              </div>

              <div className="space-y-4">
                {prescription.material ? (
                  <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-4">
                    <h3 className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-indigo-300">
                      <BookOpen className="h-4 w-4" />
                      {externalQuestionSourceIsPrimary
                        ? "Material para correção opcional"
                        : localQuestionSourceIsPrimary
                          ? prescription.diagnosticPurpose
                            ? "Fonte das questões · não leia a solução antes"
                            : "Fonte principal das questões"
                          : "Material indicado"}
                    </h3>
                    <p className="mt-2 text-[10px] font-mono uppercase tracking-wider text-indigo-300/80">
                      {privateMaterialSourceRoleLabel(prescription.material.sourceRole)} · {privateMaterialProviderLabel(prescription.material.sourceProvider)}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-200">
                      {prescription.material.sectionTitle}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                      Arquivo: {prescription.material.materialTitle}
                    </p>
                    <p className="mt-2 text-sm font-bold text-indigo-200">
                      Páginas {prescription.material.startPage}–{prescription.material.endPage}
                    </p>
                    {prescription.material.questionBank && (
                      <p className="mt-1 text-[11px] text-zinc-500">
                        Banco identificado: {prescription.material.questionBank}
                      </p>
                    )}
                    {prescription.diagnosticPurpose && localQuestionSourceIsPrimary && (
                      <p className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-2 text-[11px] leading-relaxed text-amber-100/70">
                        Abra diretamente nesta seção e responda as questões ainda não vistas. Não leia teoria, comentários nem gabarito antes da tentativa.
                      </p>
                    )}
                    <PrivatePdfOpenButton material={prescription.material} compact />
                  </div>
                ) : externalQuestionSourceIsPrimary ? null : (
                  <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
                    <h3 className="text-[10px] font-mono uppercase tracking-wider text-amber-300">
                      Material ainda não localizado
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                      A prioridade continua válida, mas o catálogo privado ainda não possui uma seção mapeada com confiança suficiente para esta sessão.
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/55 p-4">
                  <h3 className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                    Registre ao terminar
                  </h3>
                  <ul className="mt-3 space-y-2 text-xs leading-relaxed text-zinc-300">
                    {prescription.completionEvidence.map((item) => (
                      <li key={item} className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4">
                  <h3 className="text-[10px] font-mono uppercase tracking-wider text-cyan-300">
                    Próxima ação
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-300">
                    {prescription.nextAction.afterCompletion}
                  </p>
                  {prescription.nextAction.preview && (
                    <p className="mt-2 text-xs font-semibold text-cyan-200">
                      Prévia: {prescription.nextAction.preview}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-zinc-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <details className="max-w-3xl text-xs text-zinc-400">
                <summary className="cursor-pointer font-semibold text-zinc-300">Por que esta sessão agora?</summary>
                <p className="mt-2 leading-relaxed">{prescription.whyNow}</p>
                {prescription.questionPractice && (
                  <p className="mt-2 leading-relaxed text-zinc-500">
                    {prescription.questionPractice.rationale}
                  </p>
                )}
                <p className="mt-2 text-[10px] font-mono uppercase text-zinc-600">
                  Confiança da decisão: {prescription.confidence} · modo {prescription.decisionReliability.mode}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                  Prontidão: {prescription.executionReadiness.reason}
                </p>
                {prescription.decisionReliability.caveats.map((caveat) => (
                  <p key={caveat} className="mt-2 text-xs leading-relaxed text-amber-300/80">
                    {caveat}
                  </p>
                ))}
              </details>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onAskCoach}
                  className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:border-cyan-500/50"
                >
                  Tirar dúvida com o Coach
                </button>
                <button
                  type="button"
                  onClick={onStartSession}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
                >
                  <Play className="h-4 w-4 fill-current" />
                  {operationalCommand.primaryActionLabel}
                </button>
              </div>
            </div>
          </section>
        )}

        {ultimaDecisaoSDE?.status === "SUCCESS" && !prescription && (
          <StatusCard
            tone="neutral"
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Ainda não há uma sessão executável"
          >
            O SDE calculou o estado, mas o planner não conseguiu formar uma sessão segura dentro da janela disponível.
          </StatusCard>
        )}

        {upcoming.length > 0 && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/25 p-5">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
              Depois desta sessão
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {upcoming.map((item) => (
                <article key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-mono uppercase text-zinc-600">
                        Próxima {item.sequence}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-zinc-200">
                        {ACTIVITY_LABELS[item.activity]} · {item.subtopicName ?? item.topicName}
                      </div>
                      <div className="mt-1 text-[11px] text-zinc-500">{item.disciplineName}</div>
                    </div>
                    <span className="rounded bg-zinc-800 px-2 py-1 text-[10px] font-mono text-zinc-300">
                      {item.durationMinutes} min
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label="Saldo de hoje"
            value={availability ? formatMinutes(availability.remainingMinutes) : "—"}
            detail={availability ? `${formatMinutes(availability.completedMinutes)} já registrados` : "Aguardando cálculo"}
            icon={<Clock3 className="h-5 w-5 text-blue-400" />}
          />
          <MetricCard
            label="Tempo total"
            value={formatMinutes(metrics.totalMinutes)}
            detail={`${metrics.studiedDays} dia(s) com estudo real`}
            icon={<Timer className="h-5 w-5 text-emerald-400" />}
          />
          <MetricCard
            label="Questões registradas"
            value={String(metrics.attempts)}
            detail={metrics.hitRate === null ? "Ainda sem taxa observada" : `${metrics.hitRate}% de acerto observado`}
            icon={<FileQuestion className="h-5 w-5 text-amber-400" />}
          />
          <MetricCard
            label="Estado do coach"
            value={prescription ? "Guiando" : "Aguardando"}
            detail="Ausência de dados nunca vira domínio presumido"
            icon={<ShieldCheck className="h-5 w-5 text-cyan-400" />}
          />
        </section>

        {(ultimaDecisaoSDE?.warnings.length ?? 0) > 0 && (
          <details className="rounded-xl border border-zinc-800 bg-zinc-900/15 p-4 text-xs text-zinc-500">
            <summary className="cursor-pointer font-semibold text-zinc-400">
              Limites e observações metodológicas · não bloqueiam o estudo
            </summary>
            <ul className="mt-3 space-y-2 leading-relaxed">
              {[...(ultimaDecisaoSDE?.warnings ?? []), ...(ultimaDecisaoSDE?.prescription?.warnings ?? [])]
                .map(presentDecisionWarning)
                .map((warning) => (
                  <li key={`${warning.kind}-${warning.text}`} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                    <span className="mr-2 rounded-full border border-zinc-700 px-2 py-0.5 text-[9px] font-mono uppercase text-zinc-400">
                      {warning.label}
                    </span>
                    <span>{warning.text}</span>
                  </li>
                ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}

function CoachMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-32 rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-right">
      <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-zinc-100">{value}</div>
    </div>
  );
}

function MetricCard(props: { label: string; value: string; detail: string; icon: ReactNode }) {
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{props.label}</div>
          <div className="mt-2 text-xl font-bold text-zinc-100">{props.value}</div>
        </div>
        {props.icon}
      </div>
      <div className="mt-2 text-[11px] leading-relaxed text-zinc-500">{props.detail}</div>
    </article>
  );
}

function StatusCard(props: {
  tone: "danger" | "success" | "neutral";
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  const tones = {
    danger: "border-red-500/30 bg-red-500/10 text-red-300",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    neutral: "border-zinc-700 bg-zinc-900/30 text-zinc-300"
  };
  return (
    <section className={`rounded-xl border p-5 ${tones[props.tone]}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{props.icon}</div>
        <div>
          <h2 className="text-sm font-semibold">{props.title}</h2>
          <div className="mt-2 text-xs leading-relaxed text-zinc-400">{props.children}</div>
        </div>
      </div>
    </section>
  );
}
