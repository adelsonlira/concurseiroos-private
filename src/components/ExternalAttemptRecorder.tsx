import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleX, ClipboardCheck, Save } from "lucide-react";
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

export default function ExternalAttemptRecorder() {
  const {
    activeConcursoId,
    disciplinas,
    assuntos,
    subassuntos,
    registrarTentativaExterna
  } = useConcurseiroStore();

  const availableDisciplines = useMemo(
    () =>
      disciplinas.filter(
        (discipline) => !activeConcursoId || discipline.concursoId === activeConcursoId
      ),
    [activeConcursoId, disciplinas]
  );

  const [disciplinaId, setDisciplinaId] = useState(availableDisciplines[0]?.id ?? "");
  const availableSubjects = useMemo(
    () => assuntos.filter((subject) => subject.disciplinaId === disciplinaId),
    [assuntos, disciplinaId]
  );
  const [assuntoId, setAssuntoId] = useState(availableSubjects[0]?.id ?? "");
  const availableSubtopics = useMemo(
    () => subassuntos.filter((subtopic) => subtopic.assuntoId === assuntoId),
    [subassuntos, assuntoId]
  );
  const [subassuntoId, setSubassuntoId] = useState(availableSubtopics[0]?.id ?? "");
  const [acertou, setAcertou] = useState(true);
  const [tempoSegundos, setTempoSegundos] = useState("120");
  const [fonteExterna, setFonteExterna] = useState("");
  const [nivelConfianca, setNivelConfianca] = useState<AnswerConfidence | "">("");
  const [erroCausa, setErroCausa] = useState<ErrorCause>("DESCONHECIDA");
  const [erroNota, setErroNota] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!availableDisciplines.some((item) => item.id === disciplinaId)) {
      setDisciplinaId(availableDisciplines[0]?.id ?? "");
    }
  }, [availableDisciplines, disciplinaId]);

  useEffect(() => {
    if (!availableSubjects.some((item) => item.id === assuntoId)) {
      setAssuntoId(availableSubjects[0]?.id ?? "");
    }
  }, [availableSubjects, assuntoId]);

  useEffect(() => {
    if (!availableSubtopics.some((item) => item.id === subassuntoId)) {
      setSubassuntoId(availableSubtopics[0]?.id ?? "");
    }
  }, [availableSubtopics, subassuntoId]);

  const handleSubmit = (event: FormEvent) => {
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
      erroCausa: acertou ? undefined : erroCausa,
      erroNota: acertou ? undefined : erroNota
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
          ? " Uma revisão foi programada para amanhã pela política operacional do app."
          : " O SDE usará esta evidência na próxima execução."
      }`
    });
    if (!acertou) setErroNota("");
  };

  return (
    <section className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
      <div className="flex items-start gap-3">
        <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-semibold text-zinc-200">Registrar resultado de questão externa</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
            Registra resultado, classificação, tempo e metadados declarados por você. O aplicativo não copia o enunciado, não infere a causa do erro e não trata confiança como domínio.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 lg:grid-cols-6">
        <label className="flex flex-col gap-1 text-[10px] font-mono uppercase text-zinc-500 lg:col-span-2">
          Disciplina
          <select
            value={disciplinaId}
            onChange={(event) => setDisciplinaId(event.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs normal-case text-zinc-200 outline-none focus:border-blue-500"
            required
          >
            {availableDisciplines.map((item) => (
              <option key={item.id} value={item.id}>{item.nome}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-[10px] font-mono uppercase text-zinc-500 lg:col-span-2">
          Assunto
          <select
            value={assuntoId}
            onChange={(event) => setAssuntoId(event.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs normal-case text-zinc-200 outline-none focus:border-blue-500"
            required
          >
            {availableSubjects.map((item) => (
              <option key={item.id} value={item.id}>{item.nome}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-[10px] font-mono uppercase text-zinc-500 lg:col-span-2">
          Subassunto
          <select
            value={subassuntoId}
            onChange={(event) => setSubassuntoId(event.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs normal-case text-zinc-200 outline-none focus:border-blue-500"
            required
          >
            {availableSubtopics.map((item) => (
              <option key={item.id} value={item.id}>{item.nome}</option>
            ))}
          </select>
        </label>

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

        <label className="flex flex-col gap-1 text-[10px] font-mono uppercase text-zinc-500">
          Tempo (segundos)
          <input
            type="number"
            min="0"
            step="1"
            value={tempoSegundos}
            onChange={(event) => setTempoSegundos(event.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs normal-case text-zinc-200 outline-none focus:border-blue-500"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-[10px] font-mono uppercase text-zinc-500">
          Confiança declarada
          <select
            value={nivelConfianca}
            onChange={(event) => setNivelConfianca(event.target.value as AnswerConfidence | "")}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs normal-case text-zinc-200 outline-none focus:border-blue-500"
          >
            <option value="">Não informar</option>
            <option value="BAIXA">Baixa</option>
            <option value="MEDIA">Média</option>
            <option value="ALTA">Alta</option>
          </select>
        </label>

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

        <div className="flex items-end lg:col-span-1">
          <button
            type="submit"
            disabled={!disciplinaId || !assuntoId || !subassuntoId}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="h-4 w-4" /> Registrar
          </button>
        </div>
      </form>

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
