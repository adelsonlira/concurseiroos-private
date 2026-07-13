import { useState, useEffect, useMemo } from "react";
import { useConcurseiroStore } from "../store";
import { 
  Timer, Play, Square, Pause, Save, CheckCircle2, 
  HelpCircle, Sparkles, BookOpen, Clock, AlertCircle
} from "lucide-react";
import { StudyActivityKind, StudySessionType } from "../types";
import { routePrivateStudyMaterial } from "../core/materials/materialPolicy";
import { DATAPREV_2026_PRIVATE_STUDY_MATERIALS } from "../config/concursos/dataprev-2026-perfil-3/privateStudyMaterials";

export default function FocusModeDesk() {
  const {
    isTimerRunning, timerSecondsElapsed, timerType, sessoesEstudo,
    startStudyTimer, stopStudyTimer, tickStudyTimer, finishStudySession,
    disciplinas, assuntos, subassuntos, configuracao,
    ultimaDecisaoSDE, executarSDEParaData
  } = useConcurseiroStore();

  const [selectedDiscId, setSelectedDiscId] = useState("");
  const [selectedAssId, setSelectedAssId] = useState("");
  const [selectedSubId, setSelectedSubId] = useState("");
  const [selectedActivity, setSelectedActivity] = useState<StudyActivityKind>("teoria");
  const [notesText, setNotesText] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [sessionSuccess, setSessionSuccess] = useState(false);
  const [markTheoryCompleted, setMarkTheoryCompleted] = useState(false);

  // Active subjects filtered by chosen discipline
  const filteredAssuntos = assuntos.filter(a => a.disciplinaId === selectedDiscId);
  const filteredSubassuntos = subassuntos.filter(
    (item) => item.assuntoId === selectedAssId
  );
  const topAction = ultimaDecisaoSDE?.actions[0] ?? null;
  const selectedMaterial = useMemo(() => {
    if (!configuracao.concursoAlvoId || !selectedDiscId || !selectedAssId) return null;
    return routePrivateStudyMaterial(DATAPREV_2026_PRIVATE_STUDY_MATERIALS, {
      concursoId: configuracao.concursoAlvoId,
      activity: selectedActivity,
      disciplineId: selectedDiscId,
      topicId: selectedAssId,
      subtopicId: selectedSubId || undefined
    });
  }, [
    configuracao.concursoAlvoId,
    selectedActivity,
    selectedDiscId,
    selectedAssId,
    selectedSubId
  ]);

  const currentDateKey = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: configuracao.disponibilidadeEstudo.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  };

  const applyTopRecommendation = () => {
    if (!topAction || isTimerRunning) return;
    setSelectedDiscId(topAction.disciplinaId);
    setSelectedAssId(topAction.assuntoId);
    setSelectedSubId(topAction.subassuntoId ?? "");
    setSelectedActivity(topAction.tipo);
  };

  // Automatically tick the timer when active in store
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && !isPaused) {
      interval = setInterval(() => {
        tickStudyTimer();
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, isPaused]);


  useEffect(() => {
    if (subassuntos.length === 0) return;
    const today = currentDateKey();
    if (ultimaDecisaoSDE?.referenceDate !== today) {
      executarSDEParaData(today);
    }
  }, [subassuntos.length, ultimaDecisaoSDE?.referenceDate, executarSDEParaData]);

  useEffect(() => {
    if (!selectedDiscId && topAction && !isTimerRunning) {
      applyTopRecommendation();
    }
  }, [topAction, selectedDiscId, isTimerRunning]);

  // Handle study session submission
  const handleFinish = () => {
    if (!selectedDiscId) return;

    finishStudySession(
      selectedDiscId,
      selectedAssId || undefined,
      selectedSubId || undefined,
      notesText,
      {
        atividadeEstudo: selectedActivity,
        sdeReferenceDate: ultimaDecisaoSDE?.referenceDate,
        sdePrioridade:
          topAction?.disciplinaId === selectedDiscId &&
          topAction?.assuntoId === selectedAssId
            ? topAction.prioridade
            : undefined,
        sdeReasonCode:
          topAction?.disciplinaId === selectedDiscId &&
          topAction?.assuntoId === selectedAssId
            ? topAction.reasonCode
            : undefined,
        sdeDiagnosticPurpose:
          topAction?.disciplinaId === selectedDiscId &&
          topAction?.assuntoId === selectedAssId
            ? topAction.diagnosticPurpose
            : undefined,
        duracaoPlanejadaMinutos:
          topAction?.disciplinaId === selectedDiscId &&
          topAction?.assuntoId === selectedAssId
            ? topAction.estimatedDurationMinutes
            : null,
        markTheoryCompleted:
          selectedActivity === "teoria" &&
          Boolean(selectedSubId) &&
          markTheoryCompleted
      }
    );
    setNotesText("");
    setMarkTheoryCompleted(false);
    setIsPaused(false);
    setSessionSuccess(true);
    setTimeout(() => setSessionSuccess(false), 4000);
  };

  const handleToggleTimer = () => {
    if (isTimerRunning) {
      if (isPaused) {
        setIsPaused(false);
      } else {
        setIsPaused(true);
      }
    } else {
      if (!selectedDiscId) {
        alert("Por favor, selecione uma Disciplina para iniciar seu foco.");
        return;
      }
      startStudyTimer(StudySessionType.STOPWATCH);
      setIsPaused(false);
    }
  };

  const handleStopAndCancel = () => {
    stopStudyTimer();
    setIsPaused(false);
  };

  // Human readable time formatter
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num: number) => String(num).padStart(2, "0");
    return `${hours > 0 ? `${pad(hours)}:` : ""}${pad(minutes)}:${pad(seconds)}`;
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-zinc-950 flex flex-col gap-6" id="focus-mode-container">
      
      {/* Upper Title banner */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-blue-500 animate-pulse" />
          <h2 className="text-sm font-semibold text-zinc-300 font-mono tracking-wide uppercase">Desk de Foco & Produtividade</h2>
        </div>
        <span className="text-xs text-zinc-500 font-mono">Modo Offline-First Ativo</span>
      </div>

      {topAction && !isTimerRunning && (
        <div className="flex flex-col gap-3 rounded-xl border border-blue-500/25 bg-blue-500/5 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-blue-300">
              Recomendação atual do SDE
            </div>
            <div className="mt-1 text-sm font-semibold text-zinc-200">
              {topAction.tipo} · {topAction.disciplinaNome} · {topAction.assuntoNome}
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              {topAction.justificativaXAI.porQue}
            </p>
          </div>
          <button
            type="button"
            onClick={applyTopRecommendation}
            className="shrink-0 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-500/20"
          >
            Usar esta ação na sessão
          </button>
        </div>
      )}

      {selectedMaterial && !isTimerRunning && (
        <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-4">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-indigo-300" />
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-300">
                Localizador do material privado
              </div>
              <div className="mt-1 text-sm font-semibold text-zinc-200">
                {selectedMaterial.materialTitle}
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                {selectedMaterial.sectionTitle} · páginas {selectedMaterial.startPage}–{selectedMaterial.endPage}
                {selectedMaterial.questionBank ? ` · banco ${selectedMaterial.questionBank}` : ""}
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
                Consulte a sua cópia privada. O aplicativo não contém nem transmite o PDF, e este localizador não altera a prioridade do SDE.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Stopwatch / Focus Timer display */}
        <div className="lg:col-span-1 p-5 rounded-xl border border-zinc-900 bg-zinc-900/10 flex flex-col items-center justify-center gap-6 min-h-[350px]">
          
          <div className="text-center flex flex-col gap-1">
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">CRONÔMETRO DE ESTUDO LÍQUIDO</span>
            <span className="text-xs text-zinc-400">
              {isTimerRunning ? (isPaused ? "Pausado" : "Focado...") : "Pronto para iniciar"}
            </span>
          </div>

          {/* Large timer graphic */}
          <div className="relative h-44 w-44 rounded-full border-2 border-zinc-900 bg-zinc-950/80 flex flex-col items-center justify-center shadow-2xl">
            {/* Visual pulsing border ring when running */}
            {isTimerRunning && !isPaused && (
              <div className="absolute inset-0 rounded-full border-2 border-blue-500 animate-ping opacity-25" />
            )}
            
            <span className="text-3xl font-extrabold tracking-widest font-mono text-zinc-100">
              {formatTime(timerSecondsElapsed)}
            </span>
            <span className="text-[9px] font-mono text-zinc-600 mt-1">HORA : MIN : SEG</span>
          </div>

          {/* Selector options before/during running */}
          {!isTimerRunning && (
            <div className="w-full flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-500 font-mono">ATIVIDADE REALIZADA:</label>
                <select
                  value={selectedActivity}
                  onChange={(event) =>
                    setSelectedActivity(event.target.value as StudyActivityKind)
                  }
                  className="bg-zinc-950 border border-zinc-900 text-xs text-zinc-300 rounded px-2.5 py-1.5"
                >
                  <option value="teoria">Teoria</option>
                  <option value="questoes">Questões</option>
                  <option value="revisao">Revisão</option>
                  <option value="flashcards">Flashcards</option>
                  <option value="simulado">Simulado</option>
                </select>
              </div>

              {/* Discipline filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-500 font-mono">DISCIPLINA ALVO:</label>
                <select
                  value={selectedDiscId}
                  onChange={(e) => {
                    setSelectedDiscId(e.target.value);
                    setSelectedAssId("");
                    setSelectedSubId("");
                  }}
                  className="bg-zinc-950 border border-zinc-900 text-xs text-zinc-300 rounded px-2.5 py-1.5"
                >
                  <option value="">Selecione a matéria...</option>
                  {disciplinas.map(d => (
                    <option key={d.id} value={d.id}>{d.nome}</option>
                  ))}
                </select>
              </div>

              {/* Subject filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-500 font-mono">ASSUNTO (OPCIONAL):</label>
                <select
                  value={selectedAssId}
                  disabled={!selectedDiscId}
                  onChange={(e) => setSelectedAssId(e.target.value)}
                  className="bg-zinc-950 border border-zinc-900 text-xs text-zinc-300 rounded px-2.5 py-1.5 disabled:opacity-40"
                >
                  <option value="">Selecione o assunto...</option>
                  {filteredAssuntos.map(a => (
                    <option key={a.id} value={a.id}>{a.nome}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-500 font-mono">SUBASSUNTO (OPCIONAL):</label>
                <select
                  value={selectedSubId}
                  disabled={!selectedAssId}
                  onChange={(event) => setSelectedSubId(event.target.value)}
                  className="bg-zinc-950 border border-zinc-900 text-xs text-zinc-300 rounded px-2.5 py-1.5 disabled:opacity-40"
                >
                  <option value="">Selecione o subassunto...</option>
                  {filteredSubassuntos.map((item) => (
                    <option key={item.id} value={item.id}>{item.nome}</option>
                  ))}
                </select>
              </div>

              {selectedActivity === "teoria" && selectedSubId && (
                <label className="flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-[11px] leading-relaxed text-zinc-400">
                  <input
                    type="checkbox"
                    checked={markTheoryCompleted}
                    onChange={(event) => setMarkTheoryCompleted(event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-blue-500"
                  />
                  <span>
                    Confirmo que concluí a cobertura teórica deste subassunto. Esta marcação é explícita e permitirá que o SDE considere questões práticas nas próximas decisões.
                  </span>
                </label>
              )}
            </div>
          )}

          {/* Controls Trigger Row */}
          <div className="flex items-center gap-3 w-full">
            <button
              onClick={handleToggleTimer}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                isTimerRunning 
                  ? (isPaused ? "bg-emerald-600 text-white" : "bg-amber-600 text-white") 
                  : "bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
              }`}
            >
              {isTimerRunning ? (
                isPaused ? (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Retomar</span>
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4" />
                    <span>Pausar Foco</span>
                  </>
                )
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Iniciar Sessão</span>
                </>
              )}
            </button>

            {isTimerRunning && (
              <button
                onClick={handleFinish}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-semibold cursor-pointer"
                title="Concluir e Salvar Estudos"
              >
                Concluir
              </button>
            )}

            {isTimerRunning && (
              <button
                onClick={handleStopAndCancel}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-red-500 border border-zinc-800"
                title="Descartar Sessão Atual"
              >
                <Square className="h-4 w-4 fill-red-500" />
              </button>
            )}
          </div>

        </div>

        {/* Right Side: Active study notes block (Markdowns pad) */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-zinc-900 bg-zinc-900/10 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-zinc-900/60 pb-2">
            <div>
              <h3 className="text-xs font-semibold text-zinc-300 font-mono tracking-wide uppercase">Caderno de Notas Ativas</h3>
              <p className="text-[10px] text-zinc-500">Escreva resumos ou anotações conceituais durante sua sessão teórica</p>
            </div>
            <Sparkles className="h-4 w-4 text-purple-400" />
          </div>

          <textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            placeholder="Digite aqui suas observações sobre a matéria... (Ex: Diferença entre imunidade tributária e isenção... Imunidade é de status constitucional, Isenção é infraconstitucional...)"
            className="flex-1 min-h-[220px] bg-zinc-950 border border-zinc-900 rounded p-3 text-xs text-zinc-300 outline-none focus:border-blue-500 font-mono leading-relaxed resize-none"
          />

          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
            <span>A sessão concluída será incorporada aos registros reais do SDE</span>
            <span>Anotações salvas no histórico local</span>
          </div>
        </div>

      </div>

      {/* Confirmation feedback when session saves successfully */}
      {sessionSuccess && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs animate-fadeIn">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>
            <span className="font-bold">Sessão de Foco Salva!</span>
            <p className="text-[11px] text-zinc-400 mt-0.5">O tempo líquido e as anotações foram registrados; o SDE será recalculado a partir dessas evidências.</p>
          </div>
        </div>
      )}

      {/* Study guidelines for high productivity */}
      <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-900/5 flex items-start gap-4 text-xs">
        <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1.5 leading-relaxed text-zinc-400">
          <span className="font-semibold text-zinc-200">Execução segura da sessão</span>
          <p>
            Use a duração e as pausas calculadas pelo planner para a janela de hoje. Registre somente o tempo efetivamente estudado e marque teoria como concluída apenas quando o subassunto selecionado tiver sido coberto.
          </p>
        </div>
      </div>

    </div>
  );
}
