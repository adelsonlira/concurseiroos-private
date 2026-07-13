import { useState, useEffect, useRef } from "react";
import { useConcurseiroStore } from "../store";
import { 
  ItemBiblioteca, Disciplina, Assunto, Questao, Flashcard 
} from "../types";
import { 
  Search, Sparkles, Upload, Eye, Heart, Plus, Trash2, Edit2, Check, 
  ArrowRight, Video, FileText, Share2, Layers, HelpCircle, Link as LinkIcon, 
  FileCode, StickyNote, Play, Pause, ChevronLeft, ChevronRight, X, 
  ArrowUpRight, CheckCircle, AlertTriangle, RefreshCw, Bookmark, Map, ShieldAlert
} from "lucide-react";
import { authenticatedFetch } from "../integrations/cloud/authenticatedFetch";
import type { FlashcardRetrievalPerformance } from "../core/flashcards/types";
import { motion, AnimatePresence } from "motion/react";

export default function LibraryView() {
  const { 
    biblioteca, disciplinas, assuntos, questoes, flashcards, resumos,
    addBibliotecaItem, updateBibliotecaItem, deleteBibliotecaItem,
    addQuestao, resolveQuestao, addFlashcard, reviewFlashcard
  } = useConcurseiroStore();

  // Selected Filters
  const [selectedDisciplinaId, setSelectedDisciplinaId] = useState<string>("");
  const [selectedAssuntoId, setSelectedAssuntoId] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSemanticSearch, setIsSemanticSearch] = useState<boolean>(false);
  const [semanticResults, setSemanticResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Active Preview Item
  const [activeItem, setActiveItem] = useState<ItemBiblioteca | null>(null);

  // Upload/Manual creation modal
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [pastedUrl, setPastedUrl] = useState<string>("");
  const [isOrganizing, setIsOrganizing] = useState<boolean>(false);

  // Organization Form state (returned by AI or filled manually)
  const [formTitulo, setFormTitulo] = useState<string>("");
  const [formDescricao, setFormDescricao] = useState<string>("");
  const [formDisciplinaId, setFormDisciplinaId] = useState<string>("");
  const [formAssuntoId, setFormAssuntoId] = useState<string>("");
  const [formNovoAssuntoNome, setFormNovoAssuntoNome] = useState<string>("");
  const [formCategoria, setFormCategoria] = useState<"LEGISLACAO" | "DOUTRINA" | "JURISPRUDENCIA" | "BIBLIOGRAFIA" | "OUTROS">("OUTROS");
  const [formTipoMaterial, setFormTipoMaterial] = useState<string>("LINK");
  const [formTags, setFormTags] = useState<string>("");
  const [formConteudoMarkdown, setFormConteudoMarkdown] = useState<string>("");

  // Video interactive state
  const [videoPlayTime, setVideoPlayTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(300); // 5 mins dummy
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [videoNoteText, setVideoNoteText] = useState<string>("");
  const videoIntervalRef = useRef<any>(null);

  // PDF reader state
  const [pdfCurrentPage, setPdfCurrentPage] = useState<number>(1);
  const [pdfNoteText, setPdfNoteText] = useState<string>("");

  // Flashcards state
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);

  // Questions state
  const [selectedQuestionOption, setSelectedQuestionOption] = useState<string>("");
  const [isQuestionAnswered, setIsQuestionAnswered] = useState<boolean>(false);
  const [timeSpent, setTimeSpent] = useState<number>(0);

  // Mind map state (interactive SVG node editor)
  const [mindMapNodes, setMindMapNodes] = useState<any[]>([]);
  const [mindMapLinks, setMindMapLinks] = useState<any[]>([]);
  const [newMapNodeLabel, setNewMapNodeLabel] = useState<string>("");
  const [newMapNodeColor, setNewMapNodeColor] = useState<string>("#3b82f6");
  const [nodeSourceId, setNodeSourceId] = useState<string>("");
  const [nodeTargetId, setNodeTargetId] = useState<string>("");

  // Auto-fill form fields on activeItem change
  useEffect(() => {
    if (activeItem) {
      // Setup video playback if it's a video
      if (activeItem.tipoMaterial === "VIDEO") {
        setVideoPlayTime(0);
        setIsVideoPlaying(false);
      }
      // Setup PDF pages
      if (activeItem.tipoMaterial === "PDF") {
        setPdfCurrentPage(1);
      }
      // Load Mind Map
      if (activeItem.tipoMaterial === "MAPA_MENTAL" && activeItem.dadosMapaMental) {
        try {
          const parsed = JSON.parse(activeItem.dadosMapaMental);
          setMindMapNodes(parsed.nodes || []);
          setMindMapLinks(parsed.links || []);
        } catch (e) {
          setMindMapNodes([]);
          setMindMapLinks([]);
        }
      }
    } else {
      clearInterval(videoIntervalRef.current);
    }
  }, [activeItem]);

  // Video interval timer simulation
  useEffect(() => {
    if (isVideoPlaying) {
      videoIntervalRef.current = setInterval(() => {
        setVideoPlayTime((prev) => {
          if (prev >= videoDuration) {
            setIsVideoPlaying(false);
            return videoDuration;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      clearInterval(videoIntervalRef.current);
    }
    return () => clearInterval(videoIntervalRef.current);
  }, [isVideoPlaying]);

  // Filter topics based on selected discipline
  const filteredAssuntos = assuntos.filter(
    (a) => !selectedDisciplinaId || a.disciplinaId === selectedDisciplinaId
  );

  // Perform semantic search without sending private licensed material metadata to the AI service.
  const handleSemanticSearch = async () => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setSemanticResults([]);
      return;
    }

    const queryTokens = query.split(/\s+/).filter((token) => token.length >= 2);
    const privateLocalResults = biblioteca
      .filter((item) => item.privateMaterial?.rightsClassification === "PRIVATE_LICENSED_USER_COPY")
      .map((item) => {
        const searchable = [item.titulo, item.descricao ?? "", ...item.tags].join(" ").toLowerCase();
        const matches = queryTokens.filter((token) => searchable.includes(token)).length;
        const exact = searchable.includes(query) ? 1 : 0;
        const score = Math.min(100, exact * 60 + matches * 15);
        return score > 0
          ? {
              id: item.id,
              score,
              justificativa: "Correspondência calculada localmente; metadados privados não foram enviados à IA."
            }
          : null;
      })
      .filter((item): item is { id: string; score: number; justificativa: string } => item !== null);

    setIsSearching(true);
    try {
      const publicItemsPayload = biblioteca
        .filter((item) => !item.privateMaterial)
        .map((item) => {
          const disc = disciplinas.find((discipline) => discipline.id === item.disciplinaId);
          const ass = assuntos.find((topic) => topic.id === item.assuntoId);
          return {
            id: item.id,
            titulo: item.titulo,
            descricao: item.descricao ?? "",
            tipoMaterial: item.tipoMaterial ?? "",
            tags: item.tags,
            disciplinaNome: disc?.nome ?? "",
            assuntoNome: ass?.nome ?? ""
          };
        });

      let publicResults: any[] = [];
      if (publicItemsPayload.length > 0) {
        const response = await authenticatedFetch("/api/semantic-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: searchQuery, items: publicItemsPayload })
        });
        if (!response.ok) throw new Error("Falha no servidor de busca semântica");
        const data = await response.json();
        publicResults = data.results || [];
      }

      setSemanticResults([...privateLocalResults, ...publicResults]);
    } catch (err) {
      console.error(err);
      const publicFallback = biblioteca
        .filter((item) => !item.privateMaterial && item.titulo.toLowerCase().includes(query))
        .map((item) => ({ id: item.id, score: 90, justificativa: "Correspondência direta de texto (Busca Local)." }));
      setSemanticResults([...privateLocalResults, ...publicFallback]);
    } finally {
      setIsSearching(false);
    }
  };

  // Perform local normal filter
  const getFilteredItems = (): any[] => {
    let items = [...biblioteca];

    // Semantic Search takes precedence if active and has queries
    if (isSemanticSearch && searchQuery.trim()) {
      return items
        .map(it => {
          const match = semanticResults.find(r => r.id === it.id);
          return match ? { ...it, semanticMatch: match } : null;
        })
        .filter((it): it is any => it !== null)
        .sort((a, b) => (b.semanticMatch?.score || 0) - (a.semanticMatch?.score || 0));
    }

    // Normal filtering
    if (selectedDisciplinaId) {
      items = items.filter((it) => it.disciplinaId === selectedDisciplinaId);
    }
    if (selectedAssuntoId) {
      items = items.filter((it) => it.assuntoId === selectedAssuntoId);
    }
    if (selectedType !== "ALL") {
      items = items.filter((it) => it.tipoMaterial === selectedType);
    }
    if (searchQuery && !isSemanticSearch) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (it) =>
          it.titulo.toLowerCase().includes(q) ||
          (it.descricao && it.descricao.toLowerCase().includes(q)) ||
          it.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return items;
  };

  // Catalog a local file using metadata only. File contents are never sent to the AI organizer.
  const handleFileUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    setIsOrganizing(true);
    setFormConteudoMarkdown("");

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      setFormTitulo(file.name.replace(/\.[^/.]+$/, ""));
      setFormDescricao("PDF catalogado por metadados. O conteúdo do arquivo não foi enviado à IA.");
      setFormDisciplinaId("");
      setFormAssuntoId("");
      setFormNovoAssuntoNome("");
      setFormTipoMaterial("PDF");
      setFormTags("pdf, local, privado");
      setIsOrganizing(false);
      return;
    }

    try {
      const response = await authenticatedFetch("/api/organize-material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          fileContent: "",
          fileType: file.type || "ARQUIVO",
          sensitivity: "METADATA_ONLY",
          disciplinasList: disciplinas.map((discipline) => ({
            id: discipline.id,
            nome: discipline.nome,
            assuntos: assuntos.filter((topic) => topic.disciplinaId === discipline.id)
          }))
        })
      });
      if (!response.ok) throw new Error();
      const organized = await response.json();
      setFormTitulo(organized.tituloOtimizado || file.name);
      setFormDescricao(organized.descricaoSintetizada || "Material catalogado somente por metadados.");
      setFormDisciplinaId(organized.disciplinaId || "");
      setFormAssuntoId(organized.assuntoId || "");
      setFormNovoAssuntoNome(organized.novoAssuntoNome || "");
      setFormTipoMaterial(organized.tipoMaterialSugerido || "LINK");
      setFormTags(organized.tagsSugeridas?.join(", ") || "material, local");
    } catch (err) {
      console.error(err);
      setFormTitulo(file.name.replace(/\.[^/.]+$/, ""));
      setFormDescricao("Arquivo catalogado manualmente por metadados.");
      setFormDisciplinaId("");
      setFormAssuntoId("");
      setFormTipoMaterial(isPdf ? "PDF" : "LINK");
      setFormTags("local, manual");
    } finally {
      setIsOrganizing(false);
    }
  };

  // Organize shared bookmark link or text notes
  const handleLinkAutoOrganize = async () => {
    if (!pastedUrl.trim()) return;

    setIsOrganizing(true);
    try {
      const response = await authenticatedFetch("/api/organize-material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: pastedUrl,
          fileContent: `URL de referência externa para estudo e leitura extra.`,
          fileType: "LINK",
          disciplinasList: disciplinas.map(d => ({
            id: d.id,
            nome: d.nome,
            assuntos: assuntos.filter(a => a.disciplinaId === d.id)
          }))
        })
      });

      if (!response.ok) throw new Error();
      const organized = await response.json();

      setFormTitulo(organized.tituloOtimizado || "Link Importado");
      setFormDescricao(organized.descricaoSintetizada || "URL externa importada com IA.");
      setFormDisciplinaId(organized.disciplinaId || disciplinas[0]?.id || "");
      setFormAssuntoId(organized.assuntoId || "");
      setFormNovoAssuntoNome(organized.novoAssuntoNome || "");
      setFormTipoMaterial(organized.tipoMaterialSugerido || "LINK");
      setFormTags(organized.tagsSugeridas?.join(", ") || "link, web");
      setIsOrganizing(false);
    } catch (err) {
      setFormTitulo("Link Externo");
      setFormDescricao(pastedUrl);
      setFormDisciplinaId(disciplinas[0]?.id || "");
      setFormAssuntoId("");
      setFormTipoMaterial("LINK");
      setFormTags("manual");
      setIsOrganizing(false);
    }
  };

  // Save the cataloged item to the store
  const handleSaveItem = () => {
    let finalAssuntoId = formAssuntoId;

    // Handle new topic recommendation
    if (!formAssuntoId && formNovoAssuntoNome.trim() && formDisciplinaId) {
      const newAssuntoId = "ass-" + Date.now();
      // Add subject to store directly
      useConcurseiroStore.getState().addAssunto({
        id: newAssuntoId,
        disciplinaId: formDisciplinaId,
        nome: formNovoAssuntoNome.trim(),
        ordem: assuntos.length + 1,
        prioridadeEdital: "MEDIA",
        metaQuestoesResolvidas: 100,
        questoesRespondidas: 0,
        questoesAcertadas: 0,
        tempoEstudadoMinutos: 0,
        progressoPorcentagem: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      finalAssuntoId = newAssuntoId;
    }

    const newItem: ItemBiblioteca = {
      id: "lib-" + Date.now(),
      concursoId: useConcurseiroStore.getState().configuracao.concursoAlvoId ?? undefined,
      disciplinaId: formDisciplinaId,
      assuntoId: finalAssuntoId,
      titulo: formTitulo,
      descricao: formDescricao,
      categoria: formCategoria,
      linkAcesso: pastedUrl || (uploadFile ? `local-metadata://${encodeURIComponent(uploadFile.name)}` : "local-metadata://manual"),
      isFavorito: false,
      tags: formTags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean),
      tipoMaterial: formTipoMaterial as any,
      conteudoMarkdown: formConteudoMarkdown || `# ${formTitulo}\n\n${formDescricao}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // If it's a Mind Map, seed it with default empty nodes
    if (formTipoMaterial === "MAPA_MENTAL") {
      newItem.dadosMapaMental = JSON.stringify({
        nodes: [
          { id: "1", label: formTitulo, x: 250, y: 150, color: "#3b82f6" }
        ],
        links: []
      });
    }

    addBibliotecaItem(newItem);
    setShowUploadModal(false);
    setUploadFile(null);
    setPastedUrl("");

    // Clear Form
    setFormTitulo("");
    setFormDescricao("");
    setFormDisciplinaId("");
    setFormAssuntoId("");
    setFormNovoAssuntoNome("");
  };

  // Video note bookmarks creation
  const handleAddVideoNote = () => {
    if (!videoNoteText.trim() || !activeItem) return;

    const currentNotes = activeItem.dadosVideo?.notasEstudo || [];
    const newNote = { tempo: videoPlayTime, texto: videoNoteText.trim() };
    const updatedNotes = [...currentNotes, newNote].sort((a, b) => a.tempo - b.tempo);

    updateBibliotecaItem(activeItem.id, {
      dadosVideo: {
        linkUrl: activeItem.dadosVideo?.linkUrl || activeItem.linkAcesso,
        notasEstudo: updatedNotes
      }
    });

    // Sync current activeItem view
    setActiveItem(prev => prev ? {
      ...prev,
      dadosVideo: {
        linkUrl: prev.dadosVideo?.linkUrl || prev.linkAcesso,
        notasEstudo: updatedNotes
      }
    } : null);

    setVideoNoteText("");
  };

  // PDF Page-level annotations
  const handleSavePdfPageNote = () => {
    if (!pdfNoteText.trim() || !activeItem) return;

    const currentNotes = activeItem.dadosPDF?.notasEstudo || [];
    const newNote = { pagina: pdfCurrentPage, texto: pdfNoteText.trim() };
    const filteredNotes = currentNotes.filter(n => n.pagina !== pdfCurrentPage);
    const updatedNotes = [...filteredNotes, newNote].sort((a, b) => a.pagina - b.pagina);

    updateBibliotecaItem(activeItem.id, {
      dadosPDF: {
        textoExtraido: activeItem.dadosPDF?.textoExtraido || "",
        totalPaginas: activeItem.dadosPDF?.totalPaginas || 1,
        notasEstudo: updatedNotes
      }
    });

    setActiveItem(prev => prev ? {
      ...prev,
      dadosPDF: {
        textoExtraido: prev.dadosPDF?.textoExtraido || "",
        totalPaginas: prev.dadosPDF?.totalPaginas || 1,
        notasEstudo: updatedNotes
      }
    } : null);

    setPdfNoteText("");
  };

  // Mind map dynamic actions
  const handleAddMapNode = () => {
    if (!newMapNodeLabel.trim() || !activeItem) return;

    const newNode = {
      id: "node-" + Date.now(),
      label: newMapNodeLabel.trim(),
      x: Math.floor(Math.random() * 250) + 100,
      y: Math.floor(Math.random() * 200) + 80,
      color: newMapNodeColor
    };

    const updatedNodes = [...mindMapNodes, newNode];
    setMindMapNodes(updatedNodes);

    const savedJSON = JSON.stringify({ nodes: updatedNodes, links: mindMapLinks });
    updateBibliotecaItem(activeItem.id, { dadosMapaMental: savedJSON });

    setNewMapNodeLabel("");
  };

  const handleConnectNodes = () => {
    if (!nodeSourceId || !nodeTargetId || !activeItem) return;

    // Check duplicate
    const exists = mindMapLinks.some(
      l => (l.source === nodeSourceId && l.target === nodeTargetId) ||
           (l.source === nodeTargetId && l.target === nodeSourceId)
    );

    if (exists || nodeSourceId === nodeTargetId) return;

    const newLink = { source: nodeSourceId, target: nodeTargetId };
    const updatedLinks = [...mindMapLinks, newLink];
    setMindMapLinks(updatedLinks);

    const savedJSON = JSON.stringify({ nodes: mindMapNodes, links: updatedLinks });
    updateBibliotecaItem(activeItem.id, { dadosMapaMental: savedJSON });

    setNodeSourceId("");
    setNodeTargetId("");
  };

  const handleDeleteNode = (nodeId: string) => {
    if (!activeItem) return;

    const updatedNodes = mindMapNodes.filter(n => n.id !== nodeId);
    const updatedLinks = mindMapLinks.filter(l => l.source !== nodeId && l.target !== nodeId);

    setMindMapNodes(updatedNodes);
    setMindMapLinks(updatedLinks);

    const savedJSON = JSON.stringify({ nodes: updatedNodes, links: updatedLinks });
    updateBibliotecaItem(activeItem.id, { dadosMapaMental: savedJSON });
  };

  // Helper formatting for timestamps
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  const typeStyles: Record<string, { bg: string; text: string; label: string }> = {
    PDF: { bg: "bg-rose-500/10 border-rose-500/20", text: "text-rose-400", label: "PDF" },
    VIDEO: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400", label: "Videoaula" },
    RESUMO: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400", label: "Resumo" },
    MAPA_MENTAL: { bg: "bg-violet-500/10 border-violet-500/20", text: "text-violet-400", label: "Mapa Mental" },
    QUESTAO: { bg: "bg-sky-500/10 border-sky-500/20", text: "text-sky-400", label: "Questões" },
    FLASHCARD: { bg: "bg-purple-500/10 border-purple-500/20", text: "text-purple-400", label: "Flashcards" },
    LINK: { bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-400", label: "Link Útil" },
    MARKDOWN: { bg: "bg-indigo-500/10 border-indigo-500/20", text: "text-indigo-400", label: "Ficha MD" },
    ANOTACAO: { bg: "bg-yellow-500/10 border-yellow-500/20", text: "text-yellow-400", label: "Anotação" }
  };

  // Retrieve questions for selected Assunto
  const activeSubjectQuestions = questoes.filter(
    q => q.assuntoId === activeItem?.assuntoId
  );

  const currentQuestion = activeSubjectQuestions[0]; // Simple single question solver inline

  // Retrieve flashcards for selected Assunto
  const activeSubjectCards = flashcards.filter(
    c => c.assuntoId === activeItem?.assuntoId
  );

  return (
    <div className="flex h-full w-full overflow-hidden bg-zinc-950" id="library-workspace-container">
      {/* 1. Left Filtering Sidebar & Hierarchy */}
      <div className="w-80 border-r border-zinc-900 bg-zinc-950 flex flex-col h-full select-none shrink-0">
        <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-500" />
            <h2 className="text-sm font-semibold text-zinc-100">Grade Curricular</h2>
          </div>
          <button 
            onClick={() => {
              setFormDisciplinaId(disciplinas[0]?.id || "");
              setShowUploadModal(true);
            }}
            className="p-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1 shadow-md hover:shadow-blue-500/20 transition-all"
            title="Importar ou Criar Item"
          >
            <Plus className="h-4 w-4" />
            <span>Adicionar</span>
          </button>
        </div>

        {/* Filters by Discipline & Subject */}
        <div className="p-4 flex flex-col gap-3 border-b border-zinc-900 bg-zinc-950/40">
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Disciplina</label>
            <select
              value={selectedDisciplinaId}
              onChange={(e) => {
                setSelectedDisciplinaId(e.target.value);
                setSelectedAssuntoId("");
              }}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md py-1.5 px-3 text-xs text-zinc-200 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">Todas as Disciplinas</option>
              {disciplinas.map((d) => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Assunto / Tópico</label>
            <select
              value={selectedAssuntoId}
              onChange={(e) => setSelectedAssuntoId(e.target.value)}
              disabled={!selectedDisciplinaId}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md py-1.5 px-3 text-xs text-zinc-200 focus:outline-none focus:border-blue-500 disabled:opacity-50 cursor-pointer"
            >
              <option value="">Todos os Assuntos</option>
              {filteredAssuntos.map((a) => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Side Rails (Material Type quick filter) */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="text-[10px] font-bold text-zinc-600 px-3 py-1 uppercase tracking-widest">Tipos de Acervos</div>
          <button
            onClick={() => setSelectedType("ALL")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-xs ${
              selectedType === "ALL" ? "bg-zinc-900 text-zinc-100 font-medium" : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
            }`}
          >
            <span>Todos os materiais</span>
            <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 font-mono">{biblioteca.length}</span>
          </button>

          {Object.entries(typeStyles).map(([key, style]) => {
            const count = biblioteca.filter(it => it.tipoMaterial === key).length;
            return (
              <button
                key={key}
                onClick={() => setSelectedType(key)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-xs ${
                  selectedType === key ? "bg-zinc-900 text-zinc-100 font-medium" : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${style.text.replace("text", "bg")}`} />
                  <span>{style.label}</span>
                </div>
                <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 font-mono">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Main Library Grid Display */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950">
        {/* Top Header Search Panel */}
        <div className="p-4 border-b border-zinc-900 flex flex-col gap-3 bg-zinc-950/80">
          <div className="flex items-center justify-between gap-4">
            {/* Standard vs Semantic search selection */}
            <div className="flex items-center bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 shrink-0">
              <button
                onClick={() => {
                  setIsSemanticSearch(false);
                  setSemanticResults([]);
                }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  !isSemanticSearch ? "bg-zinc-800 text-white shadow" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Pesquisa Normal
              </button>
              <button
                onClick={() => setIsSemanticSearch(true)}
                className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                  isSemanticSearch ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Busca Semântica IA</span>
              </button>
            </div>

            {/* Live active scope tags */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <span>Sincronizado offline-first</span>
            </div>
          </div>

          {/* Search Input Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder={isSemanticSearch ? "Conceitual: 'onde explica imunidade tributária recíproca?' ou 'limitações do estado'..." : "Digite termos, tags, títulos de leis..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (isSemanticSearch) handleSemanticSearch();
                }
              }}
              className={`w-full bg-zinc-900 border ${
                isSemanticSearch ? "border-blue-500/30 focus:border-blue-500/70" : "border-zinc-800 focus:border-zinc-700"
              } rounded-lg pl-10 pr-24 py-2 text-xs text-zinc-200 focus:outline-none`}
            />
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-500" />
            
            {isSemanticSearch ? (
              <button
                onClick={handleSemanticSearch}
                disabled={isSearching}
                className="absolute right-1.5 top-1.5 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-[10px] font-bold rounded-md flex items-center gap-1"
              >
                {isSearching ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                <span>Buscar</span>
              </button>
            ) : (
              <div className="absolute right-3.5 top-2.5 text-[10px] text-zinc-600 font-mono">ENTER</div>
            )}
          </div>
        </div>

        {/* Cards Grid Area */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {getFilteredItems().map((item) => {
                const style = typeStyles[item.tipoMaterial || "LINK"];
                const disc = disciplinas.find(d => d.id === item.disciplinaId);
                const ass = assuntos.find(a => a.id === item.assuntoId);

                return (
                  <motion.div
                    key={item.id}
                    layoutId={`card-${item.id}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => setActiveItem(item)}
                    className={`p-4 rounded-xl border bg-zinc-900/60 hover:bg-zinc-900 border-zinc-900 hover:border-zinc-800/80 transition-all cursor-pointer flex flex-col justify-between group h-44 relative overflow-hidden`}
                  >
                    {/* Glowing background highlights if semantic score is high */}
                    {item.semanticMatch && (
                      <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600" />
                    )}

                    <div>
                      {/* Top bar */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${style.bg} ${style.text}`}>
                            {style.label}
                          </span>
                          {item.privateMaterial && (
                            <span className="rounded border border-rose-500/25 bg-rose-500/10 px-1.5 py-0.5 text-[8px] font-bold text-rose-300">
                              PRIVADO
                            </span>
                          )}
                        </div>

                        {/* Semantic Relevance Badge */}
                        {item.semanticMatch && (
                          <div className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold text-blue-400">
                            <Sparkles className="h-3 w-3" />
                            <span>{item.semanticMatch.score}% relevância</span>
                          </div>
                        )}

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            updateBibliotecaItem(item.id, { isFavorito: !item.isFavorito });
                          }}
                          className="text-zinc-500 hover:text-zinc-300 p-0.5"
                        >
                          <Heart className={`h-4.5 w-4.5 ${item.isFavorito ? "text-red-500 fill-red-500" : ""}`} />
                        </button>
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-xs font-semibold text-zinc-100 line-clamp-1 group-hover:text-blue-400 transition-colors">
                        {item.titulo}
                      </h3>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1">
                        {item.descricao || "Nenhuma descrição fornecida."}
                      </p>

                      {/* Semantic Justification Tagline */}
                      {item.semanticMatch && (
                        <div className="mt-2 text-[10px] text-blue-400/80 italic line-clamp-1 bg-blue-500/5 p-1 rounded border border-blue-500/10">
                          &ldquo;{item.semanticMatch.justificativa}&rdquo;
                        </div>
                      )}
                    </div>

                    {/* Footer Info */}
                    <div className="flex items-center justify-between pt-3 mt-2 border-t border-zinc-900/80 text-[10px] text-zinc-500 font-mono">
                      <div className="truncate pr-2">
                        {disc?.nome} &bull; {ass?.nome || "Geral"}
                      </div>
                      <div className="shrink-0">
                        {item.privateMaterial
                          ? `${item.dadosPDF?.totalPaginas ?? 0} pág.`
                          : new Date(item.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {getFilteredItems().length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-500 h-64 border-2 border-dashed border-zinc-900 rounded-2xl">
              <Layers className="h-10 w-10 text-zinc-600 mb-3" />
              <p className="text-xs font-medium">Nenhum material encontrado com estes filtros.</p>
              <button 
                onClick={() => {
                  setSelectedDisciplinaId("");
                  setSelectedAssuntoId("");
                  setSelectedType("ALL");
                  setSearchQuery("");
                }}
                className="mt-3 text-xs text-blue-500 hover:underline"
              >
                Limpar todos os filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Immersive Split-Pane Workspace/Previewer */}
      <AnimatePresence>
        {activeItem && (
          <motion.div
            initial={{ opacity: 0, x: 200 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 200 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-[500px] border-l border-zinc-900 bg-zinc-950 flex flex-col h-full shadow-2xl relative z-10 shrink-0"
          >
            {/* Previewer Header */}
            <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2 truncate">
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${typeStyles[activeItem.tipoMaterial || "LINK"].bg} ${typeStyles[activeItem.tipoMaterial || "LINK"].text}`}>
                  {typeStyles[activeItem.tipoMaterial || "LINK"].label}
                </span>
                <h2 className="text-xs font-semibold text-zinc-100 truncate pr-2" title={activeItem.titulo}>
                  {activeItem.titulo}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {!activeItem.privateMaterial && (
                  <button 
                    onClick={() => deleteBibliotecaItem(activeItem.id)}
                    className="p-1.5 rounded hover:bg-zinc-900 text-zinc-500 hover:text-red-400 transition-colors"
                    title="Excluir Item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button 
                  onClick={() => setActiveItem(null)}
                  className="p-1.5 rounded hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Render Contextual Workspace depending on item type */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* PRIVATE LICENSED PDF LOCATOR — metadata only */}
              {activeItem.tipoMaterial === "PDF" && activeItem.privateMaterial && (
                <div className="flex flex-col gap-4">
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
                      <div>
                        <h3 className="text-xs font-semibold text-zinc-100">Material privado licenciado</h3>
                        <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                          Esta entrada é apenas um localizador pedagógico. O PDF original não está incorporado ao aplicativo, não é enviado ao Coach e não é incluído em backups ou pacotes.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <dl className="grid gap-3 text-xs">
                      <div>
                        <dt className="text-[9px] font-mono uppercase text-zinc-500">Curso</dt>
                        <dd className="mt-1 text-zinc-200">{activeItem.privateMaterial.courseTitle}</dd>
                      </div>
                      <div>
                        <dt className="text-[9px] font-mono uppercase text-zinc-500">Aula</dt>
                        <dd className="mt-1 text-zinc-300">{activeItem.privateMaterial.lessonLabel}</dd>
                      </div>
                      <div>
                        <dt className="text-[9px] font-mono uppercase text-zinc-500">Arquivo na cópia do usuário</dt>
                        <dd className="mt-1 break-all font-mono text-[10px] text-zinc-400">{activeItem.privateMaterial.sourceFileName}</dd>
                      </div>
                      <div>
                        <dt className="text-[9px] font-mono uppercase text-zinc-500">Extensão</dt>
                        <dd className="mt-1 text-zinc-300">{activeItem.dadosPDF?.totalPaginas ?? 0} páginas</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-[11px] leading-relaxed text-zinc-400">
                    A ênfase ou o tamanho desta apostila não influencia o ranking do SDE. O material é utilizado somente para localizar onde executar uma ação já decidida pelo motor.
                  </div>
                </div>
              )}

              {/* PDF READER WORKSPACE */}
              {activeItem.tipoMaterial === "PDF" && !activeItem.privateMaterial && (
                <div className="flex flex-col gap-4">
                  <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
                      <span className="text-[10px] font-mono text-zinc-400">Página {pdfCurrentPage} de {activeItem.dadosPDF?.totalPaginas || 3}</span>
                      <div className="flex gap-1">
                        <button 
                          disabled={pdfCurrentPage === 1}
                          onClick={() => setPdfCurrentPage(p => p - 1)}
                          className="p-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-300 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button 
                          disabled={pdfCurrentPage === (activeItem.dadosPDF?.totalPaginas || 3)}
                          onClick={() => setPdfCurrentPage(p => p + 1)}
                          className="p-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-300 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Extracted Text Viewer */}
                    <div className="text-xs text-zinc-300 leading-relaxed max-h-72 overflow-y-auto whitespace-pre-line font-serif">
                      {activeItem.dadosPDF?.textoExtraido || "Nenhum texto extraído."}
                    </div>
                  </div>

                  {/* PDF annotations */}
                  <div className="bg-zinc-900/30 rounded-xl border border-zinc-900 p-4">
                    <h4 className="text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1">
                      <Bookmark className="h-3.5 w-3.5 text-blue-500" />
                      <span>Notas na Página {pdfCurrentPage}</span>
                    </h4>

                    {/* Display existing page note */}
                    {activeItem.dadosPDF?.notasEstudo?.find(n => n.pagina === pdfCurrentPage) ? (
                      <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 text-xs text-zinc-300 mb-3 flex items-center justify-between">
                        <span>{activeItem.dadosPDF.notasEstudo.find(n => n.pagina === pdfCurrentPage)?.texto}</span>
                        <button 
                          onClick={() => {
                            const current = activeItem.dadosPDF?.notasEstudo || [];
                            const updated = current.filter(n => n.pagina !== pdfCurrentPage);
                            updateBibliotecaItem(activeItem.id, {
                              dadosPDF: {
                                textoExtraido: activeItem.dadosPDF?.textoExtraido || "",
                                totalPaginas: activeItem.dadosPDF?.totalPaginas || 3,
                                notasEstudo: updated
                              }
                            });
                            setActiveItem(prev => prev ? {
                              ...prev,
                              dadosPDF: {
                                textoExtraido: prev.dadosPDF?.textoExtraido || "",
                                totalPaginas: prev.dadosPDF?.totalPaginas || 3,
                                notasEstudo: updated
                              }
                            } : null);
                          }}
                          className="text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-500 mb-3">Nenhuma nota escrita nesta página.</p>
                    )}

                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Escreva uma anotação rápida..."
                        value={pdfNoteText}
                        onChange={(e) => setPdfNoteText(e.target.value)}
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-300 focus:outline-none"
                      />
                      <button 
                        onClick={handleSavePdfPageNote}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* VIDEO WORKSPACE (TIMESTAMPS & NOTES) */}
              {activeItem.tipoMaterial === "VIDEO" && (
                <div className="flex flex-col gap-4">
                  {/* Simulated video player UI */}
                  <div className="bg-zinc-950 aspect-video rounded-xl border border-zinc-900 flex flex-col justify-between p-4 relative overflow-hidden group">
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <button 
                        onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                        className="h-12 w-12 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-lg hover:scale-105 transition-all"
                      >
                        {isVideoPlaying ? <Pause className="h-6 w-6 fill-zinc-950" /> : <Play className="h-6 w-6 fill-zinc-950 ml-0.5" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono z-10">
                      <span>{formatTime(videoPlayTime)}</span>
                      <span>{formatTime(videoDuration)}</span>
                    </div>

                    {/* Timeline bar */}
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden cursor-pointer z-10">
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-300"
                        style={{ width: `${(videoPlayTime / videoDuration) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Bookmark note editor */}
                  <div className="bg-zinc-900/30 rounded-xl border border-zinc-900 p-4">
                    <h4 className="text-xs font-semibold text-zinc-300 mb-3 flex items-center gap-1">
                      <Bookmark className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Anotações com Bookmark Sincronizado</span>
                    </h4>

                    {/* Bookmarked lists */}
                    <div className="space-y-2 max-h-48 overflow-y-auto mb-3 pr-1">
                      {(activeItem.dadosVideo?.notasEstudo || []).map((note, index) => (
                        <div 
                          key={index}
                          onClick={() => setVideoPlayTime(note.tempo)}
                          className="flex items-start gap-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer text-xs"
                        >
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">
                            {formatTime(note.tempo)}
                          </span>
                          <span className="text-zinc-300 line-clamp-2">{note.texto}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Nota no tempo atual..."
                        value={videoNoteText}
                        onChange={(e) => setVideoNoteText(e.target.value)}
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-300 focus:outline-none"
                      />
                      <button 
                        onClick={handleAddVideoNote}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-xs text-white shrink-0"
                      >
                        Anotar ({formatTime(videoPlayTime)})
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* INTERACTIVE MIND MAP BUILDER */}
              {activeItem.tipoMaterial === "MAPA_MENTAL" && (
                <div className="flex flex-col gap-4">
                  <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-2">
                    <div className="text-[10px] text-zinc-500 uppercase font-mono px-2 mb-1">Canvas Interativo</div>
                    
                    {/* SVG Graphic Area */}
                    <div className="w-full bg-zinc-950 h-64 rounded-lg relative overflow-hidden border border-zinc-900">
                      <svg className="w-full h-full">
                        {/* Render link pathways */}
                        {mindMapLinks.map((link, idx) => {
                          const srcNode = mindMapNodes.find(n => n.id === link.source);
                          const tgtNode = mindMapNodes.find(n => n.id === link.target);
                          if (!srcNode || !tgtNode) return null;
                          return (
                            <line
                              key={idx}
                              x1={srcNode.x}
                              y1={srcNode.y}
                              x2={tgtNode.x}
                              y2={tgtNode.y}
                              stroke="#52525b"
                              strokeWidth="1.5"
                              strokeDasharray="4 2"
                            />
                          );
                        })}

                        {/* Render visual nodes */}
                        {mindMapNodes.map((node) => (
                          <g key={node.id}>
                            <rect
                              x={node.x - 55}
                              y={node.y - 18}
                              width="110"
                              height="36"
                              rx="6"
                              fill={node.color}
                              fillOpacity="0.15"
                              stroke={node.color}
                              strokeWidth="1.5"
                            />
                            <text
                              x={node.x}
                              y={node.y + 4}
                              textAnchor="middle"
                              fill="#f4f4f5"
                              fontSize="9"
                              fontWeight="bold"
                            >
                              {node.label}
                            </text>
                            {/* Simple Delete dot */}
                            <circle
                              cx={node.x + 50}
                              cy={node.y - 14}
                              r="5"
                              fill="#ef4444"
                              className="cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteNode(node.id)}
                            />
                          </g>
                        ))}
                      </svg>
                    </div>
                  </div>

                  {/* Nodes and Connection controls */}
                  <div className="bg-zinc-900/30 rounded-xl border border-zinc-900 p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
                      <Map className="h-3.5 w-3.5 text-violet-500" />
                      <span>Desenhar Mapa Mental</span>
                    </h4>

                    {/* Form to create Node */}
                    <div className="flex gap-2 items-center">
                      <input 
                        type="text" 
                        placeholder="Rótulo do novo nó..."
                        value={newMapNodeLabel}
                        onChange={(e) => setNewMapNodeLabel(e.target.value)}
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-300 focus:outline-none"
                      />
                      <input 
                        type="color" 
                        value={newMapNodeColor}
                        onChange={(e) => setNewMapNodeColor(e.target.value)}
                        className="w-8 h-7 bg-transparent border-0 cursor-pointer"
                      />
                      <button 
                        onClick={handleAddMapNode}
                        className="px-3 py-1 bg-violet-600 hover:bg-violet-500 rounded text-xs text-white"
                      >
                        Nó+
                      </button>
                    </div>

                    {/* Form to Connect Nodes */}
                    <div className="flex gap-2 items-center pt-2 border-t border-zinc-900">
                      <select
                        value={nodeSourceId}
                        onChange={(e) => setNodeSourceId(e.target.value)}
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded p-1 text-xs text-zinc-300"
                      >
                        <option value="">Origem...</option>
                        {mindMapNodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                      </select>
                      <ArrowRight className="h-4 w-4 text-zinc-500 shrink-0" />
                      <select
                        value={nodeTargetId}
                        onChange={(e) => setNodeTargetId(e.target.value)}
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded p-1 text-xs text-zinc-300"
                      >
                        <option value="">Destino...</option>
                        {mindMapNodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                      </select>
                      <button 
                        onClick={handleConnectNodes}
                        className="px-3 py-1 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 rounded text-xs text-zinc-200"
                      >
                        Ligar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* INTEGRATED EXERCISE SOLVER (QUESTOES) */}
              {activeItem.tipoMaterial === "QUESTAO" && (
                <div className="flex flex-col gap-4">
                  {currentQuestion ? (
                    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
                        <span className="text-[10px] font-mono text-zinc-400">Banco de Exercícios</span>
                        <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                          {currentQuestion.banca} &bull; {currentQuestion.ano}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-200 leading-relaxed mb-4">
                        {currentQuestion.enunciado}
                      </p>

                      <div className="space-y-2">
                        {currentQuestion.opcoes.map((opt) => (
                          <button
                            key={opt.id}
                            disabled={isQuestionAnswered}
                            onClick={() => setSelectedQuestionOption(opt.id)}
                            className={`w-full p-2.5 rounded-lg border text-left text-xs transition-all flex items-start gap-2 ${
                              isQuestionAnswered
                                ? opt.isCorreta
                                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                                  : selectedQuestionOption === opt.id
                                    ? "bg-red-500/10 border-red-500 text-red-400"
                                    : "bg-zinc-900/40 border-zinc-900 text-zinc-500"
                                : selectedQuestionOption === opt.id
                                  ? "bg-blue-500/10 border-blue-500 text-blue-400"
                                  : "bg-zinc-900/40 border-zinc-900 hover:border-zinc-800 text-zinc-300"
                            }`}
                          >
                            <span className="font-bold shrink-0">{opt.letra})</span>
                            <span>{opt.texto}</span>
                          </button>
                        ))}
                      </div>

                      {/* Solver Action Trigger */}
                      {!isQuestionAnswered ? (
                        <button
                          disabled={!selectedQuestionOption}
                          onClick={() => {
                            const correct = currentQuestion.opcoes.find(o => o.id === selectedQuestionOption)?.isCorreta || false;
                            setIsQuestionAnswered(true);
                            resolveQuestao(currentQuestion.id, selectedQuestionOption, correct, 25);
                          }}
                          className="w-full mt-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-semibold text-white rounded-lg transition-all"
                        >
                          Enviar Resposta
                        </button>
                      ) : (
                        <div className="mt-4 pt-3 border-t border-zinc-800 text-xs text-zinc-400">
                          <p className="font-semibold text-zinc-200 mb-1">Explicação Geral:</p>
                          <p className="italic">{currentQuestion.explicacaoGeral || "Nenhuma explicação escrita disponível."}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-zinc-500 border-2 border-dashed border-zinc-900 rounded-xl">
                      <HelpCircle className="h-8 w-8 mx-auto mb-2 text-zinc-700" />
                      <p className="text-xs">Nenhuma questão vinculada a este assunto na base.</p>
                    </div>
                  )}
                </div>
              )}

              {/* INTEGRATED FLASHCARDS DECK (SPACED REPETITION) */}
              {activeItem.tipoMaterial === "FLASHCARD" && (
                <div className="flex flex-col gap-4">
                  {activeSubjectCards.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      <div className="text-[10px] font-mono text-zinc-500 text-right">
                        Card {activeCardIndex + 1} de {activeSubjectCards.length}
                      </div>

                      {/* 3D Flip Card Container */}
                      <div 
                        onClick={() => setIsCardFlipped(!isCardFlipped)}
                        className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 min-h-48 flex flex-col justify-between items-center text-center cursor-pointer hover:border-zinc-700 transition-all shadow-md"
                      >
                        <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                          {isCardFlipped ? "RESPOSTA" : "PERGUNTA"}
                        </div>

                        <p className="text-xs font-semibold text-zinc-100 px-4 leading-relaxed my-auto">
                          {isCardFlipped 
                            ? activeSubjectCards[activeCardIndex].resposta 
                            : activeSubjectCards[activeCardIndex].pergunta
                          }
                        </p>

                        <div className="text-[10px] text-zinc-500 mt-2 font-mono">
                          Clique para girar o card
                        </div>
                      </div>

                      {/* Retrieval result: observable outcome, not an ease score. */}
                      {isCardFlipped && (
                        <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                          <p className="text-[10px] font-bold text-zinc-400 text-center mb-2 uppercase">
                            O que ocorreu antes de consultar o verso?
                          </p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {([
                              ["FAILED", "Não recuperei"],
                              ["EFFORTFUL", "Com esforço"],
                              ["FLUENT", "Com fluência"],
                            ] as Array<[FlashcardRetrievalPerformance, string]>).map(([performance, label]) => (
                              <button
                                key={performance}
                                onClick={() => {
                                  reviewFlashcard(activeSubjectCards[activeCardIndex].id, performance);
                                  setIsCardFlipped(false);
                                  if (activeCardIndex < activeSubjectCards.length - 1) {
                                    setActiveCardIndex((previous) => previous + 1);
                                  } else {
                                    setActiveCardIndex(0);
                                  }
                                }}
                                className="py-1.5 px-1 bg-zinc-800 hover:bg-zinc-700 rounded text-[10px] font-mono font-bold text-zinc-300 transition-colors cursor-pointer"
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          <p className="text-[9px] text-zinc-600 text-center mt-2">
                            O intervalo é recalculado pelo histórico observado e pela proximidade da prova.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-zinc-500 border-2 border-dashed border-zinc-900 rounded-xl">
                      <Layers className="h-8 w-8 mx-auto mb-2 text-zinc-700" />
                      <p className="text-xs">Nenhum flashcard cadastrado para este assunto.</p>
                    </div>
                  )}
                </div>
              )}

              {/* MARKDOWN RICH NOTE VIEWER & EDITOR */}
              {activeItem.tipoMaterial === "MARKDOWN" && (
                <div className="flex flex-col gap-3 h-full">
                  <div className="flex justify-between items-center bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Ficha de Estudos Markdown</span>
                    <button 
                      onClick={() => {
                        updateBibliotecaItem(activeItem.id, { conteudoMarkdown: formConteudoMarkdown });
                        alert("Ficha Markdown salva com sucesso!");
                      }}
                      className="px-2.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-[10px] text-zinc-200 cursor-pointer"
                    >
                      Salvar Alterações
                    </button>
                  </div>

                  {/* Split editor / preview pane */}
                  <div className="grid grid-cols-2 gap-3 h-96">
                    {/* Editor Pane */}
                    <div className="flex flex-col h-full">
                      <div className="text-[10px] font-mono text-zinc-500 mb-1">Editor</div>
                      <textarea
                        value={formConteudoMarkdown}
                        onChange={(e) => setFormConteudoMarkdown(e.target.value)}
                        className="w-full flex-1 bg-zinc-900 border border-zinc-800 rounded p-2 text-[10px] font-mono text-zinc-200 focus:outline-none resize-none"
                      />
                    </div>

                    {/* Preview Pane */}
                    <div className="flex flex-col h-full overflow-y-auto">
                      <div className="text-[10px] font-mono text-zinc-500 mb-1">Preview Renderizado</div>
                      <div className="w-full flex-1 bg-zinc-900/40 border border-zinc-900 rounded p-3 text-[11px] prose prose-invert overflow-y-auto max-h-80">
                        <div className="whitespace-pre-line text-zinc-300 font-serif leading-relaxed">
                          {formConteudoMarkdown || "*Escreva markdown ao lado para pré-visualizar...*"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ANOTACOES & WEBLINKS */}
              {(activeItem.tipoMaterial === "LINK" || activeItem.tipoMaterial === "ANOTACAO") && (
                <div className="flex flex-col gap-4">
                  <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
                    <h3 className="text-xs font-semibold text-zinc-200 mb-2">Visão Geral do Recurso</h3>
                    <p className="text-xs text-zinc-400 mb-4">{activeItem.descricao || "Sem detalhes extras cadastrados."}</p>

                    {activeItem.tipoMaterial === "LINK" ? (
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Endereço de Acesso Externo</span>
                        <div className="flex items-center gap-2 p-2.5 bg-zinc-950 rounded-lg border border-zinc-900 text-xs">
                          <LinkIcon className="h-4 w-4 text-zinc-500 shrink-0" />
                          <span className="text-blue-400 truncate flex-1">{activeItem.linkAcesso}</span>
                          <a 
                            href={activeItem.linkAcesso} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="p-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded border border-zinc-800 hover:scale-105 transition-all"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Nota Adesiva do Estudante</span>
                        <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 text-xs text-zinc-300 leading-relaxed font-mono">
                          {activeItem.conteudoMarkdown || activeItem.descricao}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Upload & Manual Organization AI Popup Dialog */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-900 w-full max-w-lg rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-500" />
                  <h3 className="text-sm font-semibold text-zinc-100">Catalogar Material Inteligente com IA</h3>
                </div>
                <button 
                  onClick={() => setShowUploadModal(false)}
                  className="p-1.5 rounded hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                {/* Drag and Drop Input zone */}
                <div className="border-2 border-dashed border-zinc-900 hover:border-zinc-800 rounded-xl p-6 text-center relative group transition-colors">
                  <Upload className="h-8 w-8 mx-auto text-zinc-600 mb-2 group-hover:text-zinc-500 transition-colors" />
                  <p className="text-xs font-semibold text-zinc-300">Arraste arquivos ou clique para buscar</p>
                  <p className="text-[10px] text-zinc-500 mt-1">Aceita PDF, DOCX, CSV, XLSX, TXT ou Markdown</p>
                  <input 
                    type="file" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>

                {/* Paste URL block alternative */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ou cole uma URL (YouTube, Plenário, Legislação)..."
                    value={pastedUrl}
                    onChange={(e) => setPastedUrl(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700"
                  />
                  <button
                    onClick={handleLinkAutoOrganize}
                    className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs text-zinc-300 font-semibold"
                  >
                    Analisar Link
                  </button>
                </div>

                {/* Loading state indicator */}
                {isOrganizing && (
                  <div className="flex items-center justify-center gap-2.5 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl text-xs text-blue-400">
                    <RefreshCw className="h-4.5 w-4.5 animate-spin text-blue-500" />
                    <span className="font-semibold">O motor de IA do ConcurseiroOS está catalogando seu material...</span>
                  </div>
                )}

                {/* Custom review form */}
                {!isOrganizing && (
                  <div className="space-y-3 pt-3 border-t border-zinc-900/60 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Título do Recurso</label>
                        <input
                          type="text"
                          value={formTitulo}
                          onChange={(e) => setFormTitulo(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Categoria</label>
                        <select
                          value={formCategoria}
                          onChange={(e: any) => setFormCategoria(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none"
                        >
                          <option value="LEGISLACAO">Legislação</option>
                          <option value="DOUTRINA">Doutrina</option>
                          <option value="JURISPRUDENCIA">Jurisprudência</option>
                          <option value="BIBLIOGRAFIA">Bibliografia</option>
                          <option value="OUTROS">Outros</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Descrição / Notas IA</label>
                      <textarea
                        value={formDescricao}
                        onChange={(e) => setFormDescricao(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-300 focus:outline-none h-14 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Classificar na Disciplina</label>
                        <select
                          value={formDisciplinaId}
                          onChange={(e) => {
                            setFormDisciplinaId(e.target.value);
                            setFormAssuntoId("");
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none cursor-pointer"
                        >
                          <option value="">Selecione...</option>
                          {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Vincular ao Assunto</label>
                        <select
                          value={formAssuntoId}
                          onChange={(e) => setFormAssuntoId(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none cursor-pointer"
                        >
                          <option value="">-- Assunto Recomendado / Criar Novo --</option>
                          {assuntos.filter(a => a.disciplinaId === formDisciplinaId).map(a => (
                            <option key={a.id} value={a.id}>{a.nome}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* New subject prediction name text field */}
                    {!formAssuntoId && (
                      <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/10">
                        <label className="text-[10px] font-bold text-blue-400 uppercase block mb-1">Novo Assunto Recomendado pela IA</label>
                        <input
                          type="text"
                          placeholder="Ex: Teoria de Atos e Classificação..."
                          value={formNovoAssuntoNome}
                          onChange={(e) => setFormNovoAssuntoNome(e.target.value)}
                          className="w-full bg-zinc-900 border border-blue-500/20 focus:border-blue-500/50 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none"
                        />
                        <p className="text-[9px] text-zinc-500 mt-1">Este assunto será criado automaticamente e o material será catalogado nele.</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Tipo de Material</label>
                        <select
                          value={formTipoMaterial}
                          onChange={(e) => setFormTipoMaterial(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none"
                        >
                          <option value="PDF">PDF / Apostila</option>
                          <option value="VIDEO">Videoaula / Aula</option>
                          <option value="RESUMO">Resumo Sintetizado</option>
                          <option value="MAPA_MENTAL">Mapa Mental</option>
                          <option value="QUESTAO">Questão de Concurso</option>
                          <option value="FLASHCARD">Flashcard</option>
                          <option value="LINK">Link / Bookmark</option>
                          <option value="MARKDOWN">Markdown Livre</option>
                          <option value="ANOTACAO">Nota Adesiva</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Tags (separadas por vírgula)</label>
                        <input
                          type="text"
                          placeholder="constituição, controle, art37"
                          value={formTags}
                          onChange={(e) => setFormTags(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons footer */}
              <div className="p-4 border-t border-zinc-900 bg-zinc-950 flex justify-end gap-2.5">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-300 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveItem}
                  disabled={isOrganizing || !formTitulo || !formDisciplinaId}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-md shadow-blue-500/10"
                >
                  Confirmar e Catalogar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
