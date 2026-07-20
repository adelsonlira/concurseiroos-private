import { useState } from "react";
import { Check, Clipboard, ExternalLink } from "lucide-react";
import type { StudyExecutionPacket } from "../core/studyExecution/types";

const ENVIRONMENT_LABELS: Record<StudyExecutionPacket["environment"], string> = {
  notebooklm: "NotebookLM",
  qconcursos: "QConcursos",
  treino_fgv: "Treino FGV",
  internal_material: "Material interno",
  guided_session: "Sessão guiada",
  simulation: "Simulação",
  manual_external: "Ambiente externo informado pelo usuário",
};

export async function copyStudyExecutionPrompt(
  prompt: string,
  clipboard: Pick<Clipboard, "writeText"> = navigator.clipboard,
): Promise<void> {
  await clipboard.writeText(prompt);
}

export default function StudyExecutionPacketView({ packet, compact = false }: { packet: StudyExecutionPacket; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copyPrompt = async () => {
    try {
      await copyStudyExecutionPrompt(packet.prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className={`rounded-xl border border-cyan-500/25 bg-cyan-500/[0.04] ${compact ? "p-4" : "p-5"}`} data-testid="study-execution-packet">
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-300">O que estudar</p>
          <h3 className="mt-2 text-base font-bold text-zinc-100">{packet.contentScope}</h3>
          <p className="mt-2 text-sm text-zinc-300">Objetivo: {packet.objective}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/45 p-3 text-sm text-zinc-300">
          <p><span className="text-zinc-500">Onde estudar:</span> {ENVIRONMENT_LABELS[packet.environment]}</p>
          <p className="mt-1"><span className="text-zinc-500">Duração:</span> {packet.durationMinutes} minutos</p>
          <p className="mt-1"><span className="text-zinc-500">Material:</span> {packet.materialTitle ?? "Não se aplica"}</p>
          <p className="mt-1"><span className="text-zinc-500">Trecho:</span> {packet.sectionsOrPages}</p>
          <p className="mt-1"><span className="text-zinc-500">Correspondência do material:</span> {packet.materialMatchLabel}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/45 p-3">
          <h4 className="text-xs font-semibold text-zinc-200">Como executar</h4>
          <ol className="mt-2 space-y-2 text-xs leading-relaxed text-zinc-300">
            {packet.environmentInstructions.map((step, index) => <li key={`${index}-${step}`}>{index + 1}. {step}</li>)}
          </ol>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/45 p-3 text-xs leading-relaxed text-zinc-300">
          <h4 className="font-semibold text-zinc-200">Critério para concluir</h4>
          <p className="mt-2">{packet.completionCriterion}</p>
          <h4 className="mt-4 font-semibold text-zinc-200">O que registrar</h4>
          <p className="mt-2">{packet.resultCapture.fields.join("; ")}.</p>
          <p className="mt-2 text-cyan-200">{packet.returnInstructions}</p>
        </div>
      </div>

      {packet.notebook && (
        <div className="mt-4 rounded-lg border border-indigo-500/25 bg-indigo-500/[0.04] p-4 text-xs text-zinc-300" data-testid="notebooklm-execution-packet">
          <h4 className="font-semibold text-indigo-200">Configuração do NotebookLM</h4>
          <p className="mt-2">Notebook: {packet.notebook.name}</p>
          <p className="mt-1">Modo: {packet.notebook.mode} · Tamanho: {packet.notebook.responseLength}</p>
          <p className="mt-1">Pesquisa web: {packet.notebook.webSearchAllowed ? "permitida" : "não usar"} · Análise de dados: {packet.notebook.dataAnalysisAllowed ? "permitida" : "não usar"}</p>
          <details className="mt-3 rounded-lg border border-zinc-800 p-3">
            <summary className="cursor-pointer font-semibold text-zinc-200">Ver fontes necessárias</summary>
            <p className="mt-2 text-emerald-200">Selecionar: {packet.selectedSources.join("; ")}</p>
            <p className="mt-2 text-amber-200">Desmarcar: {packet.sourcesToDisable.length ? packet.sourcesToDisable.join("; ") : "nenhuma fonte adicional"}</p>
          </details>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={copyPrompt} className="rounded-lg border border-indigo-400/40 px-3 py-2 font-semibold text-indigo-100">
              {copied ? <Check className="mr-1 inline h-4 w-4" /> : <Clipboard className="mr-1 inline h-4 w-4" />}{copied ? "Prompt copiado" : "Copiar prompt"}
            </button>
            {packet.notebook.url && <a href={packet.notebook.url} target="_blank" rel="noreferrer" className="rounded-lg border border-zinc-700 px-3 py-2 font-semibold text-zinc-200"><ExternalLink className="mr-1 inline h-4 w-4" />Abrir notebook</a>}
            <a href="#/registrar-resultado" className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300">Registrar resultado depois</a>
          </div>
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-black/30 p-3 text-[11px] leading-relaxed text-zinc-300">{packet.prompt}</pre>
          <p className="mt-3 text-amber-200">{packet.notebook.fgvEvidenceBoundary}</p>
        </div>
      )}

      {!packet.notebook && packet.prompt && (
        <details className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/45 p-3 text-xs text-zinc-300">
          <summary className="cursor-pointer font-semibold text-zinc-200">Instrução operacional completa</summary>
          <pre className="mt-3 whitespace-pre-wrap text-[11px] leading-relaxed">{packet.prompt}</pre>
        </details>
      )}

      {packet.limitations.length > 0 && <p className="mt-4 text-xs leading-relaxed text-amber-200">Limitações: {packet.limitations.join(" ")}</p>}
    </section>
  );
}
