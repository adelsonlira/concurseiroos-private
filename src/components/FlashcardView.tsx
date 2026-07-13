import { useEffect, useState } from "react";
import { CheckCircle2, Layers, Plus, Trash2 } from "lucide-react";
import { useConcurseiroStore } from "../store";
import { CardStatus, type Flashcard } from "../types";
import type { FlashcardRetrievalPerformance } from "../core/flashcards/types";

const PERFORMANCE_LABELS: Record<FlashcardRetrievalPerformance, string> = {
  FAILED: "Não recuperei",
  EFFORTFUL: "Com esforço",
  FLUENT: "Com fluência",
};

export default function FlashcardView() {
  const {
    flashcards,
    assuntos,
    addFlashcard,
    reviewFlashcard,
    deleteFlashcard,
  } = useConcurseiroStore();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [selectedAssId, setSelectedAssId] = useState("");

  const now = new Date();
  const dueCards = flashcards.filter(
    (card) =>
      new Date(card.proximaRevisaoData) <= now || card.status === CardStatus.NEW,
  );
  const safeIndex = dueCards.length === 0 ? 0 : Math.min(currentIdx, dueCards.length - 1);
  const activeCard: Flashcard | undefined = dueCards[safeIndex];

  const handleRateCard = (performance: FlashcardRetrievalPerformance) => {
    if (!activeCard) return;
    reviewFlashcard(activeCard.id, performance);
    setIsFlipped(false);
    setCurrentIdx(0);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const tagName = document.activeElement?.tagName;
      if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
        return;
      }
      if (!activeCard) return;

      if (event.code === "Space") {
        event.preventDefault();
        setIsFlipped((previous) => !previous);
        return;
      }
      if (!isFlipped) return;

      if (event.key === "1") handleRateCard("FAILED");
      if (event.key === "2") handleRateCard("EFFORTFUL");
      if (event.key === "3") handleRateCard("FLUENT");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCard, isFlipped]);

  const handleCreateCard = () => {
    if (!newQuestion.trim() || !newAnswer.trim() || !selectedAssId) return;
    const timestamp = new Date().toISOString();
    const newCard: Flashcard = {
      id: `card-${Date.now()}`,
      assuntoId: selectedAssId,
      pergunta: newQuestion.trim(),
      resposta: newAnswer.trim(),
      status: CardStatus.NEW,
      intervaloDias: 1,
      fatorFacilidade: 2.5,
      repeticoes: 0,
      proximaRevisaoData: timestamp,
      politicaVersao: "HYBRID_ADAPTIVE_FLASHCARD_V1",
      estabilidadeObservadaDias: 1,
      recuperacoesIndependentesConsecutivas: 0,
      falhasRecuperacao: 0,
      historicoRecuperacoes: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    addFlashcard(newCard);
    setNewQuestion("");
    setNewAnswer("");
    setShowAddForm(false);
  };

  return (
    <div
      className="flex-1 p-6 overflow-y-auto bg-zinc-950 flex flex-col gap-6"
      id="flashcards-viewport"
    >
      <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-blue-500" />
          <h2 className="text-sm font-semibold text-zinc-300 font-mono tracking-wide uppercase">
            Recuperação ativa por flashcards
          </h2>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Novo card</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Metric label="PENDENTES AGORA" value={`${dueCards.length} cards`} accent="amber" />
        <Metric label="TOTAL NO DECK" value={`${flashcards.length} cards`} />
        <Metric label="POLÍTICA OPERACIONAL" value="Híbrida adaptativa" accent="blue" />
      </div>

      <div className="rounded-lg border border-blue-500/15 bg-blue-500/5 p-3 text-[11px] leading-relaxed text-zinc-400">
        Responda antes de revelar o verso. A avaliação informa apenas o que ocorreu
        nesta recuperação. O próximo intervalo considera o histórico observado e a
        proximidade da prova; não representa domínio permanente nem segue uma escada
        universal de datas.
      </div>

      <div className="max-w-xl mx-auto w-full py-4">
        {activeCard ? (
          <div className="flex flex-col gap-4">
            <div
              onClick={() => setIsFlipped((previous) => !previous)}
              className="w-full h-80 relative cursor-pointer select-none"
              style={{ perspective: "1000px" }}
            >
              <div
                className={`w-full h-full rounded-2xl border transition-all duration-500 flex flex-col p-6 justify-between ${
                  isFlipped
                    ? "bg-zinc-900 border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.15)]"
                    : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700"
                }`}
                style={{
                  transformStyle: "preserve-3d",
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {!isFlipped ? (
                  <div className="h-full flex flex-col justify-between" style={{ backfaceVisibility: "hidden" }}>
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Pergunta</span>
                      <span className="text-[10px] font-mono text-blue-400">Responda antes de revelar</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center py-4">
                      <p className="text-sm font-semibold tracking-wide text-zinc-100 text-center leading-relaxed whitespace-pre-wrap">
                        {activeCard.pergunta}
                      </p>
                    </div>
                    <div className="text-center text-[10px] text-zinc-600 font-mono">
                      [ESPAÇO para virar]
                    </div>
                  </div>
                ) : (
                  <div
                    className="h-full flex flex-col justify-between"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                  >
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Resposta</span>
                      <span className="text-[10px] font-mono text-emerald-400">Compare com sua resposta mental</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center py-4">
                      <p className="text-xs text-zinc-300 text-center leading-relaxed whitespace-pre-wrap">
                        {activeCard.resposta}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center text-[10px] text-zinc-500 font-mono gap-4">
                      <span>Intervalo atual: {activeCard.intervaloDias}d</span>
                      <span>Recuperações consecutivas: {activeCard.recuperacoesIndependentesConsecutivas ?? activeCard.repeticoes}</span>
                      <span>Falhas: {activeCard.falhasRecuperacao ?? 0}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {isFlipped && (
              <div className="flex flex-col gap-2 mt-2 animate-fadeIn">
                <span className="text-[10px] text-zinc-500 text-center font-mono uppercase">
                  O que ocorreu antes de consultar a resposta?
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <PerformanceButton
                    label="NÃO RECUPEREI"
                    shortcut="1"
                    tone="red"
                    onClick={() => handleRateCard("FAILED")}
                  />
                  <PerformanceButton
                    label="COM ESFORÇO"
                    shortcut="2"
                    tone="blue"
                    onClick={() => handleRateCard("EFFORTFUL")}
                  />
                  <PerformanceButton
                    label="COM FLUÊNCIA"
                    shortcut="3"
                    tone="emerald"
                    onClick={() => handleRateCard("FLUENT")}
                  />
                </div>
              </div>
            )}

            <div className="text-[11px] text-center text-zinc-600 font-mono mt-2">
              Card {safeIndex + 1} de {dueCards.length} pendentes
            </div>
          </div>
        ) : (
          <div className="py-12 border border-dashed border-zinc-900 rounded-2xl bg-zinc-900/5 text-center flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <span className="text-xs font-bold text-zinc-300 mt-2">Nenhum flashcard pendente</span>
            <p className="text-[10px] text-zinc-500 max-w-xs leading-relaxed">
              Os próximos contatos serão liberados pelas datas adaptativas. Continue
              avançando no edital e registre apenas recuperações realmente executadas.
            </p>
          </div>
        )}
      </div>

      <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-900/10 flex flex-col gap-4">
        <div>
          <h3 className="text-xs font-semibold text-zinc-400 font-mono tracking-wide uppercase">Deck completo</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">Histórico operacional local, sem nota artificial de domínio.</p>
        </div>
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
          {flashcards.map((card) => {
            const isDue = new Date(card.proximaRevisaoData) <= now || card.status === CardStatus.NEW;
            return (
              <div key={card.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/30 border border-zinc-900 text-xs">
                <div className="flex flex-col gap-1 truncate max-w-md">
                  <span className="text-zinc-200 font-medium truncate">{card.pergunta}</span>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
                    <span className={`px-1.5 rounded font-mono text-[9px] ${isDue ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-zinc-800 text-zinc-400"}`}>
                      {isDue ? "Pendente" : "Agendado"}
                    </span>
                    <span>Intervalo: {card.intervaloDias}d</span>
                    <span>•</span>
                    <span>Recuperações: {card.recuperacoesIndependentesConsecutivas ?? card.repeticoes}</span>
                    {card.ultimoResultadoRecuperacao && (
                      <>
                        <span>•</span>
                        <span>Último: {PERFORMANCE_LABELS[card.ultimoResultadoRecuperacao]}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteFlashcard(card.id)}
                  className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors cursor-pointer"
                  aria-label="Excluir flashcard"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
          {flashcards.length === 0 && (
            <div className="py-8 text-center text-xs text-zinc-500 font-mono border border-dashed border-zinc-900 rounded-lg">
              Nenhum card cadastrado.
            </div>
          )}
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col gap-4 shadow-2xl">
            <div>
              <h4 className="text-sm font-semibold text-zinc-200 font-mono">Criar novo flashcard</h4>
              <p className="text-[11px] text-zinc-500 mt-0.5">Prefira uma pergunta curta, específica e verificável.</p>
            </div>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-[10px] text-zinc-400 font-mono">
                VINCULAR AO ASSUNTO
                <select
                  value={selectedAssId}
                  onChange={(event) => setSelectedAssId(event.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 rounded px-2.5 py-2"
                >
                  <option value="">Selecione um assunto...</option>
                  {assuntos.map((assunto) => (
                    <option key={assunto.id} value={assunto.id}>{assunto.nome}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-[10px] text-zinc-400 font-mono">
                PERGUNTA
                <textarea
                  value={newQuestion}
                  onChange={(event) => setNewQuestion(event.target.value)}
                  className="h-20 bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-200 outline-none focus:border-blue-500"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[10px] text-zinc-400 font-mono">
                RESPOSTA
                <textarea
                  value={newAnswer}
                  onChange={(event) => setNewAnswer(event.target.value)}
                  className="h-24 bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-200 outline-none focus:border-blue-500"
                />
              </label>
            </div>
            <div className="flex items-center justify-end gap-2.5 mt-2">
              <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 rounded text-zinc-400 hover:text-zinc-200 text-xs cursor-pointer">
                Cancelar
              </button>
              <button
                onClick={handleCreateCard}
                disabled={!newQuestion.trim() || !newAnswer.trim() || !selectedAssId}
                className="px-4 py-1.5 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 cursor-pointer disabled:opacity-40"
              >
                Criar card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, accent = "zinc" }: { label: string; value: string; accent?: "zinc" | "amber" | "blue" }) {
  const valueClass = accent === "amber" ? "text-amber-500" : accent === "blue" ? "text-blue-400" : "text-zinc-300";
  return (
    <div className="p-3.5 rounded-lg bg-zinc-900/20 border border-zinc-900/60 text-xs flex flex-col gap-1">
      <span className="text-zinc-500 font-mono">{label}</span>
      <span className={`text-lg font-bold font-mono ${valueClass}`}>{value}</span>
    </div>
  );
}

function PerformanceButton({ label, shortcut, tone, onClick }: { label: string; shortcut: string; tone: "red" | "blue" | "emerald"; onClick: () => void }) {
  const classes = {
    red: "border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400",
    blue: "border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400",
    emerald: "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400",
  }[tone];
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center py-2.5 rounded-lg border text-xs transition-all cursor-pointer ${classes}`}>
      <span className="font-bold">{label}</span>
      <span className="text-[9px] font-mono mt-0.5 text-zinc-500">[Tecla {shortcut}]</span>
    </button>
  );
}
