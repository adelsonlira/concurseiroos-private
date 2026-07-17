import { useMemo, useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import type {
  GuidedQuestionDraft,
  GuidedQuestionResponse,
  LearningAnswerState,
  LearningCycleAssessment
} from "../core/learning/types";
import {
  areGuidedQuestionDraftsComplete,
  toGuidedQuestionResponses
} from "../core/learning/guidedResponsePolicy";
import { useConcurseiroStore } from "../store";

const OPTIONS: Array<{ value: LearningAnswerState; label: string }> = [
  { value: "CORRECT", label: "Resposta correta" },
  { value: "PARTIAL", label: "Resposta parcial" },
  { value: "INCORRECT", label: "Resposta incorreta" },
  { value: "DONT_KNOW", label: "Ainda não sei" }
];

export default function GuidedLearningCloseout(props: {
  prescriptionId: string;
  questions: string[];
  preStudyResponses: GuidedQuestionResponse[];
  onRecorded?: (assessment: LearningCycleAssessment) => void;
}) {
  const registrar = useConcurseiroStore((state) => state.registrarEvidenciaAprendizagemGuiada);
  const [postDrafts, setPostDrafts] = useState<Record<number, GuidedQuestionDraft>>({});
  const [usedMaterial, setUsedMaterial] = useState(false);
  const [doubts, setDoubts] = useState("");
  const [fatigue, setFatigue] = useState<"LOW" | "MEDIUM" | "HIGH">("LOW");
  const [assessment, setAssessment] = useState<LearningCycleAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const complete = useMemo(
    () => areGuidedQuestionDraftsComplete(props.questions, postDrafts),
    [postDrafts, props.questions]
  );

  const submit = () => {
    let postStudyResponses: GuidedQuestionResponse[];
    try {
      postStudyResponses = toGuidedQuestionResponses(props.questions, postDrafts);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Complete a recuperação final.");
      return;
    }

    const result = registrar({
      prescriptionId: props.prescriptionId,
      recordedAt: new Date().toISOString(),
      preStudyResponses: props.preStudyResponses.map((item) => ({ ...item })),
      postStudyResponses,
      usedMaterialDuringFinalRecall: usedMaterial,
      remainingDoubts: doubts.split("\n"),
      selfReportedFatigue: fatigue
    });
    if (!result.success || !result.assessment) {
      setError(result.error ?? "Não foi possível avaliar a recuperação.");
      return;
    }
    setError(null);
    setAssessment(result.assessment);
    props.onRecorded?.(result.assessment);
  };

  if (assessment) {
    const tone = assessment.status === "MASTERED_FOR_NOW" ? "text-emerald-300" : "text-amber-300";
    return (
      <section className="rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.04] p-5">
        <div className="flex items-start gap-3">
          {assessment.status === "MASTERED_FOR_NOW" ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" /> : <RotateCcw className="mt-0.5 h-5 w-5 text-amber-400" />}
          <div>
            <h2 className={`text-sm font-bold ${tone}`}>
              {assessment.status === "MASTERED_FOR_NOW" ? "Recuperação confirmada por enquanto" : "O Coach programará correção antes de avançar"}
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Resultado final: {assessment.postStudyScore === null ? "sem evidência" : `${Math.round(assessment.postStudyScore * 100)}%`} · próxima ação: {assessment.nextAction}.
            </p>
            <ul className="mt-3 space-y-1 text-xs leading-relaxed text-zinc-400">
              {assessment.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
            </ul>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.04] p-5">
      <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-300">Etapa 2 · fechamento obrigatório</div>
      <h2 className="mt-2 text-base font-bold text-zinc-100">Responda novamente sem consulta</h2>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
        Compare sua recuperação final com a tentativa registrada antes do estudo. O sistema não corrige o conteúdo automaticamente; sua autoavaliação deve refletir a conferência feita com o material ou gabarito após tentar sozinho.
      </p>

      <div className="mt-4 space-y-4">
        {props.questions.map((question, index) => {
          const initial = props.preStudyResponses.find((item) => item.questionIndex === index);
          const draft = postDrafts[index] ?? { state: null, answerText: "" };
          return (
            <article key={`${index}-${question}`} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
              <p className="text-xs leading-relaxed text-zinc-300">{index + 1}. {question}</p>
              <details className="mt-2 text-[11px] text-zinc-500">
                <summary className="cursor-pointer">Ver tentativa inicial</summary>
                <p className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-400">
                  {initial?.answerText || (initial?.state === "DONT_KNOW" ? "Ainda não sei" : "Sem texto registrado")}
                </p>
              </details>
              <textarea
                value={draft.answerText}
                onChange={(event) => setPostDrafts((state) => ({ ...state, [index]: { ...draft, answerText: event.target.value } }))}
                placeholder="Escreva sua resposta final sem consultar o material."
                className="mt-3 min-h-20 w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300 outline-none focus:border-cyan-500"
              />
              <select
                value={draft.state ?? ""}
                onChange={(event) => {
                  const nextState = event.target.value as LearningAnswerState;
                  setPostDrafts((state) => ({
                    ...state,
                    [index]: {
                      state: nextState,
                      answerText: nextState === "DONT_KNOW" && !draft.answerText.trim() ? "Ainda não sei" : draft.answerText
                    }
                  }));
                }}
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300"
              >
                <option value="">Como ficou após conferir?</option>
                {OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </article>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-[10px] font-mono uppercase text-zinc-500">Fadiga percebida
          <select value={fatigue} onChange={(event) => setFatigue(event.target.value as typeof fatigue)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs normal-case text-zinc-300">
            <option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option>
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3 text-xs text-zinc-300">
          <input type="checkbox" checked={usedMaterial} onChange={(event) => setUsedMaterial(event.target.checked)} />
          Consultei o material durante a recuperação final
        </label>
      </div>
      <label className="mt-3 block text-[10px] font-mono uppercase text-zinc-500">Dúvidas restantes, uma por linha
        <textarea value={doubts} onChange={(event) => setDoubts(event.target.value)} className="mt-1 min-h-20 w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs normal-case text-zinc-300" />
      </label>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      <button type="button" disabled={!complete} onClick={submit} className="mt-4 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Registrar recuperação e receber próxima ação</button>
    </section>
  );
}
