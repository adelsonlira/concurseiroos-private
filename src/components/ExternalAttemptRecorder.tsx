import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleX,
  ClipboardCheck,
  ListChecks,
  Save,
  Sigma
} from "lucide-react";
import { useConcurseiroStore } from "../store";
import type { AnswerConfidence, ErrorCause } from "../core/review/types";

const ERROR_CAUSE_LABELS: Record<ErrorCause, string> = {
  LACUNA_CONTEUDO: "Lacuna de conteúdo",
  INTERPRETACAO: "Interpretação do enunciado",
  APLICACAO: "Aplicação do conceito",
  MEMORIA: "Falha de memória",
  "DISTRAÇÃO": "Distração",
  PRESSAO_TEMPO: "Pressão de tempo",
  DESCONHECIDA: "Ainda não sei"
};

type RecorderMode = "BATCH" | "INDIVIDUAL";

interface ExternalAttemptRecorderProps {
  defaultDisciplineId?: string;
  defaultTopicId?: string;
  defaultSubtopicId?: string;
  defaultSource?: string;
  defaultQuestionCount?: number;
  defaultTotalTimeMinutes?: number;
  contextId?: string;
  diagnosticPurpose?: boolean;
  lockScope?: boolean;
  onRecorded?: () => void;
}

export default function ExternalAttemptRecorder({
  defaultDisciplineId,
  defaultTopicId,
  defaultSubtopicId,
  defaultSource,
  defaultQuestionCount,
  defaultTotalTimeMinutes,
  contextId,
  diagnosticPurpose = false,
  lockScope = false,
  onRecorded
}: ExternalAttemptRecorderProps = {}) {
  const {
    activeConcursoId,
    disciplinas,
    assuntos,
    subassuntos,
    registrarTentativaExterna,
    registrarBateriaExterna
  } = useConcurseiroStore();

  const availableDisciplines = useMemo(
    () =>
      disciplinas.filter(
        (discipline) => !activeConcursoId || discipline.concursoId === activeConcursoId
      ),
    [activeConcursoId, disciplinas]
  );

  const [mode, setMode] = useState<RecorderMode>(lockScope ? "BATCH" : "INDIVIDUAL");
  const [disciplinaId, setDisciplinaId] = useState(
    defaultDisciplineId ?? availableDisciplines[0]?.id ?? ""
  );
  const availableSubjects = useMemo(
    () => assuntos.filter((subject) => subject.disciplinaId === disciplinaId),
    [assuntos, disciplinaId]
  );
  const [assuntoId, setAssuntoId] = useState(defaultTopicId ?? availableSubjects[0]?.id ?? "");
  const availableSubtopics = useMemo(
    () => subassuntos.filter((subtopic) => subtopic.assuntoId === assuntoId),
    [subassuntos, assuntoId]
  );
  const [subassuntoId, setSubassuntoId] = useState(
    defaultSubtopicId ?? availableSubtopics[0]?.id ?? ""
  );

  const [fonteExterna, setFonteExterna] = useState(defaultSource ?? "");
  const [nivelConfianca, setNivelConfianca] = useState<AnswerConfidence | "">("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [totalQuestoes, setTotalQuestoes] = useState(
    defaultQuestionCount && defaultQuestionCount > 0 ? String(defaultQuestionCount) : ""
  );
  const [totalAcertos, setTotalAcertos] = useState("");
  const [acertosConfiantes, setAcertosConfiantes] = useState("");
  const [totalEmBranco, setTotalEmBranco] = useState("0");
  const [tempoTotalMinutos, setTempoTotalMinutos] = useState(
    defaultTotalTimeMinutes && defaultTotalTimeMinutes > 0
      ? String(defaultTotalTimeMinutes)
      : ""
  );

  const [acertou, setAcertou] = useState(true);
  const [tempoSegundos, setTempoSegundos] = useState("120");
  const [erroCausa, setErroCausa] = useState<ErrorCause>("DESCONHECIDA");
  const [erroNota, setErroNota] = useState("");
  const [consultouMaterial, setConsultouMaterial] = useState(false);

  useEffect(() => {
    if (defaultDisciplineId) setDisciplinaId(defaultDisciplineId);
    if (defaultTopicId) setAssuntoId(defaultTopicId);
    if (defaultSubtopicId) setSubassuntoId(defaultSubtopicId);
    if (defaultSource) setFonteExterna(defaultSource);
    if (defaultQuestionCount && defaultQuestionCount > 0) {
      setTotalQuestoes(String(defaultQuestionCount));
    }
    if (defaultTotalTimeMinutes && defaultTotalTimeMinutes > 0) {
      setTempoTotalMinutos(String(defaultTotalTimeMinutes));
    }
  }, [
    defaultDisciplineId,
    defaultTopicId,
    defaultSubtopicId,
    defaultSource,
    defaultQuestionCount,
    defaultTotalTimeMinutes
  ]);

  useEffect(() => {
    if (lockScope) setMode("BATCH");
  }, [lockScope, contextId]);

  useEffect(() => {
    if (lockScope && defaultDisciplineId) return;
    if (!availableDisciplines.some((item) => item.id === disciplinaId)) {
      setDisciplinaId(availableDisciplines[0]?.id ?? "");
    }
  }, [availableDisciplines, disciplinaId, lockScope, defaultDisciplineId]);

  useEffect(() => {
    if (lockScope && defaultTopicId) return;
    if (!availableSubjects.some((item) => item.id === assuntoId)) {
      setAssuntoId(availableSubjects[0]?.id ?? "");
    }
  }, [availableSubjects, assuntoId, lockScope, defaultTopicId]);

  useEffect(() => {
    if (lockScope && defaultSubtopicId) return;
    if (!availableSubtopics.some((item) => item.id === subassuntoId)) {
      setSubassuntoId(availableSubtopics[0]?.id ?? "");
    }
  }, [availableSubtopics, subassuntoId, lockScope, defaultSubtopicId]);

  const batchTotal = Number(totalQuestoes);
  const batchCorrect = Number(totalAcertos);
  const batchBlank = Number(totalEmBranco || 0);
  const batchConfidentCorrect = Number(acertosConfiantes || 0);
  const batchWrong =
    Number.isInteger(batchTotal) &&
    Number.isInteger(batchCorrect) &&
    Number.isInteger(batchBlank) &&
    batchTotal >= batchCorrect + batchBlank
      ? batchTotal - batchCorrect - batchBlank
      : null;

  const commonScopeIsValid = Boolean(disciplinaId && assuntoId && subassuntoId);

  const handleBatchSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    const result = registrarBateriaExterna({
      disciplinaId,
      assuntoId,
      subassuntoId,
      totalQuestoes: batchTotal,
      acertos: batchCorrect,
      acertosConfiantes: diagnosticPurpose ? batchConfidentCorrect : undefined,
      emBranco: batchBlank,
      tempoTotalSegundos: Number(tempoTotalMinutos) * 60,
      fonteExterna,
      nivelConfianca: nivelConfianca || undefined,
      diagnosticoInicial: diagnosticPurpose,
      consultouMaterial,
      contextId
    });

    if (!result.success) {
      setFeedback({ type: "error", text: result.error ?? "Não foi possível registrar a bateria." });
      return;
    }

    const errors = batchWrong ?? 0;
    const reviewWasScheduled = errors + batchBlank > 0 || nivelConfianca === "BAIXA";
    setFeedback({
      type: "success",
      text: `${batchTotal} questão(ões) registradas: ${batchCorrect} acerto(s), ${errors} erro(s) e ${batchBlank} em branco.${
        reviewWasScheduled
          ? " A recuperação necessária foi incluída no ciclo de revisão."
          : " O SDE usará a bateria na próxima decisão."
      }`
    });
    onRecorded?.();
  };

  const handleIndividualSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    const seconds = Number(tempoSegundos);
    const result = registrarTentativaExterna({
      disciplinaId,
      assuntoId,
      subassuntoId,
      acertou,
      tempoRespostaSegundos: seconds,
      fonteExterna,
      nivelConfianca: nivelConfianca || undefined,
      diagnosticoInicial: diagnosticPurpose,
      consultouMaterial,
      erroCausa: acertou ? undefined : erroCausa,
      erroNota: acertou ? undefined : erroNota,
      contextId
    });

    if (!result.success) {
      setFeedback({ type: "error", text: result.error ?? "Não foi possível registrar a tentativa." });
      return;
    }

    const reviewWasScheduled = !acertou || nivelConfianca === "BAIXA";
    setFeedback({
      type: "success",
      text: `Resultado real registrado como ${acertou ? "acerto" : "erro"}.${
        reviewWasScheduled
          ? " Uma revisão foi programada pela política operacional do app."
          : " O SDE usará esta evidência na próxima execução."
      }`
    });
    if (!acertou) setErroNota("");
    onRecorded?.();
  };

  return (
    <section className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
      <div className="flex items-start gap-3">
        <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-semibold text-zinc-200">
            {lockScope ? "Registrar resultados da bateria" : "Registrar questões externas"}
          </h3>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
            {diagnosticPurpose
              ? "Diagnóstico inicial: resolva sem estudar antes. A teoria só pode ser adiada com pelo menos 10 questões, 85% de acerto e acertos seguros sem consulta."
              : "Use o resumo para baterias grandes. O modo individual permanece disponível quando você quiser registrar tempo, confiança e causa de cada erro separadamente."}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-zinc-800 bg-zinc-950/55 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("BATCH");
            setFeedback(null);
          }}
          className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs transition ${
            mode === "BATCH"
              ? "bg-blue-600 text-white"
              : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
          }`}
        >
          <Sigma className="h-4 w-4" /> Resumo da bateria
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("INDIVIDUAL");
            setFeedback(null);
          }}
          className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs transition ${
            mode === "INDIVIDUAL"
              ? "bg-blue-600 text-white"
              : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
          }`}
        >
          <ListChecks className="h-4 w-4" /> Questão individual
        </button>
      </div>

      {!lockScope && (
        <div className="mt-4 grid gap-3 lg:grid-cols-6">
          <ScopeSelect
            label="Disciplina"
            value={disciplinaId}
            onChange={setDisciplinaId}
            options={availableDisciplines.map((item) => ({ value: item.id, label: item.nome }))}
          />
          <ScopeSelect
            label="Assunto"
            value={assuntoId}
            onChange={setAssuntoId}
            options={availableSubjects.map((item) => ({ value: item.id, label: item.nome }))}
          />
          <ScopeSelect
            label="Subassunto"
            value={subassuntoId}
            onChange={setSubassuntoId}
            options={availableSubtopics.map((item) => ({ value: item.id, label: item.nome }))}
          />
        </div>
      )}

      {mode === "BATCH" ? (
        <form onSubmit={handleBatchSubmit} className="mt-4 grid gap-3 lg:grid-cols-6">
          <NumberField
            label="Total de questões"
            value={totalQuestoes}
            min={1}
            onChange={setTotalQuestoes}
          />
          <NumberField label="Acertos" value={totalAcertos} min={0} onChange={setTotalAcertos} />
          <NumberField
            label="Em branco"
            value={totalEmBranco}
            min={0}
            onChange={setTotalEmBranco}
          />
          <label className="flex flex-col gap-1 text-[10px] font-mono uppercase text-zinc-500">
            Erros calculados
            <div
              className={`rounded-lg border px-3 py-2 text-xs normal-case ${
                batchWrong === null
                  ? "border-red-500/40 bg-red-500/5 text-red-300"
                  : "border-zinc-700 bg-zinc-950 text-zinc-200"
              }`}
            >
              {batchWrong === null ? "Verifique os valores" : batchWrong}
            </div>
          </label>
          <NumberField
            label="Tempo total (min)"
            value={tempoTotalMinutos}
            min={0}
            step="0.5"
            onChange={setTempoTotalMinutos}
          />
          {diagnosticPurpose ? (
            <NumberField
              label="Acertos com segurança"
              value={acertosConfiantes}
              min={0}
              onChange={setAcertosConfiantes}
            />
          ) : (
            <ConfidenceField value={nivelConfianca} onChange={setNivelConfianca} />
          )}

          <label className="flex flex-col gap-1 text-[10px] font-mono uppercase text-zinc-500 lg:col-span-5">
            Fonte opcional
            <input
              type="text"
              value={fonteExterna}
              onChange={(event) => setFonteExterna(event.target.value)}
              placeholder="Ex.: Qconcursos, Estratégia Questões, PDF FGV"
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs normal-case text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-blue-500"
            />
          </label>

          {diagnosticPurpose && (
            <label className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-400 lg:col-span-5">
              <input
                type="checkbox"
                checked={consultouMaterial}
                onChange={(event) => setConsultouMaterial(event.target.checked)}
              />
              Consultei material, solução ou gabarito durante a bateria
            </label>
          )}

          <div className="flex items-end">
            <button
              type="submit"
              disabled={
                !commonScopeIsValid ||
                batchWrong === null ||
                !tempoTotalMinutos ||
                (diagnosticPurpose && (
                  !Number.isInteger(batchConfidentCorrect) ||
                  batchConfidentCorrect < 0 ||
                  batchConfidentCorrect > batchCorrect
                ))
              }
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save className="h-4 w-4" /> Registrar bateria
            </button>
          </div>

          <p className="lg:col-span-6 text-[10px] leading-relaxed text-zinc-600">
            O tempo por questão será estimado pela média do tempo total. O resumo preserva quantidade, acertos, erros, brancos e fonte, mas não inventa causas individuais para os erros.
          </p>
        </form>
      ) : (
        <form onSubmit={handleIndividualSubmit} className="mt-4 grid gap-3 lg:grid-cols-6">
          <div className="flex flex-col gap-1 lg:col-span-2">
            <span className="text-[10px] font-mono uppercase text-zinc-500">Resultado</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAcertou(true)}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                  acertou
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                    : "border-zinc-700 bg-zinc-950 text-zinc-500"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" /> Acerto
              </button>
              <button
                type="button"
                onClick={() => setAcertou(false)}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                  !acertou
                    ? "border-red-500 bg-red-500/15 text-red-300"
                    : "border-zinc-700 bg-zinc-950 text-zinc-500"
                }`}
              >
                <CircleX className="h-4 w-4" /> Erro
              </button>
            </div>
          </div>

          <NumberField
            label="Tempo (segundos)"
            value={tempoSegundos}
            min={0}
            onChange={setTempoSegundos}
          />
          <ConfidenceField value={nivelConfianca} onChange={setNivelConfianca} />

          <label className="flex flex-col gap-1 text-[10px] font-mono uppercase text-zinc-500 lg:col-span-2">
            Fonte opcional
            <input
              type="text"
              value={fonteExterna}
              onChange={(event) => setFonteExterna(event.target.value)}
              placeholder="Ex.: prova FGV 2024, plataforma X"
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs normal-case text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-blue-500"
            />
          </label>

          {!acertou && (
            <>
              <label className="flex flex-col gap-1 text-[10px] font-mono uppercase text-zinc-500 lg:col-span-2">
                Causa declarada do erro
                <select
                  value={erroCausa}
                  onChange={(event) => setErroCausa(event.target.value as ErrorCause)}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs normal-case text-zinc-200 outline-none focus:border-blue-500"
                >
                  {Object.entries(ERROR_CAUSE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-[10px] font-mono uppercase text-zinc-500 lg:col-span-3">
                Nota privada do erro
                <input
                  type="text"
                  maxLength={1000}
                  value={erroNota}
                  onChange={(event) => setErroNota(event.target.value)}
                  placeholder="Ex.: confundi a especificação JPA com a implementação Hibernate"
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs normal-case text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-blue-500"
                />
              </label>
            </>
          )}

          {diagnosticPurpose && (
            <label className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-400 lg:col-span-5">
              <input
                type="checkbox"
                checked={consultouMaterial}
                onChange={(event) => setConsultouMaterial(event.target.checked)}
              />
              Consultei material, solução ou gabarito nesta questão
            </label>
          )}

          <div className="flex items-end lg:col-span-1">
            <button
              type="submit"
              disabled={!commonScopeIsValid || (diagnosticPurpose && !nivelConfianca)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save className="h-4 w-4" /> Registrar
            </button>
          </div>
        </form>
      )}

      {feedback && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
            feedback.type === "success"
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/25 bg-red-500/10 text-red-300"
          }`}
        >
          {feedback.text}
        </div>
      )}
    </section>
  );
}

function ScopeSelect(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="flex flex-col gap-1 text-[10px] font-mono uppercase text-zinc-500 lg:col-span-2">
      {props.label}
      <select
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs normal-case text-zinc-200 outline-none focus:border-blue-500"
        required
      >
        {props.options.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
    </label>
  );
}

function NumberField(props: {
  label: string;
  value: string;
  min: number;
  step?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-[10px] font-mono uppercase text-zinc-500">
      {props.label}
      <input
        type="number"
        min={props.min}
        step={props.step ?? "1"}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs normal-case text-zinc-200 outline-none focus:border-blue-500"
        required
      />
    </label>
  );
}

function ConfidenceField(props: {
  value: AnswerConfidence | "";
  onChange: (value: AnswerConfidence | "") => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-[10px] font-mono uppercase text-zinc-500">
      Confiança geral
      <select
        value={props.value}
        onChange={(event) => props.onChange(event.target.value as AnswerConfidence | "")}
        className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs normal-case text-zinc-200 outline-none focus:border-blue-500"
      >
        <option value="">Não informar</option>
        <option value="BAIXA">Baixa</option>
        <option value="MEDIA">Média</option>
        <option value="ALTA">Alta</option>
      </select>
    </label>
  );
}
