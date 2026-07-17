import type { LucideIcon } from "lucide-react";

export default function OperationalScreenGuide({
  icon: Icon,
  title,
  purpose,
  whenToUse,
  outcome
}: {
  icon: LucideIcon;
  title: string;
  purpose: string;
  whenToUse: string;
  outcome: string;
}) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-400">{purpose}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-400">
            <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1"><strong className="text-zinc-300">Use quando:</strong> {whenToUse}</span>
            <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1"><strong className="text-zinc-300">Saída:</strong> {outcome}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
