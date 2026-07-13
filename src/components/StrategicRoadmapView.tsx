import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  FileQuestion,
  ListChecks,
  RefreshCw,
  Route,
  ShieldAlert,
  Target
} from "lucide-react";
import { useConcurseiroStore } from "../store";
import { buildDataprevStrategicRoadmap } from "../integrations/sde/dataprevRoadmapAdapter";
import type {
  EvidenceCoverageState,
  EvidenceRoadmapActionKind
} from "../core/diagnostic/types";

const STATE_LABELS: Record<EvidenceCoverageState, string> = {
  NO_LEARNING_EVIDENCE: "Sem evidência de aprendizagem",
  THEORY_WITHOUT_RETRIEVAL: "Teoria sem recuperação",
  INITIAL_RETRIEVAL_EVIDENCE: "Recuperação inicial",
  INITIAL_QUESTION_EVIDENCE: "Questões: evidência inicial",
  REPEATED_RETRIEVAL_EVIDENCE: "Recuperação repetida",
  REPEATED_QUESTION_EVIDENCE: "Questões em dias distintos",
  ACTIVE_ERROR: "Erro ativo sem recuperação",
  RECOVERY_OBSERVED: "Uma recuperação após erro",
  RECOVERY_REPEATED: "Recuperação repetida após erro"
};

const ACTION_LABELS: Record<EvidenceRoadmapActionKind, string> = {
  NEW_CONTENT: "Avançar conteúdo",
  DIAGNOSTIC_QUESTIONS: "Coletar evidência",
  RECOVERY: "Recuperar erro",
  MAINTENANCE: "Manutenção"
};

function currentDateInTimeZone(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatDate(dateKey: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC"
  }).format(new Date(`${dateKey}T12:00:00.000Z`));
}

function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} min`;
  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return remainder > 0 ? `${hours}h ${remainder}min` : `${hours}h`;
}

export default function StrategicRoadmapView() {
  const configuracao = useConcurseiroStore((state) => state.configuracao);
  const subassuntos = useConcurseiroStore((state) => state.subassuntos);
  const tentativasQuestoes = useConcurseiroStore((state) => state.tentativasQuestoes);
  const sessoesEstudo = useConcurseiroStore((state) => state.sessoesEstudo);
  const flashcards = useConcurseiroStore((state) => state.flashcards);
  const cronogramasRevisao = useConcurseiroStore((state) => state.cronogramasRevisao);
  const [activeSection, setActiveSection] = useState<"evidence" | "week">("evidence");
  const [referenceDate, setReferenceDate] = useState(() =>
    currentDateInTimeZone(configuracao.disponibilidadeEstudo.timeZone)
  );

  const roadmap = useMemo(
    () =>
      buildDataprevStrategicRoadmap(
        {
          configuracao,
          subassuntos,
          tentativasQuestoes,
          sessoesEstudo,
          flashcards,
          cronogramasRevisao
        },
        referenceDate
      ),
    [
      configuracao,
      subassuntos,
      tentativasQuestoes,
      sessoesEstudo,
      flashcards,
      cronogramasRevisao,
      referenceDate
    ]
  );

  const evidence = roadmap.evidence;
  const activeRecovery =
    evidence.countsByState.ACTIVE_ERROR + evidence.countsByState.RECOVERY_OBSERVED;

  return (
    <div className="h-full overflow-y-auto bg-zinc-950">
      <div className="mx-auto max-w-7xl space-y-6 p-6 pb-16">
        <header className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/35 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-blue-400">
              <Route className="h-4 w-4" /> Rota estratégica recalculável
            </div>
            <h1 className="mt-2 text-xl font-semibold text-zinc-100">Evidências e próximos 7 dias</h1>
            <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-zinc-500">
              Separa avanço, diagnóstico e recuperação sem transformar ausência de dados em fraqueza presumida. A prévia semanal não engessa o estudo: o SDE refaz a decisão depois de cada registro real.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[10px] font-mono uppercase text-zinc-600" htmlFor="roadmap-date">
              Referência
            </label>
            <input
              id="roadmap-date"
              type="date"
              value={referenceDate}
              onChange={(event) => setReferenceDate(event.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => setReferenceDate(currentDateInTimeZone(configuracao.disponibilidadeEstudo.timeZone))}
              className="rounded-lg border border-zinc-800 p-2 text-zinc-500 hover:text-zinc-200"
              aria-label="Recalcular a partir de hoje"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex gap-2 rounded-xl border border-zinc-800 bg-zinc-900/30 p-1">
          <SectionButton
            active={activeSection === "evidence"}
            onClick={() => setActiveSection("evidence")}
            icon={<Target className="h-4 w-4" />}
          >
            Mapa de evidências
          </SectionButton>
          <SectionButton
            active={activeSection === "week"}
            onClick={() => setActiveSection("week")}
            icon={<CalendarDays className="h-4 w-4" />}
          >
            Prévia de 7 dias
          </SectionButton>
        </div>

        {activeSection === "evidence" ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <Metric
                label="Subassuntos oficiais"
                value={String(evidence.totalSubtopics)}
                detail="Estrutura ativa do edital"
                icon={<ListChecks className="h-5 w-5 text-blue-400" />}
              />
              <Metric
                label="Teoria confirmada"
                value={String(evidence.descriptiveCoverage.theoryConfirmed)}
                detail="Confirmação explícita, não domínio"
                icon={<BookOpenCheck className="h-5 w-5 text-violet-400" />}
              />
              <Metric
                label="Com questões reais"
                value={String(evidence.descriptiveCoverage.withQuestionEvidence)}
                detail="Ao menos uma tentativa classificada"
                icon={<FileQuestion className="h-5 w-5 text-amber-400" />}
              />
              <Metric
                label="Evidência repetida"
                value={String(evidence.descriptiveCoverage.withRepeatedQuestionEvidence)}
                detail="Questões em dias distintos ou recuperação pós-erro"
                icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />}
              />
              <Metric
                label="Erros sem recuperação"
                value={String(evidence.descriptiveCoverage.activeErrorWithoutRecovery)}
                detail="Erro real sem acerto posterior"
                icon={<ShieldAlert className="h-5 w-5 text-red-400" />}
              />
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
                <h2 className="text-sm font-semibold text-zinc-200">Roteiro de coleta e recuperação</h2>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Fila limitada e descritiva. A execução diária continua sujeita às prioridades e aos guardrails do SDE.
                </p>
                <div className="mt-4 space-y-3">
                  {evidence.roadmap.map((item, index) => (
                    <div key={`${item.kind}-${item.subassuntoId}`} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[9px] font-mono uppercase tracking-wide text-blue-400">
                            {index + 1}. {ACTION_LABELS[item.kind]}
                          </div>
                          <h3 className="mt-1 text-xs font-semibold text-zinc-200">{item.subassuntoNome}</h3>
                          <p className="mt-1 text-[10px] text-zinc-600">
                            {item.disciplinaNome} · {item.assuntoNome}
                          </p>
                        </div>
                        <span className="rounded-full border border-zinc-700 px-2 py-1 text-[9px] text-zinc-500">
                          {STATE_LABELS[item.state]}
                        </span>
                      </div>
                      <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">{item.reason}</p>
                      <p className="mt-2 text-[9px] text-zinc-600">{item.evidenceFacts.join(" · ")}</p>
                    </div>
                  ))}
                  {evidence.roadmap.length === 0 && (
                    <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-600">
                      Não há lacuna acionável detectada com os registros atuais.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                {activeRecovery > 0 && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 text-red-400" />
                      <div>
                        <h2 className="text-sm font-semibold text-red-200">Recuperação pendente observada</h2>
                        <p className="mt-1 text-[11px] leading-relaxed text-red-100/65">
                          {activeRecovery} subassunto(s) possuem erro sem recuperação repetida. Isso não bloqueia todo conteúdo novo; apenas compete por prioridade conforme o SDE.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
                  <h2 className="text-sm font-semibold text-zinc-200">Cobertura por disciplina</h2>
                  <div className="mt-4 space-y-3">
                    {evidence.disciplines.map((discipline) => (
                      <div key={discipline.disciplinaId} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[11px] font-medium text-zinc-300">{discipline.disciplinaNome}</div>
                            <div className="mt-1 text-[9px] text-zinc-600">
                              máximo oficial: {discipline.officialMaxPoints} ponto(s)
                            </div>
                          </div>
                          <div className="text-right text-[9px] font-mono text-zinc-500">
                            {discipline.withQuestionEvidence}/{discipline.totalSubtopics} com questões
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                          <Tiny label="Sem evidência" value={discipline.noLearningEvidence} />
                          <Tiny label="Teoria" value={discipline.theoryConfirmed} />
                          <Tiny label="Erro/recuperação" value={discipline.activeErrorOrRecovery} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <Caveats items={evidence.caveats} />
          </>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <Metric
                label="Janela configurada"
                value={formatMinutes(roadmap.weekly.totalScheduledMinutes)}
                detail={`${roadmap.weekly.activeDays} dia(s) ativos na prévia`}
                icon={<CalendarDays className="h-5 w-5 text-blue-400" />}
              />
              <Metric
                label="Saldo ainda planejável"
                value={formatMinutes(roadmap.weekly.totalRemainingMinutes)}
                detail="Desconta sessões já registradas em cada data"
                icon={<CircleDashed className="h-5 w-5 text-amber-400" />}
              />
              <Metric
                label="Horizonte"
                value="7 dias"
                detail={`${formatDate(roadmap.weekly.referenceDate)} a ${formatDate(roadmap.weekly.endDate)}`}
                icon={<Route className="h-5 w-5 text-violet-400" />}
              />
            </section>

            <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {roadmap.weekly.days.map((day) => (
                <article key={day.date} className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold capitalize text-zinc-200">{formatDate(day.date)}</div>
                      <div className="mt-1 text-[9px] font-mono uppercase text-zinc-600">{day.status.replaceAll("_", " ")}</div>
                    </div>
                    <div className="text-right text-[10px] text-zinc-500">
                      <div>{formatMinutes(day.remainingMinutes)}</div>
                      <div className="mt-0.5 text-[9px] text-zinc-700">de {formatMinutes(day.scheduledMinutes)}</div>
                    </div>
                  </div>

                  {day.primary ? (
                    <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-3">
                      <div className="text-[9px] font-mono uppercase text-blue-400">Objetivo principal provisório</div>
                      <div className="mt-1 text-xs font-semibold text-zinc-200">
                        {day.primary.subassuntoNome ?? day.primary.assuntoNome}
                      </div>
                      <div className="mt-1 text-[10px] text-zinc-600">
                        {day.primary.tipo} · {day.primary.durationMinutes} min · {day.primary.disciplinaNome}
                      </div>
                      <p className="mt-2 line-clamp-3 text-[10px] leading-relaxed text-zinc-500">{day.primary.reason}</p>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-zinc-800 p-4 text-center text-[10px] text-zinc-600">
                      Sem ação planejável para esta data.
                    </div>
                  )}

                  {day.supporting.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {day.supporting.map((item) => (
                        <div key={item.actionId} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/45 px-3 py-2 text-[10px]">
                          <span className="min-w-0 truncate text-zinc-500">{item.subassuntoNome ?? item.assuntoNome}</span>
                          <span className="ml-3 shrink-0 font-mono text-zinc-600">{item.durationMinutes} min</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="mt-3 text-[9px] leading-relaxed text-zinc-700">{day.notes.join(" ")}</p>
                </article>
              ))}
            </section>

            <Caveats items={roadmap.weekly.caveats} />
          </>
        )}
      </div>
    </div>
  );
}

function SectionButton(props: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs transition ${
        props.active ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {props.icon}
      {props.children}
    </button>
  );
}

function Metric(props: { label: string; value: string; detail: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono uppercase tracking-wide text-zinc-600">{props.label}</span>
        {props.icon}
      </div>
      <div className="mt-3 text-2xl font-bold text-zinc-100">{props.value}</div>
      <p className="mt-1 text-[10px] text-zinc-600">{props.detail}</p>
    </div>
  );
}

function Tiny(props: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2">
      <div className="text-sm font-semibold text-zinc-300">{props.value}</div>
      <div className="mt-1 text-[8px] uppercase text-zinc-700">{props.label}</div>
    </div>
  );
}

function Caveats(props: { items: string[] }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-4">
      <h2 className="text-[10px] font-mono uppercase tracking-wide text-zinc-600">Limites de interpretação</h2>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {props.items.map((item) => (
          <p key={item} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-[10px] leading-relaxed text-zinc-600">
            {item}
          </p>
        ))}
      </div>
    </section>
  );
}
