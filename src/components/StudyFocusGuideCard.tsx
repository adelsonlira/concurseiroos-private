import { BrainCircuit, CheckCircle2, Eye, HelpCircle } from "lucide-react";
import type { StudyFocusGuide } from "../core/prescription/studyFocusGuide";

export default function StudyFocusGuideCard({ guide }: { guide: StudyFocusGuide }) {
  return (
    <section className="rounded-xl border border-cyan-500/25 bg-cyan-500/[0.04] p-4">
      <div className="flex items-start gap-3">
        <BrainCircuit className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-cyan-300">
            Guia de foco do coach
          </p>
          <h3 className="mt-1 font-semibold text-zinc-100">{guide.title}</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{guide.instruction}</p>
          <p className="mt-2 text-[11px] leading-5 text-zinc-500">
            Estas perguntas treinam recuperação ativa e direcionam a leitura. Elas não substituem a bateria objetiva com questões e gabarito, que aparece em uma sessão própria de Questões quando o SDE a tornar elegível.
          </p>
        </div>
      </div>

      <ol className="mt-4 space-y-2">
        {guide.questions.map((question, index) => (
          <li key={question} className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-950/55 p-3 text-sm leading-6 text-zinc-200">
            <span className="font-mono text-cyan-400">{index + 1}.</span>
            <span>{question}</span>
          </li>
        ))}
      </ol>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/45 p-3">
          <h4 className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
            <Eye className="h-4 w-4 text-amber-400" /> Atenção durante o estudo
          </h4>
          <ul className="mt-2 space-y-1.5 text-xs leading-5 text-zinc-400">
            {guide.attentionPoints.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/45 p-3">
          <h4 className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Quando considerar concluído
          </h4>
          <ul className="mt-2 space-y-1.5 text-xs leading-5 text-zinc-400">
            {guide.successCriteria.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </div>
      </div>

      <details className="mt-3 text-xs text-zinc-500">
        <summary className="flex cursor-pointer items-center gap-2 text-zinc-400">
          <HelpCircle className="h-3.5 w-3.5" /> Base e limites desta orientação
        </summary>
        <div className="mt-2 space-y-1.5 pl-5 leading-5">
          {guide.evidenceLabel && <p>Referência: {guide.evidenceLabel}.</p>}
          {guide.limitations.map((item) => <p key={item}>• {item}</p>)}
        </div>
      </details>
    </section>
  );
}
