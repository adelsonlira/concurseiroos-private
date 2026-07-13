import { useState, useEffect } from "react";
import { useConcurseiroStore } from "../store";
import { 
  FileQuestion, CheckCircle2, XCircle, ArrowRight, Brain, 
  HelpCircle, Sparkles, ChevronRight, Bookmark, Award, Clock,
  CheckSquare
} from "lucide-react";
import { authenticatedFetch } from "../integrations/cloud/authenticatedFetch";
import { Questao } from "../types";
import ExternalAttemptRecorder from "./ExternalAttemptRecorder";

export default function ExerciseDeskView() {
  const { 
    questoes, disciplinas, assuntos, resolveQuestao, activeConcursoId 
  } = useConcurseiroStore();

  const [activeDiscFilter, setActiveDiscFilter] = useState<string>("ALL");
  const [currentQuestaoIdx, setCurrentQuestaoIdx] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  
  // AI Explanation States
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiExplanation, setAiExplanation] = useState<string>("");
  const [showAiDrawer, setShowAiDrawer] = useState<boolean>(false);

  // Filter questions based on selected discipline
  const filteredQuestoes = questoes.filter(q => {
    if (activeDiscFilter === "ALL") return true;
    return q.disciplinaId === activeDiscFilter;
  });

  const activeQuestion: Questao | undefined = filteredQuestoes[currentQuestaoIdx];

  // -------------------------------------------------------------
  // Keyboard Shortcuts (A-E to toggle, Cmd+Enter or Enter to submit)
  // -------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is writing in input/textarea (e.g., chat)
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      if (!activeQuestion) return;

      const key = e.key.toUpperCase();
      
      // Map keys A-E
      if (["A", "B", "C", "D", "E"].includes(key) && !isSubmitted) {
        // Find option representing this letter
        const option = activeQuestion.opcoes.find(o => o.letra === key);
        if (option) {
          setSelectedOptionId(option.id);
        }
      }

      // Enter to submit or transition to next
      if (e.key === "Enter") {
        if (!isSubmitted && selectedOptionId) {
          handleSubmit();
        } else if (isSubmitted) {
          handleNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeQuestion, selectedOptionId, isSubmitted]);

  // Question Timer
  useEffect(() => {
    setTimeElapsed(0);
    if (isSubmitted) return;

    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestaoIdx, isSubmitted]);

  const handleSubmit = () => {
    if (!activeQuestion || !selectedOptionId || isSubmitted) return;

    const selectedOption = activeQuestion.opcoes.find(o => o.id === selectedOptionId);
    const isCorrect = selectedOption ? selectedOption.isCorreta : false;

    // Trigger state store resolution to persist metrics & updates
    resolveQuestao(activeQuestion.id, selectedOptionId, isCorrect, timeElapsed);
    setIsSubmitted(true);
  };

  const handleNext = () => {
    setIsSubmitted(false);
    setSelectedOptionId(null);
    setAiExplanation("");
    setShowAiDrawer(false);
    
    if (currentQuestaoIdx + 1 < filteredQuestoes.length) {
      setCurrentQuestaoIdx(prev => prev + 1);
    } else {
      setCurrentQuestaoIdx(0); // circular list loop
    }
  };

  // -------------------------------------------------------------
  // Trigger Server-side AI Explanation
  // -------------------------------------------------------------
  const getAiExplanation = async () => {
    if (!activeQuestion) return;
    
    setIsAiLoading(true);
    setShowAiDrawer(true);
    setAiExplanation("");

    try {
      const selectedOption = activeQuestion.opcoes.find(o => o.id === selectedOptionId);
      const correctOption = activeQuestion.opcoes.find(o => o.isCorreta);
      const subject = assuntos.find(a => a.id === activeQuestion.assuntoId)?.nome || "Geral";

      const res = await authenticatedFetch("/api/explain-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: activeQuestion.enunciado,
          options: activeQuestion.opcoes,
          selectedAnswer: selectedOption ? `[${selectedOption.letra}] ${selectedOption.texto}` : "Não Respondida",
          correctAnswer: correctOption ? `[${correctOption.letra}] ${correctOption.texto}` : "Desconhecida",
          subject: subject
        })
      });

      if (!res.ok) {
        throw new Error("Erro na comunicação com o Coach de Estudos.");
      }

      const data = await res.json();
      setAiExplanation(data.explanation || "Não foi possível estruturar a explicação.");
    } catch (err: any) {
      console.error(err);
      setAiExplanation(`### Erro ao Consultar Inteligência Artificial\nNão foi possível obter a explicação no momento: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const activeDiscName = disciplinas.find(d => d.id === activeDiscFilter)?.nome || "Todas as Matérias";

  return (
    <div className="flex-1 overflow-hidden bg-zinc-950 flex" id="exercise-desk-viewport">
      {/* Main Question Body Workspace */}
      <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
        
        {/* Upper Selection Rail */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
          <div className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5 text-blue-500" />
            <h2 className="text-sm font-semibold text-zinc-300 font-mono tracking-wide uppercase">Banco de Questões</h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 font-mono">Filtrar Matéria:</span>
            <select
              value={activeDiscFilter}
              onChange={(e) => {
                setActiveDiscFilter(e.target.value);
                setCurrentQuestaoIdx(0);
                setIsSubmitted(false);
                setSelectedOptionId(null);
                setAiExplanation("");
              }}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded px-2 py-1 text-xs outline-none"
            >
              <option value="ALL">Todas as Matérias</option>
              {disciplinas.map(d => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
          </div>
        </div>

        <ExternalAttemptRecorder />

        {activeQuestion ? (
          <div className="max-w-3xl mx-auto w-full flex flex-col gap-5 py-2">
            
            {/* Meta tags header */}
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
              <div className="flex items-center gap-2">
                <span className="bg-zinc-900 text-zinc-300 px-2 py-0.5 rounded border border-zinc-800">
                  {activeQuestion.banca}
                </span>
                <span>•</span>
                <span>Ano: {activeQuestion.ano}</span>
                <span>•</span>
                <span>Órgão: {activeQuestion.orgao}</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Clock className="h-3.5 w-3.5" />
                <span>Timer: {Math.floor(timeElapsed / 60)}m {timeElapsed % 60}s</span>
              </div>
            </div>

            {/* Enunciado Block */}
            <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-900/10 text-sm leading-relaxed text-zinc-200 font-sans shadow-sm">
              <p className="whitespace-pre-wrap">{activeQuestion.enunciado}</p>
            </div>

            {/* Keyboard guidance hint */}
            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
              <span>SELECIONE A OPÇÃO UTILIZANDO AS TECLAS DO TECLADO:</span>
              <span>Pressione [Enter] para submeter seu gabarito</span>
            </div>

            {/* Options List */}
            <div className="flex flex-col gap-2.5">
              {activeQuestion.opcoes.map((opt) => {
                const isSelected = selectedOptionId === opt.id;
                
                // Styling flags on submitted state
                let optionStyle = "border-zinc-900 hover:bg-zinc-900/30 bg-zinc-900/5 hover:border-zinc-800";
                let badgeStyle = "bg-zinc-900 border-zinc-800 text-zinc-400";

                if (isSelected) {
                  optionStyle = "border-blue-500 bg-blue-500/5 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.1)]";
                  badgeStyle = "bg-blue-500 text-white border-blue-400";
                }

                if (isSubmitted) {
                  if (opt.isCorreta) {
                    optionStyle = "border-emerald-500 bg-emerald-500/10 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.15)]";
                    badgeStyle = "bg-emerald-500 text-white border-emerald-400";
                  } else if (isSelected && !opt.isCorreta) {
                    optionStyle = "border-red-500 bg-red-500/10 text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.15)]";
                    badgeStyle = "bg-red-500 text-white border-red-400";
                  } else {
                    optionStyle = "border-zinc-900 bg-zinc-900/5 opacity-50";
                  }
                }

                return (
                  <button
                    key={opt.id}
                    disabled={isSubmitted}
                    onClick={() => setSelectedOptionId(opt.id)}
                    className={`w-full flex items-start gap-4 p-4 rounded-xl border text-left text-xs transition-all ${optionStyle}`}
                  >
                    <span className={`h-6 w-6 shrink-0 rounded-lg flex items-center justify-center font-mono font-bold text-xs border ${badgeStyle}`}>
                      {opt.letra}
                    </span>
                    <span className="pt-0.5 leading-relaxed">{opt.texto}</span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between gap-4 mt-2">
              <span className="text-xs text-zinc-500 font-mono">
                Questão {currentQuestaoIdx + 1} de {filteredQuestoes.length} ({activeDiscName})
              </span>

              <div className="flex items-center gap-3">
                {isSubmitted && (
                  <button
                    onClick={getAiExplanation}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 text-xs font-mono font-medium border border-purple-500/30 transition-all cursor-pointer"
                  >
                    <Brain className="h-4 w-4" />
                    <span>Explicar com IA</span>
                  </button>
                )}

                {!isSubmitted ? (
                  <button
                    onClick={handleSubmit}
                    disabled={!selectedOptionId}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <span>Submeter Gabarito</span>
                    <CheckSquare className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-zinc-900 text-zinc-300 hover:bg-zinc-800 text-xs font-semibold border border-zinc-800 transition-all cursor-pointer"
                  >
                    <span>Próxima Questão</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Static Explanations fallback if drawer not open */}
            {isSubmitted && activeQuestion.explicacaoGeral && !showAiDrawer && (
              <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-900/10 text-xs flex flex-col gap-2 mt-4 animate-fadeIn">
                <span className="font-mono font-bold text-zinc-400">GABARITO COMENTADO:</span>
                <p className="text-zinc-300 leading-relaxed">{activeQuestion.explicacaoGeral}</p>
              </div>
            )}

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
            <HelpCircle className="h-10 w-10 text-zinc-600 mb-2" />
            <span className="text-xs text-zinc-400 font-mono">Nenhuma questão encontrada para este filtro.</span>
            <p className="text-[10px] text-zinc-600 max-w-xs">
              Mude o filtro de disciplina acima ou adicione novas questões na árvore do edital.
            </p>
          </div>
        )}

      </div>

      {/* AI Explanation Side Drawer Drawer Panel */}
      {showAiDrawer && (
        <div className="w-96 border-l border-zinc-800 bg-zinc-950 flex flex-col p-4 shrink-0 overflow-y-auto animate-slideInRight" id="ai-explanation-drawer">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-bold font-mono text-zinc-200">ANÁLISE DE APRENDIZADO</span>
            </div>
            <button 
              onClick={() => setShowAiDrawer(false)}
              className="text-xs font-mono text-zinc-500 hover:text-zinc-300 cursor-pointer"
            >
              [Fechar]
            </button>
          </div>

          {isAiLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12">
              <div className="h-6 w-6 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
              <span className="text-[10px] font-mono text-purple-400 animate-pulse">Sintetizando explicação...</span>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-4 text-xs font-sans leading-relaxed text-zinc-300 overflow-y-auto">
              {/* Render custom AI output structure formatting */}
              <div className="whitespace-pre-wrap flex flex-col gap-2 font-sans">
                {aiExplanation}
              </div>
              
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-500 font-mono flex items-start gap-2 mt-4">
                <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Explicação gerada pelo Coach IA do ConcurseiroOS utilizando as diretrizes de memorização e atalho de bancas.</span>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
