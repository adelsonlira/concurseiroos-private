import { BrainCircuit, CheckCircle2 } from "lucide-react";
import type { GuidedQuestionDraft, LearningAnswerState } from "../core/learning/types";
import { areGuidedQuestionDraftsComplete } from "../core/learning/guidedResponsePolicy";

const OPTIONS: Array<{ value: LearningAnswerState; label: string }> = [
  { value: "CORRECT", label: "Consigo responder com segurança" },
  { value: "PARTIAL", label: "Lembro apenas parte" },
  { value: "INCORRECT", label: "Minha resposta provavelmente está incorreta" },
  { value: "DONT_KNOW", label: "Ainda não sei" }
];

export default function GuidedLearningActivation(props: {
  questions: string[];
  drafts: Record<number, GuidedQuestionDraft>;
  onChange: (questionIndex: number, draft: GuidedQuestionDraft) => void;
}) {
  const complete = areGuidedQuestionDraftsComplete(props.questions, props.drafts);

  return (
    <section className="rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.04] p-5">
      <div className="flex items-start gap-3">
        <BrainCircuit className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-300">Etapa 1 · antes de iniciar o cronômetro</div>
          <h2 className="mt-2 text-base font-bold text-zinc-100">Registre sua tentativa inicial</h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Escreva o que consegue recuperar agora. “Ainda não sei” é uma resposta válida. Estas são perguntas de recuperação ativa, não questões de múltipla escolha com gabarito automático.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {props.questions.map((question, index) => {
          const draft = props.drafts[index] ?? { state: null, answerText: "" };
          return (
            <article key={`${index}-${question}`} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
              <p className="text-xs leading-relaxed text-zinc-300">{index + 1}. {question}</p>
              <textarea
                value={draft.answerText}
                onChange={(event) => props.onChange(index, { ...draft, answerText: event.target.value })}
                placeholder="Digite sua resposta inicial ou use ‘Ainda não sei’."
                className="mt-3 min-h-20 w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300 outline-none focus:border-cyan-500"
              />
              <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto]">
                <select
                  value={draft.state ?? ""}
                  onChange={(event) => {
                    const state = event.target.value as LearningAnswerState;
                    props.onChange(index, {
                      state,
                      answerText: state === "DONT_KNOW" && !draft.answerText.trim() ? "Ainda não sei" : draft.answerText
                    });
                  }}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300"
                >
                  <option value="">Como avalio esta tentativa?</option>
                  {OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => props.onChange(index, { state: "DONT_KNOW", answerText: "Ainda não sei" })}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-400 hover:border-cyan-500/50 hover:text-cyan-300"
                >
                  Ainda não sei
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className={`mt-4 flex items-center gap-2 text-xs ${complete ? "text-emerald-300" : "text-amber-300"}`}>
        <CheckCircle2 className="h-4 w-4" />
        {complete ? "Tentativa inicial completa. A sessão pode começar." : "Registre uma tentativa em todas as perguntas para iniciar a sessão."}
      </div>
    </section>
  );
}
