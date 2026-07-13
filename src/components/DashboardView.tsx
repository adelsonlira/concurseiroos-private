import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileQuestion,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Target,
  Timer,
  TrendingUp
} from "lucide-react";
import { APP_RELEASE_CHANNEL, APP_VERSION } from "../config/appMetadata";
import { useConcurseiroStore } from "../store";
import { StudySession } from "../core/sde/planner/plannerTypes";
import { StrategicAction } from "../core/sde/prioritization/types";
import { routePrivateStudyMaterial } from "../core/materials/materialPolicy";
import { DATAPREV_2026_PRIVATE_STUDY_MATERIALS } from "../config/concursos/dataprev-2026-perfil-3/privateStudyMaterials";
import { DATAPREV_2026_ANSWER_KEY_EVIDENCE } from "../config/concursos/dataprev-2026-perfil-3/answerKeyEvidence";
import { DATAPREV_2026_QUESTION_BANK_READINESS } from "../config/concursos/dataprev-2026-perfil-3/questionBankReadiness";

const ACTIVITY_LABELS: Record<StrategicAction["tipo"], string> = {
  teoria: "Teoria",
  questoes: "Questões",
  revisao: "Revisão",
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

function flattenSessions(result: ReturnType<typeof useConcurseiroStore.getState>["ultimaDecisaoSDE"]): StudySession[] {
  if (result?.planner?.status !== "SUCCESS") return [];
  return result.planner.plan.blocos.flatMap((block) => block.sessões);
}

export default function DashboardView() {
  const {
    concursos,
    assuntos,
    tentativasQuestoes,
    sessoesEstudo,
    configuracao,
    activeConcursoId,
    setActiveConcurso,
    ultimaDecisaoSDE,
    executarSDEParaData
  } = useConcurseiroStore();

  const [referenceDate, setReferenceDate] = useState(() =>
    currentDateKey(configuracao.disponibilidadeEstudo.timeZone)
  );

  const activeConcurso =
    concursos.find((item) => item.id === activeConcursoId) ?? concursos[0] ?? null;

  useEffect(() => {
    if (!configuracao.concursoAlvoId || assuntos.length === 0) return;
    executarSDEParaData(referenceDate);
  }, [
    referenceDate,
    configuracao,
    assuntos.length,
    tentativasQuestoes,
    sessoesEstudo,
    executarSDEParaData
  ]);

  const realMetrics = useMemo(() => {
    const totalMinutes = sessoesEstudo.reduce(
      (sum, session) => sum + Math.ceil(session.tempoGastoSegundos / 60),
      0
    );
    const correct = tentativasQuestoes.filter((attempt) => attempt.acertou).length;
    const touchedTopics = new Set<string>();
    for (const attempt of tentativasQuestoes) touchedTopics.add(attempt.assuntoId);
    for (const session of sessoesEstudo) {
      if (session.assuntoId) touchedTopics.add(session.assuntoId);
    }
    const studiedDays = new Set(
      sessoesEstudo.map(
        (session) =>
          session.dataLocal ?? session.dataFim.slice(0, 10)
      )
    ).size;
    return {
      totalMinutes,
      attempts: tentativasQuestoes.length,
      correct,
      hitRate:
        tentativasQuestoes.length > 0
          ? Math.round((correct / tentativasQuestoes.length) * 100)
          : null,
      touchedTopics: touchedTopics.size,
      studiedDays
    };
  }, [sessoesEstudo, tentativasQuestoes]);

  const topAction = ultimaDecisaoSDE?.actions[0] ?? null;
  const topMaterial = useMemo(() => {
    if (!topAction || !configuracao.concursoAlvoId) return null;
    return routePrivateStudyMaterial(DATAPREV_2026_PRIVATE_STUDY_MATERIALS, {
      concursoId: configuracao.concursoAlvoId,
      activity: topAction.tipo,
      disciplineId: topAction.disciplinaId,
      topicId: topAction.assuntoId,
      subtopicId: topAction.subassuntoId
    });
  }, [topAction, configuracao.concursoAlvoId]);
  const plannedSessions = flattenSessions(ultimaDecisaoSDE);
  const availability = ultimaDecisaoSDE?.availability;

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-6 text-zinc-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-mono text-zinc-400">
                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-blue-300">
                  {activeConcurso?.status ?? "SEM CONCURSO"}
                </span>
                <span>Decisão baseada nos dados registrados</span>
                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-400">
                  v{APP_VERSION} · {APP_RELEASE_CHANNEL}
                </span>
              </div>
              <h1 className="text-xl font-bold text-zinc-100">
                {activeConcurso?.nome ?? "Nenhum concurso selecionado"}
              </h1>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-blue-400" />
                  Prova e lotação: {configuracao.localProva ?? "não definido"}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-purple-400" />
                  Prova: 11/10/2026
                </span>
                <span className="flex items-center gap-1.5">
                  <FileQuestion className="h-4 w-4 text-amber-400" />
                  70 questões · 115 pontos
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-[10px] font-mono uppercase tracking-wide text-zinc-500">
                Data do plano
                <input
                  type="date"
                  value={referenceDate}
                  onChange={(event) => setReferenceDate(event.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-blue-500"
                />
              </label>
              <button
                type="button"
                onClick={() => executarSDEParaData(referenceDate)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
              >
                <RefreshCw className="h-4 w-4" />
                Recalcular
              </button>
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
        </section>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            label="Saldo de hoje"
            value={availability ? formatMinutes(availability.remainingMinutes) : "—"}
            detail={
              availability
                ? `${formatMinutes(availability.completedMinutes)} concluídos de ${formatMinutes(availability.scheduledMinutes)}`
                : "Aguardando cálculo"
            }
            icon={<Clock3 className="h-5 w-5 text-blue-400" />}
          />
          <MetricCard
            label="Tempo registrado"
            value={formatMinutes(realMetrics.totalMinutes)}
            detail={`${realMetrics.studiedDays} dia(s) com sessão registrada`}
            icon={<Timer className="h-5 w-5 text-emerald-400" />}
          />
          <MetricCard
            label="Questões reais"
            value={String(realMetrics.attempts)}
            detail={
              realMetrics.hitRate === null
                ? "Sem taxa de acerto calculável"
                : `${realMetrics.correct} acertos · ${realMetrics.hitRate}% observado`
            }
            icon={<FileQuestion className="h-5 w-5 text-amber-400" />}
          />
          <MetricCard
            label="Assuntos com contato"
            value={`${realMetrics.touchedTopics}/${assuntos.length}`}
            detail="Contato registrado, não domínio presumido"
            icon={<BookOpen className="h-5 w-5 text-purple-400" />}
          />
        </section>

        {ultimaDecisaoSDE?.status === "INVALID_INPUT" && (
          <section className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
              <div>
                <h2 className="text-sm font-semibold text-red-300">Não foi possível calcular uma decisão segura</h2>
                <ul className="mt-2 space-y-1 text-xs text-red-200/80">
                  {ultimaDecisaoSDE.errors.map((error) => (
                    <li key={error}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {ultimaDecisaoSDE?.status === "NO_TIME_AVAILABLE" && (
          <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
              <div>
                <h2 className="text-sm font-semibold text-emerald-300">Sem janela planejável nesta data</h2>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  O dia está configurado como descanso ou todo o tempo disponível já foi concluído. O motor não cria atividades para preencher tempo artificialmente.
                </p>
              </div>
            </div>
          </section>
        )}

        {topAction && ultimaDecisaoSDE?.status === "SUCCESS" && (
          <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <article className="rounded-2xl border border-blue-500/25 bg-blue-500/5 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-blue-300">
                    <Target className="h-4 w-4" />
                    Próxima ação recomendada
                  </div>
                  <h2 className="mt-3 text-lg font-bold text-zinc-100">
                    {ACTIVITY_LABELS[topAction.tipo]} · {topAction.assuntoNome}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-400">
                    {topAction.disciplinaNome}
                    {topAction.subassuntoNome ? ` · ${topAction.subassuntoNome}` : ""}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-right">
                  <div className="text-[9px] font-mono uppercase text-zinc-500">Duração operacional</div>
                  <div className="mt-1 text-sm font-bold text-zinc-100">
                    {topAction.estimatedDurationMinutes === null
                      ? "não informada"
                      : formatMinutes(topAction.estimatedDurationMinutes)}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <h3 className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Por que agora</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                  {topAction.justificativaXAI.porQue}
                </p>
              </div>

              {topMaterial && (
                <div className="mt-4 rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-4">
                  <h3 className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-indigo-300">
                    <BookOpen className="h-4 w-4" />
                    Onde estudar no material privado
                  </h3>
                  <p className="mt-2 text-xs font-semibold text-zinc-200">
                    {topMaterial.materialTitle}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                    {topMaterial.sectionTitle} · páginas {topMaterial.startPage}–{topMaterial.endPage}
                    {topMaterial.questionBank ? ` · questões ${topMaterial.questionBank}` : ""}
                  </p>
                  <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
                    Localizador pedagógico. O conteúdo permanece na cópia privada do usuário e não participa do cálculo de prioridade.
                  </p>
                </div>
              )}

              {topAction.rankingContext?.isTied && (
                <div className="mt-4 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                  <h3 className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-sky-300">
                    <AlertTriangle className="h-4 w-4" />
                    Empate estratégico
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                    {topAction.rankingContext.note}
                  </p>
                </div>
              )}

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <InfoBlock
                  title="Confiança"
                  text={topAction.justificativaXAI.nivelConfianca}
                  icon={<ShieldCheck className="h-4 w-4 text-emerald-400" />}
                />
                <InfoBlock
                  title="Camada constitucional"
                  text={topAction.camadaConstitucional}
                  icon={<TrendingUp className="h-4 w-4 text-purple-400" />}
                />
              </div>

              {topAction.justificativaXAI.dadosAusentes.length > 0 && (
                <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <h3 className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                    Dados ainda ausentes
                  </h3>
                  <ul className="mt-2 space-y-1 text-xs leading-relaxed text-zinc-400">
                    {topAction.justificativaXAI.dadosAusentes.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </article>

            <article className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-5">
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-300">
                Plano operacional do dia
              </h2>
              {plannedSessions.length === 0 ? (
                <p className="mt-4 text-xs leading-relaxed text-zinc-500">
                  O planner não encontrou sessões válidas para a janela disponível.
                </p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {plannedSessions.map((session) => (
                    <li
                      key={session.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-mono text-zinc-500">
                            SESSÃO {session.sequencia}
                          </div>
                          <div className="mt-1 text-xs font-semibold text-zinc-200">
                            {session.tipo === "descanso"
                              ? "Pausa cognitiva"
                              : `${ACTIVITY_LABELS[session.tipo]} · ${session.assuntoNome}`}
                          </div>
                          {session.tipo !== "descanso" && (
                            <div className="mt-1 text-[11px] text-zinc-500">
                              {session.disciplinaNome}
                            </div>
                          )}
                        </div>
                        <span className="shrink-0 rounded bg-zinc-800 px-2 py-1 text-[10px] font-mono text-zinc-300">
                          {session.tempoMinutos} min
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </article>
          </section>
        )}

        {ultimaDecisaoSDE && ultimaDecisaoSDE.warnings.length > 0 && (
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-5">
            <h2 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
              Limitações declaradas pelo motor
            </h2>
            <ul className="mt-3 grid gap-2 text-xs leading-relaxed text-zinc-500 lg:grid-cols-2">
              {ultimaDecisaoSDE.warnings.map((warning) => (
                <li key={warning} className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-3">
                  {warning}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
            <div>
              <h2 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-300">
                Cobertura de gabaritos do corpus
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                {DATAPREV_2026_ANSWER_KEY_EVIDENCE.corpusCoverage.recordsWithAnswerKey} registros possuem correspondência exata de caderno em {DATAPREV_2026_ANSWER_KEY_EVIDENCE.exactMatches} provas.
                São {DATAPREV_2026_ANSWER_KEY_EVIDENCE.definitive} gabaritos definitivos, {DATAPREV_2026_ANSWER_KEY_EVIDENCE.preliminary} preliminares e {DATAPREV_2026_ANSWER_KEY_EVIDENCE.publishedUnqualified} sem qualificação explícita. {DATAPREV_2026_ANSWER_KEY_EVIDENCE.officialUserSupplied} foram substituídos por publicações oficiais fornecidas pelo usuário.
              </p>
              <p className="mt-1 text-[10px] text-zinc-600">
                Após os gates de revisão temática, {DATAPREV_2026_QUESTION_BANK_READINESS.manuallyReviewedAnalyticEligibleRecords} questões únicas estão aptas para análise descritiva auditada. Nenhuma foi liberada como questão interna porque o corpus derivado ainda não contém enunciado e alternativas completos.
              </p>
              {DATAPREV_2026_ANSWER_KEY_EVIDENCE.headerStatusMismatches > 0 && (
                <p className="mt-1 text-[10px] text-amber-500/80">
                  Há {DATAPREV_2026_ANSWER_KEY_EVIDENCE.headerStatusMismatches} publicação oficial com divergência editorial entre a classificação da página da FGV e o cabeçalho interno do PDF; a divergência permanece registrada na proveniência.
                </p>
              )}
              <p className="mt-1 text-[10px] text-zinc-600">
                Gabaritos e questões aptas para análise não produzem incidência estratégica por si só.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-4 text-[11px] leading-relaxed text-zinc-500">
          O dashboard apresenta somente registros reais e resultados calculados pelo SDE. Ausência de dados não é convertida em rendimento zero, domínio, probabilidade de aprovação ou ganho estimado de pontos.
        </section>
      </div>
    </div>
  );
}

function MetricCard(props: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            {props.label}
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-100">{props.value}</div>
        </div>
        {props.icon}
      </div>
      <div className="mt-2 text-[11px] leading-relaxed text-zinc-500">{props.detail}</div>
    </article>
  );
}

function InfoBlock(props: { title: string; text: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
        {props.icon}
        {props.title}
      </div>
      <div className="mt-2 text-xs font-semibold text-zinc-300">{props.text}</div>
    </div>
  );
}
