import { Database, Filter } from "lucide-react";
import type { ExternalQuestionSourcePlan } from "../core/questions/externalQuestionBanks";

export default function ExternalQuestionSourcePlanCard({
  plan,
  compact = false
}: {
  plan: ExternalQuestionSourcePlan;
  compact?: boolean;
}) {
  const primary = plan.need !== "OPTIONAL_ADDITIONAL_VOLUME";
  const first = plan.recommendations[0];
  if (!first) return null;

  const content = (
    <>
      <p className={`mt-2 leading-relaxed text-zinc-400 ${compact ? "text-[10px]" : "text-xs"}`}>
        {plan.rationale}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {plan.recommendations.map((item) => (
          <span
            key={item.sourceId}
            className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-200"
          >
            {item.displayName}
          </span>
        ))}
      </div>
      {!compact && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-950/55 p-3 text-[11px] leading-relaxed text-zinc-400">
          <Filter className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
          <span>
            Filtre por banca <strong className="text-zinc-200">{first.filters.banca}</strong>, disciplina <strong className="text-zinc-200">{first.filters.discipline}</strong>, assunto <strong className="text-zinc-200">{first.filters.topic}</strong>
            {first.filters.subtopic ? <> e subassunto <strong className="text-zinc-200">{first.filters.subtopic}</strong></> : null}. Exclua anuladas e resolva {first.targetQuestions} questão(ões).
          </span>
        </div>
      )}
    </>
  );

  if (!primary) {
    return (
      <details className="rounded-xl border border-zinc-800 bg-zinc-950/45 p-4">
        <summary className="cursor-pointer text-[10px] font-mono uppercase tracking-wider text-zinc-400">
          Precisa de mais questões? Abrir fontes externas
        </summary>
        <div className="mt-2">{content}</div>
      </details>
    );
  }

  return (
    <div
      className={`rounded-xl border p-4 ${
        primary
          ? "border-cyan-500/25 bg-cyan-500/[0.05]"
          : "border-zinc-800 bg-zinc-950/45"
      }`}
    >
      <div className="flex items-start gap-3">
        <Database className={`mt-0.5 h-4 w-4 shrink-0 ${primary ? "text-cyan-300" : "text-zinc-500"}`} />
        <div className="min-w-0 flex-1">
          <div className={`text-[10px] font-mono uppercase tracking-wider ${primary ? "text-cyan-300" : "text-zinc-500"}`}>
            {primary ? "Banco externo recomendado" : "Plano B para ampliar a bateria"}
          </div>
          {content}
        </div>
      </div>
    </div>
  );
}
