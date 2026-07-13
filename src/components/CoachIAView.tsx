import { useState, useRef, useEffect } from "react";
import { useConcurseiroStore } from "../store";
import { 
  Brain, Send, Sparkles, TrendingUp, Plus, 
  Target, Layers, Activity, Clock, AlertTriangle, 
  CheckCircle2, BarChart3, ArrowUpRight, PieChart, 
  BookOpen, Library, FileQuestion, GraduationCap,
  Cpu, Database, Code2, GitMerge, Terminal, Network, ShieldAlert,
  Search, MessageSquare, RefreshCw
} from "lucide-react";
import { authenticatedFetch } from "../integrations/cloud/authenticatedFetch";
import { MensagemChat } from "../types";
import { buildCoachGroundingContext } from "../integrations/coach/coachContext";
import { DATAPREV_2026_PRIVATE_STUDY_MATERIALS } from "../config/concursos/dataprev-2026-perfil-3/privateStudyMaterials";

// The 12 custom AI study coaches with distinct styles and focus areas
const AGENTS = [
  {
    id: "geral",
    name: "Coach Geral",
    description: "Ciclos de estudo, cronogramas de revisão ativas e táticas de produtividade.",
    badge: "Metodologia Geral",
    welcomeMessage: "Olá! Sou seu **Coach Geral de Estudos**. Estou pronto para estruturar seus ciclos de estudos, revisar metodologias ou calibrar sua rotina de alto rendimento. Como posso acelerar sua aprovação hoje?",
    icon: Brain,
    colorClass: "text-purple-400 border-purple-500/20 bg-purple-500/5",
    iconColor: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30"
  },
  {
    id: "fgv",
    name: "Coach FGV",
    description: "Especialista em desconstruir pegadinhas de Português e Exatas da temida FGV.",
    badge: "Banca FGV",
    welcomeMessage: "Atenção cirúrgica! Sou seu **Coach FGV**. Conheço as artimanhas do temido Português da FGV e o perfil analítico das provas de Direito e Exatas. Qual enunciado ou assunto complexo vamos desmistificar agora?",
    icon: Target,
    colorClass: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
    iconColor: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30"
  },
  {
    id: "cespe",
    name: "Coach CESPE",
    description: "Estrategista de Certo/Errado do Cebraspe e controle tático de riscos de chute.",
    badge: "Banca Cebraspe",
    welcomeMessage: "Saudações, estrategista. Sou seu **Coach CESPE**. Aqui o controle de riscos é soberano: uma errada anula uma certa. Vamos planejar suas táticas de chute e análise de jurisprudências? Mande sua dúvida!",
    icon: AlertTriangle,
    colorClass: "text-amber-400 border-amber-500/20 bg-amber-500/5",
    iconColor: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30"
  },
  {
    id: "fcc",
    name: "Coach FCC",
    description: "Memorização rigorosa de lei seca, prazos e doutrina majoritária clássica.",
    badge: "Banca FCC",
    welcomeMessage: "Foco total na literalidade! Sou seu **Coach FCC**. O segredo do sucesso na FCC é a repetição assertiva da lei seca e o domínio de regimentos internos. Qual artigo ou lei seca vamos destrinchar hoje?",
    icon: Layers,
    colorClass: "text-blue-400 border-blue-500/20 bg-blue-500/5",
    iconColor: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30"
  },
  {
    id: "portugues",
    name: "Coach Português",
    description: "Gabarite Língua Portuguesa: sintaxe, regência, crase e interpretação de texto.",
    badge: "Português",
    welcomeMessage: "Olá! Sou seu **Coach de Língua Portuguesa**. A gramática normativa é o diferencial em qualquer concurso público de elite. Qual regra, crase ou análise de período composto vamos dominar hoje?",
    icon: BookOpen,
    colorClass: "text-teal-400 border-teal-500/20 bg-teal-500/5",
    iconColor: "text-teal-400",
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/30"
  },
  {
    id: "ti",
    name: "Coach TI",
    description: "Governança (COBIT/ITIL), engenharia de requisitos, PMBOK e infraestrutura.",
    badge: "TI Geral",
    welcomeMessage: "Sistema operacional online. Sou seu **Coach TI**. Seus desafios de governança de TI, gestão de projetos PMBOK ou infraestrutura avançada serão resolvidos com lógica e pragmatismo técnico. O que vamos codificar ou analisar hoje?",
    icon: Cpu,
    colorClass: "text-indigo-400 border-indigo-500/20 bg-indigo-500/5",
    iconColor: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/30"
  },
  {
    id: "db",
    name: "Coach Banco de Dados",
    description: "DBA focado em modelagem E-R, consultas SQL complexas, NoSQL e Big Data.",
    badge: "Banco de Dados",
    welcomeMessage: "Conexão estabelecida com a base. Sou seu **Coach de Banco de Dados**. De modelagem relacional a normalização (1FN a 3FN), NoSQL e otimização de queries SQL complexas: o que vamos consultar hoje?",
    icon: Database,
    colorClass: "text-cyan-400 border-cyan-500/20 bg-cyan-500/5",
    iconColor: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30"
  },
  {
    id: "java",
    name: "Coach Java",
    description: "Desenvolvedor sênior com domínio absoluto de POO, JVM, Spring Boot e JPA.",
    badge: "Especialista Java",
    welcomeMessage: "`public class Mentoria` iniciada! Sou seu **Coach Java**. JVM, gerenciamento de memória, Spring Boot, frameworks ORM ou concorrência multithread: mande sua dúvida ou snippet para debugar!",
    icon: Code2,
    colorClass: "text-red-400 border-red-500/20 bg-red-500/5",
    iconColor: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30"
  },
  {
    id: "eng_software",
    name: "Coach Engenharia de Software",
    description: "Processos de desenvolvimento, padrões GoF, arquiteturas e metodologias ágeis.",
    badge: "Eng. de Software",
    welcomeMessage: "Pipeline de desenvolvimento ativado. Sou seu **Coach de Engenharia de Software**. Vamos blindar seus conceitos de padrões de projeto (GoF), metodologias ágeis (Scrum/Kanban), DevOps e arquitetura limpa. Qual tópico vamos revisar?",
    icon: GitMerge,
    colorClass: "text-fuchsia-400 border-fuchsia-500/20 bg-fuchsia-500/5",
    iconColor: "text-fuchsia-400",
    bgColor: "bg-fuchsia-500/10",
    borderColor: "border-fuchsia-500/30"
  },
  {
    id: "linux",
    name: "Coach Linux",
    description: "Sysadmin focado em comandos shell avançados, permissões e systemd.",
    badge: "Sistemas Linux",
    welcomeMessage: "`root@concurseiro-os:~#` Sou seu **Coach Linux**. Da mecânica de permissões octais e simbólicas, manipulação de streams com sed/awk/grep, até estrutura FHS e systemd: mude de nível na linha de comando!",
    icon: Terminal,
    colorClass: "text-orange-400 border-orange-500/20 bg-orange-500/5",
    iconColor: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30"
  },
  {
    id: "redes",
    name: "Coach Redes",
    description: "Modelo OSI, roteamento de pacotes TCP/IP, subredes e portas de serviços.",
    badge: "Redes & Infra",
    welcomeMessage: "Ping estabelecido de 0ms! Sou seu **Coach de Redes de Computadores**. Vamos mapear as camadas do modelo OSI e TCP/IP, endereçamento de subredes, portas de serviço e handshakes. Qual pacote vamos farejar hoje?",
    icon: Network,
    colorClass: "text-sky-400 border-sky-500/20 bg-sky-500/5",
    iconColor: "text-sky-400",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/30"
  },
  {
    id: "seguranca",
    name: "Coach Segurança",
    description: "Criptografia, hashes, ataques, normas ISO 27001/2 e conformidade LGPD.",
    badge: "Segurança",
    welcomeMessage: "Canal seguro estabelecido. Sou seu **Coach de Segurança da Informação**. Vamos estudar criptografia simétrica/assimétrica, assinaturas digitais, prevenção de injeção SQL/XSS, firewalls e controle de acesso baseado em menor privilégio. Qual ativo vamos proteger hoje?",
    icon: ShieldAlert,
    colorClass: "text-rose-400 border-rose-500/20 bg-rose-500/5",
    iconColor: "text-rose-400",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/30"
  }
];

function currentDateKey(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default function CoachIAView() {
  const { 
    conversasIA, activeChatId, addChatMessage, createNewChat, estatisticas,
    concursos, activeConcursoId, disciplinas, assuntos, flashcards, simulados, 
    cronogramasRevisao, subassuntos, biblioteca, documentos,
    tentativasQuestoes, sessoesEstudo, historicoAtividades, configuracao,
    ultimaDecisaoSDE, executarSDEParaData
  } = useConcurseiroStore();

  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"agents" | "impact">("agents");
  const [agentSearch, setAgentSearch] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Derive active chat
  const activeChat = conversasIA.find(c => c.id === activeChatId) || conversasIA[0];

  // Helper to resolve which agent is associated with a given chat
  const getAgentFromChat = (chat: any) => {
    if (!chat) return AGENTS[0];
    const title = chat.titulo || "";
    const found = AGENTS.find(a => title.includes(a.name));
    return found || AGENTS[0];
  };

  const activeAgent = getAgentFromChat(activeChat);

  // Auto scroll to chat end
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.mensagens, isSending]);

  // Real-time statistical computations
  const totalQuestoes = estatisticas?.questoesRespondidas || 0;
  const acertos = estatisticas?.questoesAcertadas || 0;
  const erros = totalQuestoes - acertos;
  const taxaAcerto = totalQuestoes > 0 ? Math.round((acertos / totalQuestoes) * 100) : 0;
  const calculatedTaxaAcerto = taxaAcerto;
  
  const totalTempoEstudado = disciplinas.reduce((acc, d) => acc + (d.tempoTotalEstudoMinutos || 0), 0);
  
  const totalFlashcards = flashcards.length;
  const flashcardsARevisar = flashcards.filter(f => {
    try {
      return new Date(f.proximaRevisaoData) <= new Date();
    } catch {
      return false;
    }
  }).length;
  
  const totalSimulados = simulados.length;
  const mediaSimulados = totalSimulados > 0 
    ? Math.round(simulados.reduce((acc, s) => acc + (s.percentualAcertos || 0), 0) / totalSimulados)
    : 0;

  const totalRevisoesAtivas = cronogramasRevisao.filter(cr => !cr.desabilitada).length;
  const revisoesAtrasadas = cronogramasRevisao.filter(cr => !cr.desabilitada && new Date(cr.proximaRevisaoData) <= new Date()).length;

  const totalSubassuntos = subassuntos.length;
  const subassuntosCompletados = subassuntos.filter(sa => sa.completado).length;
  const percentualEdital = totalSubassuntos > 0 ? Math.round((subassuntosCompletados / totalSubassuntos) * 100) : 0;

  const totalBiblioteca = biblioteca ? biblioteca.length : documentos.length;

  const handleSendMessage = async (textToSend?: string) => {
    const rawMsg = textToSend || inputMessage;
    if (!rawMsg.trim() || isSending) return;

    let targetChatId = activeChat?.id;

    // Determine currently active agent based on either activeChat or client state selection
    const currentAgent = activeAgent;

    if (!targetChatId) {
      // Create chat for this specific agent if none exists
      targetChatId = createNewChat(activeConcursoId || undefined, `Central - ${currentAgent.name}`);
    }

    // Add user message to state
    addChatMessage(targetChatId, {
      remetente: "USER",
      conteudo: rawMsg
    });

    setInputMessage("");
    setIsSending(true);

    try {
      // Contexto factual: registros granulares + decisão estruturada do SDE.
      const referenceDate = currentDateKey(
        configuracao.disponibilidadeEstudo.timeZone
      );
      const decision =
        ultimaDecisaoSDE?.referenceDate === referenceDate
          ? ultimaDecisaoSDE
          : executarSDEParaData(referenceDate);
      const performanceContext = buildCoachGroundingContext({
        referenceDate,
        configuracao,
        disciplinas,
        assuntos,
        subassuntos,
        tentativasQuestoes,
        sessoesEstudo,
        cronogramasRevisao,
        historicoAtividades,
        decision,
        privateMaterialCatalog: DATAPREV_2026_PRIVATE_STUDY_MATERIALS
      });

      // Call API endpoint passing agentId
      const response = await authenticatedFetch("/api/coach-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: rawMsg,
          history: activeChat ? activeChat.mensagens.map(m => ({
            role: m.remetente === "USER" ? "user" as const : "model" as const,
            text: m.id === "m-welcome" ? getWelcomeMessageForChat(activeChat) : m.conteudo
          })) : [],
          performanceContext,
          decisionContext: performanceContext.decisaoSDE,
          safetyMode: "SDE_GROUNDED",
          agentId: currentAgent.id
        })
      });

      if (!response.ok) {
        throw new Error("Erro na conexão com a Central de Inteligência.");
      }

      const parsed = await response.json();
      
      // Save AI Response to state
      addChatMessage(targetChatId, {
        remetente: "AI",
        conteudo: parsed.reply || "Desculpe, tive um contratempo para computar as respostas."
      });

    } catch (err: any) {
      console.error(err);
      addChatMessage(targetChatId, {
        remetente: "AI",
        conteudo: `🚨 **Falha na Central de Inteligência**:\nNão foi possível contatar o modelo analítico do ${currentAgent.name}: ${err.message}`
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickQuestion = (questionPrompt: string) => {
    handleSendMessage(questionPrompt);
  };

  // Switch active agent: search for existing chat of this agent, or create a brand new one
  const handleSwitchAgent = (agentId: string) => {
    const agent = AGENTS.find(a => a.id === agentId);
    if (!agent) return;

    const existingChat = conversasIA.find(c => c.titulo.includes(agent.name));
    if (existingChat) {
      useConcurseiroStore.setState({ activeChatId: existingChat.id });
    } else {
      createNewChat(activeConcursoId || undefined, `Central - ${agent.name}`);
    }
  };

  const getWelcomeMessageForChat = (chat: any) => {
    if (!chat) return AGENTS[0].welcomeMessage;
    const title = chat.titulo || "";
    const found = AGENTS.find(a => title.includes(a.name));
    return found ? found.welcomeMessage : AGENTS[0].welcomeMessage;
  };

  const filteredAgents = AGENTS.filter(a => 
    a.name.toLowerCase().includes(agentSearch.toLowerCase()) || 
    a.description.toLowerCase().includes(agentSearch.toLowerCase()) ||
    a.badge.toLowerCase().includes(agentSearch.toLowerCase())
  );

  const strategicQuestions = [
    {
      id: "q_estudar",
      title: "O que estudar hoje?",
      subtitle: "Prioridade do dia baseada em peso e falhas",
      icon: Target,
      color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
      prompt: "Explique, sem alterar, a ação de prioridade 1 calculada hoje pelo SDE. Cite os dados usados, a confiança e os dados ainda ausentes."
    },
    {
      id: "q_revisar",
      title: "O que revisar?",
      subtitle: "Revisões e Flashcards em atraso crítico",
      icon: Layers,
      color: "text-amber-400 border-amber-500/20 bg-amber-500/5",
      prompt: "Verifique a decisão atual do SDE e explique se existe alguma revisão validada no plano. Não crie revisão que não esteja nas ações calculadas."
    },
    {
      id: "q_risco",
      title: "Qual meu maior risco?",
      subtitle: "Gargalo grave de perda de pontos",
      icon: AlertTriangle,
      color: "text-red-400 border-red-500/20 bg-red-500/5",
      prompt: "Explique somente os riscos categóricos calculados pelo SDE. Se os dados forem insuficientes, diga isso claramente e informe quais evidências faltam."
    },
    {
      id: "q_esquecer",
      title: "Qual assunto esquecer?",
      subtitle: "Custo-benefício muito baixo",
      icon: Clock,
      color: "text-zinc-400 border-zinc-800 bg-zinc-900/40",
      prompt: "Há alguma atividade explicitamente adiada pelo planner? Explique apenas os adiamentos estruturados; não recomende abandonar conteúdo do edital por conta própria."
    },
    {
      id: "q_tempo",
      title: "Quanto tempo investir?",
      subtitle: "Distribuição cirúrgica de carga horária",
      icon: Activity,
      color: "text-blue-400 border-blue-500/20 bg-blue-500/5",
      prompt: "Explique o plano operacional calculado para hoje. Não invente uma distribuição semanal que ainda não tenha sido produzida pelo planner."
    },
    {
      id: "q_retorno",
      title: "Quais assuntos dão mais retorno?",
      subtitle: "Alavancas rápidas de pontuação",
      icon: BarChart3,
      color: "text-purple-400 border-purple-500/20 bg-purple-500/5",
      prompt: "Explique a heurística de alavancagem das ações atuais sem chamá-la de ganho de pontos por hora ou retorno marginal calculado."
    },
    {
      id: "q_parar",
      title: "Quais assuntos parar de estudar?",
      subtitle: "Tópicos com domínio consolidado",
      icon: CheckCircle2,
      color: "text-teal-400 border-teal-500/20 bg-teal-500/5",
      prompt: "Explique se o SDE vetou alguma teoria por domínio observado. Não conclua domínio nem recomende parar de estudar sem evidência e veto estruturado."
    }
  ];

  const ActiveAgentIcon = activeAgent.icon;

  return (
    <div className="flex-1 overflow-hidden bg-zinc-950 flex flex-col h-full" id="intelligence-center-container">
      
      {/* 1. TOP DIAGNOSTICS CONTROL GRID */}
      <div className="p-5 border-b border-zinc-900 bg-zinc-900/20 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-purple-600/10 border border-purple-500/30 flex items-center justify-center">
              <Brain className="h-4.5 w-4.5 text-purple-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-100 font-mono tracking-wide uppercase">Central de Inteligência de Estudos</h1>
              <p className="text-[10px] text-zinc-400">Análise estatística preditiva e recomendações estratégicas em tempo real</p>
            </div>
          </div>
          
          <button
            onClick={() => {
              // Create a brand new session with current active agent
              createNewChat(activeConcursoId || undefined, `Central - ${activeAgent.name}`);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-mono transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-purple-500" />
            <span>Nova Conversa ({activeAgent.name})</span>
          </button>
        </div>

        {/* The 8 Real-Time Analysers indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {/* Estatísticas */}
          <div className="p-2.5 rounded-lg border border-zinc-900 bg-zinc-950/40 text-xs flex flex-col justify-between">
            <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-400" /> Estatísticas
            </span>
            <div className="mt-1">
              <span className="text-sm font-bold text-zinc-200 font-mono">{calculatedTaxaAcerto}%</span>
              <span className="text-[9px] text-zinc-500 block">Aproveitamento</span>
            </div>
          </div>

          {/* Erros */}
          <div className="p-2.5 rounded-lg border border-zinc-900 bg-zinc-950/40 text-xs flex flex-col justify-between">
            <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-400" /> Erros
            </span>
            <div className="mt-1">
              <span className="text-sm font-bold text-red-400 font-mono">{erros}</span>
              <span className="text-[9px] text-zinc-500 block">Falhas ativas</span>
            </div>
          </div>

          {/* Tempo */}
          <div className="p-2.5 rounded-lg border border-zinc-900 bg-zinc-950/40 text-xs flex flex-col justify-between">
            <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider flex items-center gap-1">
              <Clock className="h-3 w-3 text-blue-400" /> Tempo focado
            </span>
            <div className="mt-1">
              <span className="text-sm font-bold text-zinc-200 font-mono">{totalTempoEstudado}m</span>
              <span className="text-[9px] text-zinc-500 block">Investidos</span>
            </div>
          </div>

          {/* Questões */}
          <div className="p-2.5 rounded-lg border border-zinc-900 bg-zinc-950/40 text-xs flex flex-col justify-between">
            <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider flex items-center gap-1">
              <FileQuestion className="h-3 w-3 text-purple-400" /> Questões
            </span>
            <div className="mt-1">
              <span className="text-sm font-bold text-zinc-200 font-mono">{totalQuestoes}</span>
              <span className="text-[9px] text-zinc-500 block">Respondidas</span>
            </div>
          </div>

          {/* Flashcards */}
          <div className="p-2.5 rounded-lg border border-zinc-900 bg-zinc-950/40 text-xs flex flex-col justify-between">
            <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider flex items-center gap-1">
              <Layers className="h-3 w-3 text-amber-400" /> Flashcards
            </span>
            <div className="mt-1">
              <span className="text-sm font-bold text-zinc-200 font-mono">{totalFlashcards}</span>
              <span className="text-[9px] text-amber-400 block font-semibold">{flashcardsARevisar} atrasados</span>
            </div>
          </div>

          {/* Simulados */}
          <div className="p-2.5 rounded-lg border border-zinc-900 bg-zinc-950/40 text-xs flex flex-col justify-between">
            <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider flex items-center gap-1">
              <GraduationCap className="h-3 w-3 text-indigo-400" /> Simulados
            </span>
            <div className="mt-1">
              <span className="text-sm font-bold text-zinc-200 font-mono">{totalSimulados}</span>
              <span className="text-[9px] text-zinc-500 block">Média {mediaSimulados}%</span>
            </div>
          </div>

          {/* Revisões */}
          <div className="p-2.5 rounded-lg border border-zinc-900 bg-zinc-950/40 text-xs flex flex-col justify-between">
            <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider flex items-center gap-1">
              <Activity className="h-3 w-3 text-teal-400" /> Revisões
            </span>
            <div className="mt-1">
              <span className="text-sm font-bold text-zinc-200 font-mono">{totalRevisoesAtivas}</span>
              <span className="text-[9px] text-teal-400 block font-semibold">{revisoesAtrasadas} pendentes</span>
            </div>
          </div>

          {/* Edital e Biblioteca */}
          <div className="p-2.5 rounded-lg border border-zinc-900 bg-zinc-950/40 text-xs flex flex-col justify-between">
            <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider flex items-center gap-1">
              <Library className="h-3 w-3 text-zinc-400" /> Edital & Biblio
            </span>
            <div className="mt-1">
              <span className="text-sm font-bold text-zinc-200 font-mono">{percentualEdital}%</span>
              <span className="text-[9px] text-zinc-500 block">{totalBiblioteca} materiais</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SPLIT LAYOUT: CHAT WORKSPACE & RECOMMENDED STRATEGY CARD */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT WORKSPACE: Interaction Terminal */}
        <div className="flex-1 flex flex-col h-full bg-zinc-950 border-r border-zinc-900">
          
          {/* Active Coach Identity Header */}
          <div className="px-5 py-3 border-b border-zinc-900 bg-zinc-950 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl ${activeAgent.bgColor} border ${activeAgent.borderColor} flex items-center justify-center shrink-0`}>
                <ActiveAgentIcon className={`h-5 w-5 ${activeAgent.iconColor}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-200 font-mono">{activeAgent.name}</span>
                  <span className="px-1.5 py-0.5 text-[8px] rounded font-mono font-bold bg-purple-500/10 border border-purple-500/20 text-purple-400 uppercase">
                    {activeAgent.badge}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 font-sans line-clamp-1">{activeAgent.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[9px] text-zinc-500 font-mono hidden sm:inline">Modo: Especialista Dedicado</span>
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
            
            {(!activeChat || activeChat.mensagens.length === 0) ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto gap-4">
                <Sparkles className="h-10 w-10 text-purple-500 animate-pulse" />
                <div>
                  <h3 className="text-sm font-bold text-zinc-200 font-mono mb-1.5 uppercase">Canal de Mentoria Iniciado</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Envie uma mensagem abaixo para obter conselhos personalizados de **{activeAgent.name}**, ou selecione uma **Ação de Impacto** no painel lateral.
                  </p>
                </div>
              </div>
            ) : (
              activeChat.mensagens.map((msg) => {
                const isUser = msg.remetente === "USER";
                const content = (msg.id === "m-welcome") ? getWelcomeMessageForChat(activeChat) : msg.conteudo;
                
                // Set custom icon for this response depending on associated agent of this specific chat
                const chatAgent = getAgentFromChat(activeChat);
                const ChatAgentIcon = chatAgent.icon;

                return (
                  <div 
                    key={msg.id} 
                    className={`flex gap-3 max-w-3xl ${isUser ? "self-end flex-row-reverse" : "self-start"}`}
                  >
                    <div className={`h-8 w-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs border ${
                      isUser 
                        ? "bg-purple-600 border-purple-400 text-white" 
                        : `${chatAgent.bgColor} ${chatAgent.borderColor} ${chatAgent.iconColor}`
                    }`}>
                      {isUser ? "U" : <ChatAgentIcon className="h-4.5 w-4.5" />}
                    </div>

                    <div className={`p-4 rounded-xl border text-xs leading-relaxed whitespace-pre-wrap font-sans ${
                      isUser 
                        ? "bg-zinc-900 border-zinc-800 text-zinc-200" 
                        : "bg-zinc-900/30 border-zinc-900 text-zinc-300 shadow-sm"
                    }`}>
                      {content}
                    </div>
                  </div>
                );
              })
            )}

            {isSending && (
              <div className="flex gap-3 max-w-3xl self-start">
                <div className={`h-8 w-8 rounded-lg shrink-0 ${activeAgent.bgColor} border ${activeAgent.borderColor} flex items-center justify-center text-xs`}>
                  <ActiveAgentIcon className={`h-4.5 w-4.5 ${activeAgent.iconColor}`} />
                </div>
                <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-900/10 flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-400 animate-pulse">
                    O **{activeAgent.name}** está analisando suas estatísticas e preparando resposta...
                  </span>
                  <div className="flex gap-1">
                    <div className="h-1 w-1 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.3s]" />
                    <div className="h-1 w-1 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.15s]" />
                    <div className="h-1 w-1 rounded-full bg-purple-500 animate-bounce" />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Message Prompt Input bar */}
          <div className="p-4 border-t border-zinc-900 bg-zinc-950 shrink-0">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={`Fale com o ${activeAgent.name}...`}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-purple-500 font-sans"
              />
              <button
                type="submit"
                disabled={isSending || !inputMessage.trim()}
                className="p-2.5 rounded-lg bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-40 transition-all cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.25)] flex items-center justify-center shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>

        </div>

        {/* RIGHT SIDEBAR: AGENT MANAGER & STRATEGIC CONTROLLER */}
        <div className="w-96 bg-zinc-950/20 flex flex-col h-full shrink-0" id="strategic-strategy-panel">
          
          {/* Navigation tabs inside the right sidebar */}
          <div className="grid grid-cols-2 border-b border-zinc-900 shrink-0">
            <button
              onClick={() => setSidebarTab("agents")}
              className={`py-3 text-[10px] font-bold font-mono uppercase tracking-wider border-b-2 transition-all ${
                sidebarTab === "agents" 
                  ? "border-purple-500 text-purple-400 bg-zinc-900/10" 
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Agentes de IA ({AGENTS.length})
            </button>
            <button
              onClick={() => setSidebarTab("impact")}
              className={`py-3 text-[10px] font-bold font-mono uppercase tracking-wider border-b-2 transition-all ${
                sidebarTab === "impact" 
                  ? "border-purple-500 text-purple-400 bg-zinc-900/10" 
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Ações de Impacto
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {sidebarTab === "agents" ? (
              <>
                <p className="text-[10px] text-zinc-500 leading-relaxed shrink-0">
                  Cada agente possui personalidade única, conhecimento especializado do domínio de estudos e tom personalizado de resposta. Clique em qualquer agente para carregar ou iniciar a mentoria dedicada.
                </p>

                {/* Filter / Search input */}
                <div className="relative mb-1 shrink-0">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-600" />
                  <input
                    type="text"
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                    placeholder="Filtrar agentes (ex: Java, FGV, TI...)"
                    className="w-full bg-zinc-900/40 border border-zinc-850 rounded-md pl-8 pr-3 py-1.5 text-[10px] text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-700 font-mono"
                  />
                  {agentSearch && (
                    <button 
                      onClick={() => setAgentSearch("")}
                      className="absolute right-2.5 top-2 text-[10px] text-zinc-500 hover:text-zinc-300 font-mono"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {/* Grid list of 12 coaches */}
                <div className="flex flex-col gap-2">
                  {filteredAgents.map((ag) => {
                    const AgIcon = ag.icon;
                    const isActive = activeAgent.id === ag.id;
                    return (
                      <button
                        key={ag.id}
                        onClick={() => handleSwitchAgent(ag.id)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all duration-200 flex items-start gap-3 cursor-pointer relative overflow-hidden group ${
                          isActive 
                            ? `${ag.borderColor} ${ag.bgColor} ring-1 ring-purple-500/10` 
                            : "border-zinc-900 hover:border-zinc-800 bg-zinc-950/20"
                        }`}
                      >
                        <div className={`p-1.5 rounded-md ${ag.bgColor} border ${ag.borderColor} shrink-0 group-hover:scale-105 transition-transform`}>
                          <AgIcon className={`h-4 w-4 ${ag.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`font-mono text-[10px] font-bold ${isActive ? "text-zinc-100" : "text-zinc-300"}`}>
                              {ag.name}
                            </span>
                            <span className="px-1 py-0.5 rounded text-[7px] font-mono font-semibold bg-zinc-900 border border-zinc-800 text-zinc-400 leading-none">
                              {ag.badge}
                            </span>
                          </div>
                          <span className="text-[9px] text-zinc-500 block leading-tight mt-1 line-clamp-2">
                            {ag.description}
                          </span>
                        </div>
                        {isActive && (
                          <div className="absolute right-0 top-0 h-1.5 w-1.5 bg-purple-500 rounded-bl" />
                        )}
                      </button>
                    );
                  })}

                  {filteredAgents.length === 0 && (
                    <div className="p-8 text-center text-[10px] text-zinc-600 font-mono">
                      Nenhum agente encontrado para "{agentSearch}".
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-[10px] text-zinc-500 leading-relaxed shrink-0">
                  Selecione uma das perguntas pré-formatadas para que o **{activeAgent.name}** processe seus dados de rendimento em tempo real com táticas personalizadas do domínio dele.
                </p>

                <div className="flex flex-col gap-2.5">
                  {strategicQuestions.map((q) => {
                    const IconComp = q.icon;
                    return (
                      <button
                        key={q.id}
                        onClick={() => handleQuickQuestion(q.prompt)}
                        disabled={isSending}
                        className={`w-full text-left p-3 rounded-lg border hover:border-purple-500/40 text-xs transition-all duration-200 flex items-start gap-3 cursor-pointer group disabled:opacity-50 bg-zinc-950/20 border-zinc-900`}
                      >
                        <div className="p-1.5 rounded-md bg-zinc-950 border border-zinc-900 shrink-0 group-hover:scale-105 transition-transform">
                          <IconComp className="h-4 w-4 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-zinc-200 group-hover:text-purple-300 transition-colors">{q.title}</span>
                            <ArrowUpRight className="h-3 w-3 text-zinc-600 group-hover:text-purple-400 transition-colors" />
                          </div>
                          <span className="text-[10px] text-zinc-500 block leading-normal mt-0.5">{q.subtitle}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="p-3 border-t border-zinc-900 bg-zinc-950/40 text-[10px] text-zinc-500 leading-relaxed font-mono flex items-start gap-2 shrink-0">
            <GraduationCap className="h-4 w-4 text-purple-400 shrink-0" />
            <span>
              Você está conversando com o **{activeAgent.name}**. Troque de agente a qualquer momento na aba para obter perspectivas focadas.
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}
