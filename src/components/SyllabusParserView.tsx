import React, { useState } from "react";
import { useConcurseiroStore } from "../store";
import { 
  Upload, FileText, ChevronRight, ChevronDown, Plus, Trash2, 
  Edit3, Sparkles, Check, CheckSquare, Settings2, Trash, FileDown, AlertTriangle
} from "lucide-react";
import OperationalScreenGuide from "./OperationalScreenGuide";
import { authenticatedFetch } from "../integrations/cloud/authenticatedFetch";
import { Disciplina, Assunto, Subassunto, DifficultyLevel } from "../types";

export default function SyllabusParserView() {
  const { 
    concursos, disciplinas, assuntos, subassuntos, activeConcursoId, 
    importSyllabusFromAI, addDisciplina, updateDisciplina, deleteDisciplina,
    addAssunto, updateAssunto, deleteAssunto, addSubassunto, updateSubassunto, deleteSubassunto,
    setActiveConcurso
  } = useConcurseiroStore();

  const [inputText, setInputText] = useState("");
  const [fileSelected, setFileSelected] = useState<File | null>(null);
  const [fileContentText, setFileContentText] = useState("");
  const [fileBase64, setFileBase64] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseStep, setParseStep] = useState("");
  const [parseError, setParseError] = useState("");
  const [customContext, setCustomContext] = useState("");

  // Editing structures
  const [expandedDisciplines, setExpandedDisciplines] = useState<{ [id: string]: boolean }>({});
  const [expandedAssuntos, setExpandedAssuntos] = useState<{ [id: string]: boolean }>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemType, setEditingItemType] = useState<"disc" | "ass" | "sub" | null>(null);
  const [editFormName, setEditFormName] = useState("");
  const [editFormExtra, setEditFormExtra] = useState<any>({});

  // Adding items states
  const [addFormActive, setAddFormActive] = useState<{ parentId: string; type: "disc" | "ass" | "sub" } | null>(null);
  const [addFormName, setAddFormName] = useState("");

  const activeConcurso = concursos.find(c => c.id === activeConcursoId) || concursos[0];

  const concursoDisciplinas = disciplinas
    .filter(d => d.concursoId === activeConcurso?.id)
    .sort((a, b) => a.ordem - b.ordem);

  const toggleDiscipline = (id: string) => {
    setExpandedDisciplines(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAssunto = (id: string) => {
    setExpandedAssuntos(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // -------------------------------------------------------------
  // File upload processing
  // -------------------------------------------------------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileSelected(file);
    setParseError("");
    setFileContentText("");
    setFileBase64("");

    const reader = new FileReader();

    if (file.name.endsWith(".txt") || file.name.endsWith(".md") || file.name.endsWith(".csv") || file.name.endsWith(".html")) {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setFileContentText(text);
        setInputText(text.slice(0, 15000));
      };
      reader.readAsText(file);
    } else {
      // PDF and binary formats
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl && dataUrl.includes(",")) {
          const base64 = dataUrl.split(",")[1];
          setFileBase64(base64);
          setInputText(`[ARQUIVO CARREGADO: ${file.name}]
A Inteligência Artificial (Gemini 3.5) lerá este edital em PDF diretamente para mapear com precisão cirúrgica todas as disciplinas, assuntos, subassuntos e estimar a relevância de cada tópico.`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // -------------------------------------------------------------
  // Trigger Server-side AI Parser
  // -------------------------------------------------------------
  const handleAiParse = async () => {
    const contentToParse = inputText || fileContentText;
    if (!contentToParse || contentToParse.trim().length === 0) {
      setParseError("Por favor, cole o texto do edital ou faça upload de um arquivo para iniciar.");
      return;
    }

    setIsParsing(true);
    setParseError("");
    setParseStep("Lendo e Higienizando Documento...");

    setTimeout(() => setParseStep("Alinhando com o modelo cognitivo..."), 1200);
    setTimeout(() => setParseStep("Consultando Especialista em Concursos (Gemini 3.5)..."), 2500);

    try {
      const response = await authenticatedFetch("/api/parse-edital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: contentToParse,
          filename: fileSelected?.name || "Edital_Digitado.txt",
          fileType: fileSelected?.type || "Plain Text",
          customContext: customContext,
          pdfBase64: fileBase64
        })
      });

      if (!response.ok) {
        throw new Error("Resposta inválida do servidor de IA. Verifique as chaves e rotas.");
      }

      const parsedData = await response.json();
      
      setParseStep("Resolvendo conflitos e mesclando redundâncias...");
      
      // Perform automated syllabus import on the store
      const newConcursoId = importSyllabusFromAI(parsedData);
      
      setIsParsing(false);
      setParseStep("");
      setActiveConcurso(newConcursoId);
      setInputText("");
      setFileSelected(null);
    } catch (err: any) {
      console.error(err);
      setParseError(err.message || "Erro desconhecido ao processar o Edital com Inteligência Artificial.");
      setIsParsing(false);
      setParseStep("");
    }
  };

  // -------------------------------------------------------------
  // Manual Editing Triggers
  // -------------------------------------------------------------
  const startEditing = (item: any, type: "disc" | "ass" | "sub") => {
    setEditingItemId(item.id);
    setEditingItemType(type);
    setEditFormName(item.nome);
    if (type === "disc") {
      setEditFormExtra({ pesoPadrao: item.pesoPadrao });
    } else if (type === "ass") {
      setEditFormExtra({ prioridadeEdital: item.prioridadeEdital });
    }
  };

  const saveEdit = () => {
    if (!editingItemId || !editingItemType) return;

    if (editingItemType === "disc") {
      updateDisciplina(editingItemId, { 
        nome: editFormName, 
        pesoPadrao: Number(editFormExtra.pesoPadrao || 1) 
      });
    } else if (editingItemType === "ass") {
      updateAssunto(editingItemId, { 
        nome: editFormName, 
        prioridadeEdital: editFormExtra.prioridadeEdital 
      });
    } else if (editingItemType === "sub") {
      updateSubassunto(editingItemId, { nome: editFormName });
    }

    setEditingItemId(null);
    setEditingItemType(null);
    setEditFormName("");
    setEditFormExtra({});
  };

  // -------------------------------------------------------------
  // Manual Creating triggers
  // -------------------------------------------------------------
  const startAddForm = (parentId: string, type: "disc" | "ass" | "sub") => {
    setAddFormActive({ parentId, type });
    setAddFormName("");
  };

  const submitAddForm = () => {
    if (!addFormName.trim() || !addFormActive) return;

    const id = `${addFormActive.type}-${Date.now()}`;
    const timestamp = new Date().toISOString();

    if (addFormActive.type === "disc") {
      const newDisc: Disciplina = {
        id,
        concursoId: activeConcurso?.id || "temp",
        nome: addFormName,
        pesoPadrao: 1,
        ordem: concursoDisciplinas.length + 1,
        percentualAcertosAlvo: 80,
        totalQuestoesRespondidas: 0,
        totalQuestoesAcertadas: 0,
        tempoTotalEstudoMinutos: 0,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      addDisciplina(newDisc);
    } else if (addFormActive.type === "ass") {
      const parentDiscId = addFormActive.parentId;
      const brotherAssuntos = assuntos.filter(a => a.disciplinaId === parentDiscId);
      const newAss: Assunto = {
        id,
        disciplinaId: parentDiscId,
        nome: addFormName,
        ordem: brotherAssuntos.length + 1,
        prioridadeEdital: "NAO_INFORMADA",
        metaQuestoesResolvidas: 100,
        questoesRespondidas: 0,
        questoesAcertadas: 0,
        tempoEstudadoMinutos: 0,
        progressoPorcentagem: 0,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      addAssunto(newAss);
    } else if (addFormActive.type === "sub") {
      const parentAssId = addFormActive.parentId;
      const brotherSub = subassuntos.filter(s => s.assuntoId === parentAssId);
      const newSub: Subassunto = {
        id,
        assuntoId: parentAssId,
        nome: addFormName,
        ordem: brotherSub.length + 1,
        completado: false,
        prioridadeRevisao: DifficultyLevel.MEDIUM,
        questoesRespondidas: 0,
        questoesAcertadas: 0,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      addSubassunto(newSub);
    }

    setAddFormActive(null);
    setAddFormName("");
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-zinc-950 flex flex-col gap-6" id="syllabus-parser-container">
      <OperationalScreenGuide
        icon={FileText}
        title="Importar novo edital"
        purpose="Ferramenta administrativa para extrair a estrutura de um novo concurso. Ela não estima incidência nem substitui revisão humana."
        whenToUse="ao cadastrar ou atualizar um concurso"
        outcome="rascunho de disciplinas e tópicos para validação"
      />
      {/* Importer Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* File Drag Box & Paste Input */}
        <div className="xl:col-span-2 p-5 rounded-xl border border-zinc-900 bg-zinc-900/10 flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-blue-500 animate-pulse" />
              <h3 className="text-sm font-semibold text-zinc-300 font-mono tracking-wide uppercase">Importador de Editais Inteligente</h3>
            </div>
            <p className="text-xs text-zinc-500">
              Faça upload de PDF ou arquivo textual, ou cole o conteúdo programático. A IA apenas extrai a estrutura; prioridades ausentes permanecem não informadas.
            </p>
          </div>

          {/* Drag area */}
          <div className="relative border border-dashed border-zinc-800 rounded-lg p-5 flex flex-col items-center justify-center bg-zinc-900/20 hover:bg-zinc-900/30 hover:border-zinc-700 transition-all cursor-pointer">
            <input 
              type="file" 
              accept=".pdf,.txt,.md,.html,.csv" 
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer" 
            />
            <Upload className="h-8 w-8 text-zinc-500 mb-2" />
            <span className="text-xs text-zinc-300 font-medium">
              {fileSelected ? fileSelected.name : "Arraste ou clique para selecionar seu edital"}
            </span>
            <span className="text-[10px] text-zinc-600 font-mono mt-1">
              PDF, CSV, TXT, MD ou HTML (Até 50MB)
            </span>
          </div>

          {/* Manual Paste area */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-zinc-500 font-mono">OU COLE O TEXTO DO CONTEÚDO PROGRAMÁTICO DIRETAMENTE:</label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ex: Direito Constitucional. 1. Direitos e garantias fundamentais. 2. Direitos individuais e coletivos... Direito Administrativo. 1. Atos administrativos..."
              className="h-32 bg-zinc-950 border border-zinc-900 rounded p-3 text-xs text-zinc-300 outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {/* Custom specifications / guidelines for Gemini */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-500 font-mono">DIRETRIZ DE EXTRAÇÃO ADICIONAL (OPCIONAL):</label>
            <input
              type="text"
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              placeholder="Ex: Focar em separar disciplinas da área fiscal, ou mesclar tópicos de legislação aduaneira"
              className="bg-zinc-950 border border-zinc-900 rounded px-3 py-2 text-xs text-zinc-300 outline-none focus:border-blue-500"
            />
          </div>

          {/* Action Button & Error */}
          <div className="flex flex-col gap-2 mt-2">
            {parseError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <span>{parseError}</span>
              </div>
            )}
            <button
              onClick={handleAiParse}
              disabled={isParsing || (!inputText && !fileSelected)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isParsing ? (
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="animate-pulse">{parseStep}</span>
                </div>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Mapear Edital com Inteligência Artificial</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Informative Side Box */}
        <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-900/10 flex flex-col gap-4 text-xs">
          <h4 className="font-semibold text-zinc-300 font-mono tracking-wide uppercase">Como Funciona</h4>
          <div className="flex flex-col gap-3 text-zinc-400 leading-relaxed">
            <p>
              1. <strong>Leitura Avançada:</strong> O arquivo é pré-processado textualmente na plataforma ConcurseiroOS.
            </p>
            <p>
              2. <strong>Classificação Cognitiva:</strong> A IA identifica as quebras de linha e detecta divisões de matérias, tópicos e subtópicos.
            </p>
            <p>
              3. <strong>Detecção de Pesos:</strong> Procura automaticamente por menções a pontuações, pesos e quantidades de questões.
            </p>
            <p>
              4. <strong>Higienização e Consolidação:</strong> Funde termos duplicados (ex: Direito Administrativo e Legislação no mesmo certame) para evitar duplicidade de itens, gerando uma árvore ideal.
            </p>
          </div>
        </div>

      </div>

      {/* Structured Tree & Manual Customizer */}
      <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-900/10 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-300 font-mono tracking-wide uppercase">Árvore de Conteúdo do Edital</h3>
            <p className="text-xs text-zinc-500">Gerenciamento interativo da estrutura programática de {activeConcurso?.nome}</p>
          </div>
          <button
            onClick={() => startAddForm("root", "disc")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-mono cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Disciplina</span>
          </button>
        </div>

        {/* Tree Container */}
        <div className="flex flex-col gap-2 mt-2">
          {concursoDisciplinas.map((disc) => {
            const discAssuntos = assuntos.filter(a => a.disciplinaId === disc.id);
            const isDiscExpanded = expandedDisciplines[disc.id];

            return (
              <div key={disc.id} className="border border-zinc-900/60 rounded-lg overflow-hidden bg-zinc-900/5">
                {/* Discipline Header Row */}
                <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/20 hover:bg-zinc-900/40 border-b border-zinc-900 transition-colors">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => toggleDiscipline(disc.id)} 
                      className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                    >
                      {isDiscExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    {editingItemId === disc.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editFormName}
                          onChange={(e) => setEditFormName(e.target.value)}
                          className="bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-xs text-zinc-100 outline-none"
                        />
                        <input
                          type="number"
                          value={editFormExtra.pesoPadrao || ""}
                          onChange={(e) => setEditFormExtra({ ...editFormExtra, pesoPadrao: e.target.value })}
                          placeholder="Peso"
                          className="w-16 bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-xs text-zinc-100 outline-none"
                        />
                        <button onClick={saveEdit} className="text-emerald-500 hover:text-emerald-400 p-0.5"><Check className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-200">{disc.nome}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                          Peso {disc.pesoPadrao}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions column */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startAddForm(disc.id, "ass")}
                      title="Adicionar Assunto"
                      className="p-1 rounded bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => startEditing(disc, "disc")}
                      className="p-1 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteDisciplina(disc.id)}
                      className="p-1 text-zinc-600 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subjects Column (Assuntos) */}
                {isDiscExpanded && (
                  <div className="px-6 py-2 flex flex-col gap-1 bg-zinc-900/10">
                    {discAssuntos.map((ass) => {
                      const assSub = subassuntos.filter(sa => sa.assuntoId === ass.id);
                      const isAssExpanded = expandedAssuntos[ass.id];

                      return (
                        <div key={ass.id} className="border-l border-zinc-800/50 pl-3 py-1 flex flex-col gap-1">
                          
                          {/* Subject Header Row */}
                          <div className="flex items-center justify-between py-1 hover:bg-zinc-900/10 pr-2 transition-colors">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => toggleAssunto(ass.id)} 
                                className="text-zinc-600 hover:text-zinc-400 cursor-pointer"
                              >
                                {isAssExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              </button>
                              {editingItemId === ass.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editFormName}
                                    onChange={(e) => setEditFormName(e.target.value)}
                                    className="bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-xs text-zinc-100 outline-none"
                                  />
                                  <select
                                    value={editFormExtra.prioridadeEdital || "NAO_INFORMADA"}
                                    onChange={(e) => setEditFormExtra({ ...editFormExtra, prioridadeEdital: e.target.value })}
                                    className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 rounded"
                                  >
                                    <option value="NAO_INFORMADA">NÃO INFORMADA</option>
                                    <option value="ALTA">ALTA</option>
                                    <option value="MEDIA">MEDIA</option>
                                    <option value="BAIXA">BAIXA</option>
                                  </select>
                                  <button onClick={saveEdit} className="text-emerald-500 hover:text-emerald-400 p-0.5"><Check className="h-3.5 w-3.5" /></button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-zinc-300">{ass.nome}</span>
                                  <span className={`text-[9px] font-mono px-1 rounded ${
                                    ass.prioridadeEdital === "ALTA" ? "bg-red-500/15 text-red-400 border border-red-500/20" :
                                    ass.prioridadeEdital === "MEDIA" ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" :
                                    "bg-zinc-800 text-zinc-400"
                                  }`}>
                                    {ass.prioridadeEdital}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Subject Actions */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => startAddForm(ass.id, "sub")}
                                title="Adicionar Subassunto"
                                className="p-0.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => startEditing(ass, "ass")}
                                className="p-0.5 text-zinc-600 hover:text-zinc-300 cursor-pointer"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => deleteAssunto(ass.id)}
                                className="p-0.5 text-zinc-600 hover:text-red-400 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Subassuntos List */}
                          {isAssExpanded && (
                            <div className="pl-6 flex flex-col gap-1 py-1">
                              {assSub.map((sub) => (
                                <div key={sub.id} className="flex items-center justify-between py-1 group pr-2">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={sub.completado}
                                      onChange={() => updateSubassunto(sub.id, { completado: !sub.completado })}
                                      className="h-3.5 w-3.5 rounded bg-zinc-950 border border-zinc-800 focus:ring-0 checked:bg-blue-600 cursor-pointer"
                                    />
                                    {editingItemId === sub.id ? (
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="text"
                                          value={editFormName}
                                          onChange={(e) => setEditFormName(e.target.value)}
                                          className="bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-xs text-zinc-100 outline-none"
                                        />
                                        <button onClick={saveEdit} className="text-emerald-500 hover:text-emerald-400 p-0.5"><Check className="h-3.5 w-3.5" /></button>
                                      </div>
                                    ) : (
                                      <span className={`text-[11px] font-sans ${sub.completado ? "text-zinc-500 line-through" : "text-zinc-400"}`}>
                                        {sub.nome}
                                      </span>
                                    )}
                                  </div>

                                  <div className="hidden group-hover:flex items-center gap-1.5">
                                    <button
                                      onClick={() => startEditing(sub, "sub")}
                                      className="p-0.5 text-zinc-600 hover:text-zinc-300 cursor-pointer"
                                    >
                                      <Edit3 className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => deleteSubassunto(sub.id)}
                                      className="p-0.5 text-zinc-600 hover:text-red-400 cursor-pointer"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}

                              {assSub.length === 0 && (
                                <span className="text-[10px] text-zinc-600 font-mono">Sem subassuntos. Clique em (+) para criar.</span>
                              )}
                            </div>
                          )}

                        </div>
                      );
                    })}

                    {discAssuntos.length === 0 && (
                      <span className="text-xs text-zinc-500 font-mono py-2">Sem assuntos associados.</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {concursoDisciplinas.length === 0 && (
            <div className="py-12 border border-dashed border-zinc-900 rounded-lg text-center flex flex-col items-center justify-center gap-2 bg-zinc-900/5">
              <span className="text-xs text-zinc-500 font-mono">Esta árvore de estudos está vazia.</span>
              <p className="text-[10px] text-zinc-600 max-w-sm">Use o Importador IA acima para popular ou crie manualmente as Disciplinas clicando no botão no canto superior direito.</p>
            </div>
          )}
        </div>
      </div>

      {/* Manual Creation Overlay Modal */}
      {addFormActive && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col gap-4 shadow-2xl">
            <div>
              <h4 className="text-sm font-semibold text-zinc-200 font-mono">
                Adicionar {addFormActive.type === "disc" ? "Disciplina" : addFormActive.type === "ass" ? "Assunto" : "Subassunto"}
              </h4>
              <p className="text-[11px] text-zinc-500 mt-0.5">Defina o nome do item a ser inserido na hierarquia do edital.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-zinc-400 font-mono">NOME DO ELEMENTO:</label>
              <input
                type="text"
                autoFocus
                value={addFormName}
                onChange={(e) => setAddFormName(e.target.value)}
                placeholder="Ex: Teoria Geral do Estado, Crase, Artigo 5º..."
                className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-2">
              <button
                onClick={() => setAddFormActive(null)}
                className="px-3 py-1.5 rounded text-zinc-400 hover:text-zinc-200 text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={submitAddForm}
                disabled={!addFormName.trim()}
                className="px-4 py-1.5 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-all cursor-pointer disabled:opacity-40"
              >
                Criar Item
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
