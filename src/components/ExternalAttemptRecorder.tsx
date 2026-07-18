import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Eye,
  FilePenLine,
  History,
  RotateCcw,
  Save,
  Sigma,
} from "lucide-react";
import {
  deriveExternalEvidenceViews,
  EXTERNAL_EVIDENCE_FORM_DEFAULTS,
  summarizeExternalEvidence,
  type ExternalEvidenceConfidence,
  type ExternalEvidenceConsultation,
  type ExternalEvidenceErrorCause,
  type ExternalEvidenceInput,
  type ExternalEvidenceRecord,
  type ExternalEvidenceSource,
  type ExternalEvidenceStatus,
} from "../core/externalEvidence";
import { useConcurseiroStore } from "../store";

const SOURCE_LABELS: Record<ExternalEvidenceSource, string> = {
  qconcursos: "QConcursos",
  treino_fgv: "Treino FGV",
  notebooklm: "NotebookLM",
  simulado_externo: "Simulado externo",
  outra: "Outra",
};

const CONSULTATION_LABELS: Record<ExternalEvidenceConsultation, string> = {
  no: "Não",
  occasionally: "Ocasionalmente",
  yes: "Sim",
  not_applicable: "Não se aplica",
};

const CONFIDENCE_LABELS: Record<ExternalEvidenceConfidence, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  not_informed: "Não informada",
};

const ERROR_CAUSE_LABELS: Record<ExternalEvidenceErrorCause, string> = {
  conceptual_gap: "Lacuna conceitual",
  missing_prerequisite: "Pré-requisito ausente",
  interpretation: "Interpretação",
  application: "Aplicação",
  memory: "Memória",
  distraction: "Distração",
  time_management: "Gestão do tempo",
  guessing: "Chute",
  not_identified: "Não identificada",
};

type RecorderMode = "aggregate" | "individual";
type IndividualOutcome = "correct" | "wrong" | "blank";
type HistoryPeriod = "all" | "7" | "30" | "90";
type HistoryStatus = "all" | ExternalEvidenceStatus;

interface ExternalAttemptRecorderProps {
  defaultDisciplineId?: string;
  defaultTopicId?: string;
  defaultSubtopicId?: string;
  defaultSource?: string;
  defaultQuestionCount?: number;
  defaultTotalTimeMinutes?: number;
  contextId?: string;
  prescriptionId?: string;
  sessionId?: string;
  plannedQuestionCount?: number;
  diagnosticPurpose?: boolean;
  lockScope?: boolean;
  showHistory?: boolean;
  onRecorded?: () => void;
  onReturnToCoach?: () => void;
}

function inferSource(value: string | undefined): ExternalEvidenceSource {
  const normalized = value?.toLocaleLowerCase("pt-BR") ?? "";
  if (normalized.includes("notebook")) return "notebooklm";
  if (normalized.includes("treino fgv")) return "treino_fgv";
  if (normalized.includes("simulado")) return "simulado_externo";
  if (normalized.includes("qconcurso")) return "qconcursos";
  return EXTERNAL_EVIDENCE_FORM_DEFAULTS.source;
}

function integerOrUndefined(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: ExternalEvidenceStatus): string {
  if (status === "superseded") return "Substituído";
  if (status === "voided") return "Anulado";
  return "Ativo";
}

function statusClass(status: ExternalEvidenceStatus): string {
  if (status === "superseded")
    return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  if (status === "voided")
    return "border-red-500/25 bg-red-500/10 text-red-300";
  return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
}

export default function ExternalAttemptRecorder({
  defaultDisciplineId,
  defaultTopicId,
  defaultSubtopicId,
  defaultSource,
  defaultQuestionCount,
  defaultTotalTimeMinutes,
  contextId,
  prescriptionId,
  sessionId,
  plannedQuestionCount,
  diagnosticPurpose = false,
  lockScope = false,
  showHistory = !lockScope,
  onRecorded,
  onReturnToCoach,
}: ExternalAttemptRecorderProps = {}) {
  const {
    activeConcursoId,
    disciplinas,
    assuntos,
    subassuntos,
    externalEvidenceLedger,
    registrarEvidenciaExterna,
    corrigirEvidenciaExterna,
    anularEvidenciaExterna,
  } = useConcurseiroStore();

  const availableDisciplines = useMemo(
    () =>
      disciplinas.filter(
        (item) =>
          !item.isDeleted &&
          (!activeConcursoId || item.concursoId === activeConcursoId),
      ),
    [activeConcursoId, disciplinas],
  );

  const [mode, setMode] = useState<RecorderMode>("aggregate");
  const [source, setSource] = useState<ExternalEvidenceSource>(() =>
    inferSource(defaultSource),
  );
  const [disciplineId, setDisciplineId] = useState(
    defaultDisciplineId ?? availableDisciplines[0]?.id ?? "",
  );
  const availableTopics = useMemo(
    () =>
      assuntos.filter(
        (item) => !item.isDeleted && item.disciplinaId === disciplineId,
      ),
    [assuntos, disciplineId],
  );
  const [topicId, setTopicId] = useState(
    defaultTopicId ?? availableTopics[0]?.id ?? "",
  );
  const availableSubtopics = useMemo(
    () =>
      subassuntos.filter(
        (item) => !item.isDeleted && item.assuntoId === topicId,
      ),
    [subassuntos, topicId],
  );
  const [subtopicId, setSubtopicId] = useState(defaultSubtopicId ?? "");

  const [totalQuestions, setTotalQuestions] = useState(
    defaultQuestionCount ? String(defaultQuestionCount) : "",
  );
  const [correctAnswers, setCorrectAnswers] = useState("");
  const [wrongAnswers, setWrongAnswers] = useState("");
  const [blankAnswers, setBlankAnswers] = useState("0");
  const [blankWasEdited, setBlankWasEdited] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(
    defaultTotalTimeMinutes ? String(defaultTotalTimeMinutes) : "",
  );
  const [consultedMaterial, setConsultedMaterial] =
    useState<ExternalEvidenceConsultation>(
      EXTERNAL_EVIDENCE_FORM_DEFAULTS.consultedMaterial,
    );
  const [primaryErrorCause, setPrimaryErrorCause] =
    useState<ExternalEvidenceErrorCause>("not_identified");
  const [individualOutcome, setIndividualOutcome] =
    useState<IndividualOutcome>("correct");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [examiningBoard, setExaminingBoard] = useState(
    EXTERNAL_EVIDENCE_FORM_DEFAULTS.examiningBoard,
  );
  const [sourceReference, setSourceReference] = useState(defaultSource ?? "");
  const [sourceLabel, setSourceLabel] = useState("");
  const [perceivedConfidence, setPerceivedConfidence] =
    useState<ExternalEvidenceConfidence>(
      EXTERNAL_EVIDENCE_FORM_DEFAULTS.perceivedConfidence,
    );
  const [secondaryErrorCauses, setSecondaryErrorCauses] = useState<
    ExternalEvidenceErrorCause[]
  >([]);
  const [difficultPoints, setDifficultPoints] = useState("");
  const [notes, setNotes] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [correctionTarget, setCorrectionTarget] =
    useState<ExternalEvidenceRecord | null>(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(
    null,
  );

  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>("all");
  const [historySource, setHistorySource] = useState<
    ExternalEvidenceSource | "all"
  >("all");
  const [historyDiscipline, setHistoryDiscipline] = useState("all");
  const [historyTopic, setHistoryTopic] = useState("all");
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>("all");

  useEffect(() => {
    if (defaultDisciplineId) setDisciplineId(defaultDisciplineId);
    if (defaultTopicId) setTopicId(defaultTopicId);
    if (defaultSubtopicId) setSubtopicId(defaultSubtopicId);
    if (defaultQuestionCount && defaultQuestionCount > 0)
      setTotalQuestions(String(defaultQuestionCount));
    if (defaultTotalTimeMinutes && defaultTotalTimeMinutes >= 0)
      setDurationMinutes(String(defaultTotalTimeMinutes));
    if (defaultSource) {
      setSource(inferSource(defaultSource));
      setSourceReference(defaultSource);
    }
  }, [
    defaultDisciplineId,
    defaultTopicId,
    defaultSubtopicId,
    defaultQuestionCount,
    defaultTotalTimeMinutes,
    defaultSource,
  ]);

  useEffect(() => {
    if (!availableDisciplines.some((item) => item.id === disciplineId)) {
      setDisciplineId(availableDisciplines[0]?.id ?? "");
    }
  }, [availableDisciplines, disciplineId]);

  useEffect(() => {
    if (!availableTopics.some((item) => item.id === topicId)) {
      setTopicId(availableTopics[0]?.id ?? "");
    }
  }, [availableTopics, topicId]);

  useEffect(() => {
    if (
      subtopicId &&
      !availableSubtopics.some((item) => item.id === subtopicId)
    ) {
      setSubtopicId("");
    }
  }, [availableSubtopics, subtopicId]);

  useEffect(() => {
    if (mode !== "aggregate" || blankWasEdited) return;
    const total = integerOrUndefined(totalQuestions);
    const correct = integerOrUndefined(correctAnswers);
    const wrong = integerOrUndefined(wrongAnswers);
    if (total === undefined || correct === undefined || wrong === undefined)
      return;
    const inferred = total - correct - wrong;
    if (Number.isInteger(inferred) && inferred >= 0)
      setBlankAnswers(String(inferred));
  }, [mode, totalQuestions, correctAnswers, wrongAnswers, blankWasEdited]);

  const resetForm = (preserveScope = true) => {
    setCorrectionTarget(null);
    setFieldErrors({});
    setFeedback(null);
    setCorrectAnswers("");
    setWrongAnswers("");
    setBlankAnswers("0");
    setBlankWasEdited(false);
    setDurationMinutes(
      defaultTotalTimeMinutes ? String(defaultTotalTimeMinutes) : "",
    );
    setConsultedMaterial(EXTERNAL_EVIDENCE_FORM_DEFAULTS.consultedMaterial);
    setPrimaryErrorCause("not_identified");
    setIndividualOutcome("correct");
    setPerceivedConfidence(EXTERNAL_EVIDENCE_FORM_DEFAULTS.perceivedConfidence);
    setSecondaryErrorCauses([]);
    setDifficultPoints("");
    setNotes("");
    if (!preserveScope) {
      setTotalQuestions(
        defaultQuestionCount ? String(defaultQuestionCount) : "",
      );
      setSource(inferSource(defaultSource));
      setExaminingBoard(EXTERNAL_EVIDENCE_FORM_DEFAULTS.examiningBoard);
      setSourceReference(defaultSource ?? "");
      setSourceLabel("");
    }
  };

  const buildInput = (): ExternalEvidenceInput => {
    const aggregateTotal = integerOrUndefined(totalQuestions);
    const counts =
      mode === "individual"
        ? {
            totalQuestions: 1,
            correctAnswers: individualOutcome === "correct" ? 1 : 0,
            wrongAnswers: individualOutcome === "wrong" ? 1 : 0,
            blankAnswers: individualOutcome === "blank" ? 1 : 0,
          }
        : {
            totalQuestions: aggregateTotal,
            correctAnswers: integerOrUndefined(correctAnswers),
            wrongAnswers: integerOrUndefined(wrongAnswers),
            blankAnswers: integerOrUndefined(blankAnswers),
          };

    const evidenceType =
      source === "simulado_externo"
        ? "external_simulation"
        : source === "notebooklm"
          ? "guided_retrieval"
          : mode === "individual"
            ? "individual_question"
            : "aggregate_question_batch";

    return {
      evidenceType,
      source,
      sourceLabel: source === "outra" ? sourceLabel : undefined,
      sourceReference,
      prescriptionId: prescriptionId ?? contextId,
      sessionId,
      disciplineId,
      topicId,
      subtopicId: subtopicId || undefined,
      syllabusItemId: subtopicId || topicId || undefined,
      examiningBoard,
      ...counts,
      durationMinutes: integerOrUndefined(durationMinutes),
      plannedQuestions: plannedQuestionCount ?? defaultQuestionCount,
      actualQuestions: counts.totalQuestions,
      consultedMaterial,
      perceivedConfidence,
      primaryErrorCause,
      secondaryErrorCauses,
      difficultPoints,
      notes,
      granularity: mode,
    };
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    setFieldErrors({});
    const input = buildInput();
    const result = correctionTarget
      ? corrigirEvidenciaExterna(correctionTarget.evidenceId, input)
      : registrarEvidenciaExterna(input);

    if (!result.success) {
      setFieldErrors(result.fieldErrors ?? {});
      setFeedback({
        type: "error",
        text: result.error ?? "Não foi possível registrar a evidência.",
      });
      return;
    }

    setFeedback({ type: "success", text: "Resultado registrado com sucesso." });
    setCorrectionTarget(null);
    onRecorded?.();
  };

  const startCorrection = (record: ExternalEvidenceRecord) => {
    setCorrectionTarget(record);
    setMode(record.granularity);
    setSource(record.source);
    setSourceLabel(record.sourceLabel ?? "");
    setSourceReference(record.sourceReference ?? "");
    setDisciplineId(record.disciplineId);
    setTopicId(record.topicId);
    setSubtopicId(record.subtopicId ?? "");
    setExaminingBoard(record.examiningBoard ?? "FGV");
    setTotalQuestions(String(record.totalQuestions ?? 1));
    setCorrectAnswers(String(record.correctAnswers ?? 0));
    setWrongAnswers(String(record.wrongAnswers ?? 0));
    setBlankAnswers(String(record.blankAnswers ?? 0));
    setBlankWasEdited(true);
    setDurationMinutes(String(record.durationMinutes ?? 0));
    setConsultedMaterial(record.consultedMaterial);
    setPerceivedConfidence(record.perceivedConfidence);
    setPrimaryErrorCause(record.primaryErrorCause ?? "not_identified");
    setSecondaryErrorCauses(record.secondaryErrorCauses ?? []);
    setDifficultPoints(record.difficultPoints ?? "");
    setNotes(record.notes ?? "");
    if (record.granularity === "individual") {
      setIndividualOutcome(
        record.blankAnswers
          ? "blank"
          : record.correctAnswers
            ? "correct"
            : "wrong",
      );
    }
    setDetailsOpen(true);
    setFeedback({
      type: "success",
      text: "Correção aberta. O registro original será preservado.",
    });
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  const handleVoid = (record: ExternalEvidenceRecord) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Registrar anulação sem excluir o evento original?")
    )
      return;
    const result = anularEvidenciaExterna(
      record.evidenceId,
      "Anulação registrada pelo usuário.",
    );
    setFeedback(
      result.success
        ? {
            type: "success",
            text: "Anulação registrada. O evento original foi preservado.",
          }
        : {
            type: "error",
            text: result.error ?? "Não foi possível registrar a anulação.",
          },
    );
  };

  const views = useMemo(
    () => deriveExternalEvidenceViews(externalEvidenceLedger),
    [externalEvidenceLedger],
  );
  const filteredViews = useMemo(() => {
    const cutoff =
      historyPeriod === "all"
        ? null
        : Date.now() - Number(historyPeriod) * 86_400_000;
    return views
      .filter(({ record, status }) => {
        if (cutoff !== null && new Date(record.recordedAt).getTime() < cutoff)
          return false;
        if (historySource !== "all" && record.source !== historySource)
          return false;
        if (
          historyDiscipline !== "all" &&
          record.disciplineId !== historyDiscipline
        )
          return false;
        if (historyTopic !== "all" && record.topicId !== historyTopic)
          return false;
        if (historyStatus !== "all" && status !== historyStatus) return false;
        return true;
      })
      .sort((left, right) =>
        right.record.recordedAt.localeCompare(left.record.recordedAt),
      );
  }, [
    views,
    historyPeriod,
    historySource,
    historyDiscipline,
    historyTopic,
    historyStatus,
  ]);
  const summaries = useMemo(
    () => summarizeExternalEvidence(externalEvidenceLedger),
    [externalEvidenceLedger],
  );

  const topicsForHistory = useMemo(
    () =>
      assuntos.filter(
        (item) =>
          historyDiscipline === "all" ||
          item.disciplinaId === historyDiscipline,
      ),
    [assuntos, historyDiscipline],
  );

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <div className="flex items-start gap-3">
          <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-zinc-100">
              Registrar resultado
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Registre o que realmente ocorreu fora do ConcurseiroOS. O ledger é
              append-only, sincronizado e permanece em shadow mode: ainda não
              altera mastery, prioridades ou decisões do SDE.
            </p>
          </div>
        </div>

        {!lockScope && (
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-zinc-800 bg-zinc-950/55 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("aggregate");
                setFeedback(null);
              }}
              className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs ${mode === "aggregate" ? "bg-blue-600 text-white" : "text-zinc-500 hover:bg-zinc-900"}`}
            >
              <Sigma className="h-4 w-4" /> Bateria agregada
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("individual");
                setFeedback(null);
              }}
              className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs ${mode === "individual" ? "bg-blue-600 text-white" : "text-zinc-500 hover:bg-zinc-900"}`}
            >
              <CheckCircle2 className="h-4 w-4" /> Questão individual
            </button>
          </div>
        )}

        {correctionTarget && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            <span>
              Correção de {correctionTarget.evidenceId}. O evento anterior não
              será editado.
            </span>
            <button
              type="button"
              onClick={() => resetForm()}
              className="flex items-center gap-1 font-semibold hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Cancelar
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-4"
          data-testid="external-evidence-form"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SelectField
              label="Fonte"
              value={source}
              onChange={(value) => setSource(value as ExternalEvidenceSource)}
              error={fieldErrors.source}
            >
              {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Disciplina"
              value={disciplineId}
              disabled={lockScope && Boolean(defaultDisciplineId)}
              onChange={(value) => {
                setDisciplineId(value);
                setTopicId("");
                setSubtopicId("");
              }}
              error={fieldErrors.disciplineId}
            >
              {availableDisciplines.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Assunto"
              value={topicId}
              disabled={lockScope && Boolean(defaultTopicId)}
              onChange={(value) => {
                setTopicId(value);
                setSubtopicId("");
              }}
              error={fieldErrors.topicId}
            >
              {availableTopics.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Subassunto / item do edital"
              value={subtopicId}
              disabled={lockScope && Boolean(defaultSubtopicId)}
              onChange={setSubtopicId}
              error={fieldErrors.subtopicId ?? fieldErrors.syllabusItemId}
            >
              <option value="">Não informado</option>
              {availableSubtopics.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </SelectField>
          </div>

          {mode === "aggregate" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              <NumberField
                label="Total de questões"
                value={totalQuestions}
                onChange={(value) => {
                  setTotalQuestions(value);
                  setBlankWasEdited(false);
                }}
                error={fieldErrors.totalQuestions}
              />
              <NumberField
                label="Acertos"
                value={correctAnswers}
                onChange={(value) => {
                  setCorrectAnswers(value);
                  setBlankWasEdited(false);
                }}
                error={fieldErrors.correctAnswers}
              />
              <NumberField
                label="Erros"
                value={wrongAnswers}
                onChange={(value) => {
                  setWrongAnswers(value);
                  setBlankWasEdited(false);
                }}
                error={fieldErrors.wrongAnswers}
              />
              <NumberField
                label="Brancos"
                value={blankAnswers}
                onChange={(value) => {
                  setBlankAnswers(value);
                  setBlankWasEdited(true);
                }}
                error={fieldErrors.blankAnswers ?? fieldErrors.counts}
              />
              <NumberField
                label="Duração (min)"
                value={durationMinutes}
                step="0.5"
                onChange={setDurationMinutes}
                error={fieldErrors.durationMinutes}
              />
              <SelectField
                label="Consulta a material?"
                value={consultedMaterial}
                onChange={(value) =>
                  setConsultedMaterial(value as ExternalEvidenceConsultation)
                }
              >
                {Object.entries(CONSULTATION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SelectField
                label="Resultado"
                value={individualOutcome}
                onChange={(value) =>
                  setIndividualOutcome(value as IndividualOutcome)
                }
              >
                <option value="correct">Acerto</option>
                <option value="wrong">Erro</option>
                <option value="blank">Em branco</option>
              </SelectField>
              <NumberField
                label="Duração (min)"
                value={durationMinutes}
                step="0.1"
                onChange={setDurationMinutes}
                error={fieldErrors.durationMinutes}
              />
              <SelectField
                label="Consulta a material?"
                value={consultedMaterial}
                onChange={(value) =>
                  setConsultedMaterial(value as ExternalEvidenceConsultation)
                }
              >
                {Object.entries(CONSULTATION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Principal causa dos erros"
                value={primaryErrorCause}
                onChange={(value) =>
                  setPrimaryErrorCause(value as ExternalEvidenceErrorCause)
                }
              >
                {Object.entries(ERROR_CAUSE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
            </div>
          )}

          {mode === "aggregate" && (
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField
                label="Principal causa dos erros"
                value={primaryErrorCause}
                onChange={(value) =>
                  setPrimaryErrorCause(value as ExternalEvidenceErrorCause)
                }
              >
                {Object.entries(ERROR_CAUSE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
              <div className="flex items-end">
                <p className="pb-2 text-[11px] leading-relaxed text-zinc-600">
                  Um lote gera exatamente um evento agregado. O sistema não cria
                  tentativas individuais sintéticas.
                </p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setDetailsOpen((value) => !value)}
            className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
          >
            {detailsOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}{" "}
            Mais detalhes
          </button>

          {detailsOpen && (
            <div className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 md:grid-cols-2 xl:grid-cols-3">
              <TextField
                label="Banca"
                value={examiningBoard}
                onChange={setExaminingBoard}
              />
              <div>
                <TextField
                  label="Link, caderno ou referência"
                  value={sourceReference}
                  onChange={setSourceReference}
                  error={fieldErrors.sourceReference}
                />
                <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">
                  Guarde somente uma referência curta. Não cole credenciais,
                  cookies, tokens, HTML ou o conteúdo integral da questão.
                </p>
              </div>
              {source === "outra" && (
                <TextField
                  label="Nome da fonte"
                  value={sourceLabel}
                  onChange={setSourceLabel}
                  error={fieldErrors.sourceLabel}
                />
              )}
              <SelectField
                label="Confiança percebida"
                value={perceivedConfidence}
                onChange={(value) =>
                  setPerceivedConfidence(value as ExternalEvidenceConfidence)
                }
              >
                {Object.entries(CONFIDENCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
              <label className="flex flex-col gap-1 text-[10px] font-mono uppercase text-zinc-500 md:col-span-2">
                Causas secundárias
                <div className="grid gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3 sm:grid-cols-2">
                  {Object.entries(ERROR_CAUSE_LABELS)
                    .filter(([value]) => value !== "not_identified")
                    .map(([value, label]) => {
                      const cause = value as ExternalEvidenceErrorCause;
                      return (
                        <label
                          key={value}
                          className="flex items-center gap-2 text-xs normal-case text-zinc-400"
                        >
                          <input
                            type="checkbox"
                            checked={secondaryErrorCauses.includes(cause)}
                            onChange={(event) =>
                              setSecondaryErrorCauses((current) =>
                                event.target.checked
                                  ? [...current, cause]
                                  : current.filter((item) => item !== cause),
                              )
                            }
                          />
                          {label}
                        </label>
                      );
                    })}
                </div>
              </label>
              <TextAreaField
                label="Pontos difíceis"
                value={difficultPoints}
                onChange={setDifficultPoints}
                error={fieldErrors.difficultPoints}
              />
              <TextAreaField
                label="Observações"
                value={notes}
                onChange={setNotes}
                error={fieldErrors.notes}
              />
            </div>
          )}

          {fieldErrors.counts && (
            <p className="text-xs text-red-300">{fieldErrors.counts}</p>
          )}
          {diagnosticPurpose && (
            <p className="text-[11px] text-amber-300">
              Vínculo de diagnóstico legado preservado apenas como contexto;
              esta nova evidência permanece em shadow mode.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
            >
              <Save className="h-4 w-4" />{" "}
              {correctionTarget ? "Salvar correção" : "Salvar"}
            </button>
            {feedback?.type === "success" && (
              <>
                {onReturnToCoach && (
                  <button
                    type="button"
                    onClick={onReturnToCoach}
                    className="text-xs font-semibold text-blue-300 hover:text-blue-200"
                  >
                    Voltar para Hoje — Seu Coach
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => resetForm(false)}
                  className="text-xs font-semibold text-zinc-400 hover:text-zinc-200"
                >
                  Registrar outro resultado
                </button>
              </>
            )}
          </div>

          {feedback && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${feedback.type === "success" ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" : "border-red-500/25 bg-red-500/10 text-red-300"}`}
            >
              {feedback.text}
            </div>
          )}
        </form>
      </section>

      {showHistory && (
        <>
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-zinc-100">
                Histórico de evidências
              </h3>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <SelectField
                label="Período"
                value={historyPeriod}
                onChange={(value) => setHistoryPeriod(value as HistoryPeriod)}
              >
                <option value="all">Todo o período</option>
                <option value="7">7 dias</option>
                <option value="30">30 dias</option>
                <option value="90">90 dias</option>
              </SelectField>
              <SelectField
                label="Fonte"
                value={historySource}
                onChange={(value) =>
                  setHistorySource(value as ExternalEvidenceSource | "all")
                }
              >
                <option value="all">Todas</option>
                {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Disciplina"
                value={historyDiscipline}
                onChange={(value) => {
                  setHistoryDiscipline(value);
                  setHistoryTopic("all");
                }}
              >
                <option value="all">Todas</option>
                {availableDisciplines.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Assunto"
                value={historyTopic}
                onChange={setHistoryTopic}
              >
                <option value="all">Todos</option>
                {topicsForHistory.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Situação"
                value={historyStatus}
                onChange={(value) => setHistoryStatus(value as HistoryStatus)}
              >
                <option value="all">Todas</option>
                <option value="active">Ativos</option>
                <option value="superseded">Substituídos</option>
                <option value="voided">Anulados</option>
              </SelectField>
            </div>

            <div className="mt-4 space-y-2">
              {filteredViews.length === 0 ? (
                <p className="rounded-lg border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-600">
                  Nenhuma evidência encontrada.
                </p>
              ) : (
                filteredViews.map(({ record, status }) => {
                  const discipline =
                    disciplinas.find((item) => item.id === record.disciplineId)
                      ?.nome ?? record.disciplineId;
                  const topic =
                    assuntos.find((item) => item.id === record.topicId)?.nome ??
                    record.topicId;
                  const percentage = record.totalQuestions
                    ? Math.round(
                        ((record.correctAnswers ?? 0) / record.totalQuestions) *
                          10000,
                      ) / 100
                    : 0;
                  const expanded = selectedEvidenceId === record.evidenceId;
                  return (
                    <article
                      key={record.evidenceId}
                      className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-zinc-200">
                              {formatDate(record.recordedAt)}
                            </span>
                            <span
                              className={`rounded border px-2 py-0.5 text-[10px] ${statusClass(status)}`}
                            >
                              {statusLabel(status)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-zinc-400">
                            {SOURCE_LABELS[record.source]} · {discipline} ·{" "}
                            {topic}
                          </p>
                          <p className="mt-1 text-[11px] text-zinc-600">
                            {record.totalQuestions ?? 0} questões ·{" "}
                            {record.correctAnswers ?? 0} acertos ·{" "}
                            {percentage.toFixed(2)}% ·{" "}
                            {record.durationMinutes ?? 0} min · consulta:{" "}
                            {CONSULTATION_LABELS[record.consultedMaterial]}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedEvidenceId(
                                expanded ? null : record.evidenceId,
                              )
                            }
                            className="flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-900"
                          >
                            <Eye className="h-3.5 w-3.5" /> Detalhes
                          </button>
                          {status === "active" && (
                            <>
                              <button
                                type="button"
                                onClick={() => startCorrection(record)}
                                className="flex items-center gap-1 rounded border border-amber-500/30 px-2 py-1 text-[11px] text-amber-300 hover:bg-amber-500/10"
                              >
                                <FilePenLine className="h-3.5 w-3.5" />{" "}
                                Registrar correção
                              </button>
                              <button
                                type="button"
                                onClick={() => handleVoid(record)}
                                className="flex items-center gap-1 rounded border border-red-500/30 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/10"
                              >
                                <Ban className="h-3.5 w-3.5" /> Registrar
                                anulação
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {expanded && (
                        <div className="mt-3 grid gap-2 border-t border-zinc-800 pt-3 text-[11px] text-zinc-500 sm:grid-cols-2 lg:grid-cols-4">
                          <span>ID: {record.evidenceId}</span>
                          <span>Tipo: {record.evidenceType}</span>
                          <span>
                            Autoridade: {record.evidenceQuality.authority}
                          </span>
                          <span>
                            Força: {record.evidenceQuality.measurementStrength}
                          </span>
                          <span>
                            Amostra efetiva:{" "}
                            {record.evidenceQuality.effectiveSampleSize}
                          </span>
                          <span>
                            Confiança:{" "}
                            {CONFIDENCE_LABELS[record.perceivedConfidence]}
                          </span>
                          <span>
                            Prescrição: {record.prescriptionId ?? "—"}
                          </span>
                          <span>Sessão: {record.sessionId ?? "—"}</span>
                          {record.sourceReference && (
                            <span className="sm:col-span-2">
                              Referência: {record.sourceReference}
                            </span>
                          )}
                          {record.difficultPoints && (
                            <span className="sm:col-span-2">
                              Pontos difíceis: {record.difficultPoints}
                            </span>
                          )}
                          {record.notes && (
                            <span className="sm:col-span-2">
                              Observações: {record.notes}
                            </span>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
            <h3 className="text-sm font-semibold text-zinc-100">
              Evidências recentes
            </h3>
            <p className="mt-1 text-xs text-amber-300">
              Resumo descritivo — ainda não altera as decisões do SDE
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="text-[10px] uppercase text-zinc-600">
                  <tr>
                    <th className="px-2 py-2">Disciplina / assunto</th>
                    <th className="px-2 py-2">Baterias</th>
                    <th className="px-2 py-2">Questões</th>
                    <th className="px-2 py-2">A/E/B</th>
                    <th className="px-2 py-2">Percentual bruto</th>
                    <th className="px-2 py-2">Duração</th>
                    <th className="px-2 py-2">Consulta</th>
                    <th className="px-2 py-2">Última evidência</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((row) => (
                    <tr
                      key={`${row.disciplineId}-${row.topicId}`}
                      className="border-t border-zinc-800 text-zinc-400"
                    >
                      <td className="px-2 py-2">
                        <span className="font-semibold text-zinc-300">
                          {disciplinas.find(
                            (item) => item.id === row.disciplineId,
                          )?.nome ?? row.disciplineId}
                        </span>
                        <br />
                        {assuntos.find((item) => item.id === row.topicId)
                          ?.nome ?? row.topicId}
                      </td>
                      <td className="px-2 py-2">{row.batches}</td>
                      <td className="px-2 py-2">{row.totalQuestions}</td>
                      <td className="px-2 py-2">
                        {row.correctAnswers}/{row.wrongAnswers}/
                        {row.blankAnswers}
                      </td>
                      <td className="px-2 py-2">
                        {row.rawPercentage.toFixed(2)}%
                      </td>
                      <td className="px-2 py-2">{row.durationMinutes} min</td>
                      <td className="px-2 py-2">
                        {row.withConsultation} com · {row.withoutConsultation}{" "}
                        sem
                      </td>
                      <td className="px-2 py-2">
                        {formatDate(row.lastEvidenceAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {summaries.length === 0 && (
                <p className="py-4 text-center text-xs text-zinc-600">
                  O resumo aparecerá após o primeiro registro válido.
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SelectField(props: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-[10px] font-mono uppercase text-zinc-500">
      {props.label}
      <select
        value={props.value}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
        className={`rounded-lg border bg-zinc-950 px-3 py-2 text-xs normal-case text-zinc-200 outline-none disabled:opacity-50 ${props.error ? "border-red-500" : "border-zinc-700 focus:border-blue-500"}`}
      >
        {props.children}
      </select>
      {props.error && (
        <span className="text-[10px] normal-case text-red-300">
          {props.error}
        </span>
      )}
    </label>
  );
}

function NumberField(props: {
  label: string;
  value: string;
  step?: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-[10px] font-mono uppercase text-zinc-500">
      {props.label}
      <input
        type="number"
        min="0"
        step={props.step ?? "1"}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className={`rounded-lg border bg-zinc-950 px-3 py-2 text-xs normal-case text-zinc-200 outline-none ${props.error ? "border-red-500" : "border-zinc-700 focus:border-blue-500"}`}
      />
      {props.error && (
        <span className="text-[10px] normal-case text-red-300">
          {props.error}
        </span>
      )}
    </label>
  );
}

function TextField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-[10px] font-mono uppercase text-zinc-500">
      {props.label}
      <input
        type="text"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className={`rounded-lg border bg-zinc-950 px-3 py-2 text-xs normal-case text-zinc-200 outline-none ${props.error ? "border-red-500" : "border-zinc-700 focus:border-blue-500"}`}
      />
      {props.error && (
        <span className="text-[10px] normal-case text-red-300">
          {props.error}
        </span>
      )}
    </label>
  );
}

function TextAreaField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-[10px] font-mono uppercase text-zinc-500">
      {props.label}
      <textarea
        rows={3}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className={`rounded-lg border bg-zinc-950 px-3 py-2 text-xs normal-case text-zinc-200 outline-none ${props.error ? "border-red-500" : "border-zinc-700 focus:border-blue-500"}`}
      />
      {props.error && (
        <span className="text-[10px] normal-case text-red-300">
          {props.error}
        </span>
      )}
    </label>
  );
}
