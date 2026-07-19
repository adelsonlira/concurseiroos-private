import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Brain,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileQuestion,
  MessageSquare,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Target
} from "lucide-react";
import { useConcurseiroStore } from "../store";
import { authenticatedFetch } from "../integrations/cloud/authenticatedFetch";
import { buildCoachGroundingContext } from "../integrations/coach/coachContext";
import { privateMaterialProviderLabel, privateMaterialSourceRoleLabel } from "../core/materials/materialPresentation";
import ExternalQuestionSourcePlanCard from "./ExternalQuestionSourcePlanCard";
import { findCompetitionRuntimeDefinition } from "../config/concursos/registry";

interface CoachIAViewProps {
  onOpenSession?: () => void;
  onOpenReviews?: () => void;
  onOpenQuestions?: () => void;
}

type CoachModeId = "estrategia" | "tutor" | "erros";

interface CoachMode {
  id: CoachModeId;
  name: string;
  shortName: string;
  description: string;
  welcome: string;
  chatPrefix: string;
  icon: typeof Brain;
  accentClass: string;
  quickPrompts: Array<{
    title: string;
    prompt: string;
  }>;
}

const COACH_MODES: CoachMode[] = [
  {
    id: "estrategia",
    name: "Coach Estratégico",
    shortName: "Estratégia",
    description: "Explica a decisão do SDE, os dados usados, a confiança e o que ainda falta medir.",
    welcome:
      "Sou a camada explicativa do seu plano. O SDE já decide a prioridade; eu esclareço por que ela veio primeiro, quais evidências sustentam a decisão e quais limitações permanecem.",
    chatPrefix: "Coach IA · Estratégia",
    icon: Target,
    accentClass: "text-blue-300 border-blue-500/30 bg-blue-500/10",
    quickPrompts: [
      {
        title: "Por que esta ação veio primeiro?",
        prompt:
          "Explique a prescrição atual do SDE: prioridade, camada constitucional, duração, material, confiança, dados usados e dados ausentes. Não proponha outra atividade."
      },
      {
        title: "Por que não outro assunto?",
        prompt:
          "Compare a ação escolhida com as alternativas registradas no ledger de decisões. Explique por que elas ficaram abaixo ou foram bloqueadas, sem criar nova prioridade."
      },
      {
        title: "O que faria a decisão mudar?",
        prompt:
          "Use os fatores, portões, evidências e critérios registrados pelo SDE v2 para dizer quais novos dados objetivos poderiam mudar a decisão. Não reescreva a decisão atual."
      },
      {
        title: "O que ainda falta medir?",
        prompt:
          "Liste somente os dados ausentes que realmente limitam a decisão atual. Separe o que eu posso registrar estudando do que depende de documentos externos."
      },
      {
        title: "Qual é o risco de ignorar esta sessão?",
        prompt:
          "Explique o custo de ignorar a ação atual usando apenas o resultado estruturado do SDE. Não invente pontos, probabilidade de aprovação ou tendência da banca."
      }
    ]
  },
  {
    id: "tutor",
    name: "Tutor do Tópico Atual",
    shortName: "Tutor",
    description: "Ensina o conteúdo da prescrição atual sem alterar prioridade, duração ou cronograma.",
    welcome:
      "Sou seu tutor contextual. Posso explicar o tópico que o coach mandou estudar, criar perguntas de recuperação e comparar conceitos próximos sem inventar conteúdo do seu material privado.",
    chatPrefix: "Coach IA · Tutor",
    icon: BookOpen,
    accentClass: "text-violet-300 border-violet-500/30 bg-violet-500/10",
    quickPrompts: [
      {
        title: "Explique minhas perguntas-guia",
        prompt:
          "Use exatamente as perguntas-guia da prescrição atual. Explique o que cada pergunta está testando e ajude-me a compreender sem inventar padrões adicionais da FGV."
      },
      {
        title: "Explique o tópico atual",
        prompt:
          "Ensine o tópico da prescrição atual de forma objetiva: definição, mecanismo, exemplo e três armadilhas conceituais. Não alegue ter lido o material privado."
      },
      {
        title: "Teste minha recuperação",
        prompt:
          "Crie cinco perguntas curtas de recuperação ativa sobre o tópico atual, sem responder imediatamente. Não altere a sessão prescrita."
      },
      {
        title: "Compare conceitos confundíveis",
        prompt:
          "Identifique conceitos próximos que costumam ser confundidos dentro do tópico atual e faça uma comparação didática. Não atribua padrão à FGV sem evidência validada no contexto."
      }
    ]
  },
  {
    id: "erros",
    name: "Analista de Erros",
    shortName: "Erros",
    description: "Ajuda a entender falhas registradas e a executar a correção sem diagnosticar além dos dados.",
    welcome:
      "Sou o analista das evidências de erro. Posso organizar causas declaradas, separar lacuna de conteúdo de falha de execução e sugerir um protocolo de correção, mas não classifico um erro automaticamente como fato.",
    chatPrefix: "Coach IA · Erros",
    icon: ClipboardList,
    accentClass: "text-amber-300 border-amber-500/30 bg-amber-500/10",
    quickPrompts: [
      {
        title: "Analise meus erros recentes",
        prompt:
          "Resuma os erros reais mais recentes do contexto. Diferencie resultado observado, causa declarada e inferência possível. Não invente causa."
      },
      {
        title: "Monte um protocolo de correção",
        prompt:
          "Para o erro ou tópico mais urgente registrado, proponha um protocolo curto de correção e nova tentativa, sem criar uma prioridade paralela ao SDE."
      },
      {
        title: "O erro já foi recuperado?",
        prompt:
          "Explique o estado de recuperação dos tópicos com erro usando somente acertos posteriores registrados. Não trate dois acertos como domínio definitivo."
      }
    ]
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

function formatMessageTime(timestamp: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(timestamp));
  } catch {
    return "";
  }
}

export default function CoachIAView({
  onOpenSession,
  onOpenReviews,
  onOpenQuestions
}: CoachIAViewProps) {
  const {
    conversasIA,
    activeChatId,
    addChatMessage,
    createNewChat,
    activeConcursoId,
    disciplinas,
    assuntos,
    subassuntos,
    cronogramasRevisao,
    casosRecuperacaoErro,
    tentativasQuestoes,
    sessoesEstudo,
    historicoAtividades,
    configuracao,
    ultimaDecisaoSDE,
    executarSDEParaData
  } = useConcurseiroStore();

  const [selectedModeId, setSelectedModeId] = useState<CoachModeId>("estrategia");
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const selectedMode = COACH_MODES.find((mode) => mode.id === selectedModeId) ?? COACH_MODES[0];
  const modeChats = useMemo(
    () =>
      conversasIA
        .filter((chat) => !chat.isDeleted && chat.titulo.startsWith(selectedMode.chatPrefix))
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [conversasIA, selectedMode.chatPrefix]
  );
  const activeStoredChat = conversasIA.find((chat) => chat.id === activeChatId && !chat.isDeleted);
  const activeChat =
    activeStoredChat?.titulo.startsWith(selectedMode.chatPrefix)
      ? activeStoredChat
      : modeChats[0] ?? null;

  const referenceDate = currentDateKey(configuracao.disponibilidadeEstudo.timeZone);

  useEffect(() => {
    if (subassuntos.length === 0) return;
    if (ultimaDecisaoSDE?.referenceDate !== referenceDate) executarSDEParaData(referenceDate);
  }, [
    subassuntos.length,
    referenceDate,
    ultimaDecisaoSDE?.referenceDate,
    executarSDEParaData
  ]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.mensagens, isSending]);

  const decision = ultimaDecisaoSDE?.referenceDate === referenceDate ? ultimaDecisaoSDE : null;
  const prescription = decision?.prescription?.current ?? null;
  const primaryAction = decision?.actions[0] ?? null;
  const dueReviewCount = cronogramasRevisao.filter(
    (review) =>
      !review.desabilitada &&
      !review.isDeleted &&
      review.proximaRevisaoData <= referenceDate
  ).length;
  const observedCorrect = tentativasQuestoes.filter((attempt) => attempt.acertou).length;
  const observedAccuracy =
    tentativasQuestoes.length > 0
      ? Math.round((observedCorrect / tentativasQuestoes.length) * 100)
      : null;
  const missingData = primaryAction?.justificativaXAI.dadosAusentes ?? [];

  const switchMode = (modeId: CoachModeId) => {
    setSelectedModeId(modeId);
    const mode = COACH_MODES.find((item) => item.id === modeId);
    if (!mode) return;
    const existing = [...conversasIA]
      .filter((chat) => !chat.isDeleted && chat.titulo.startsWith(mode.chatPrefix))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
    if (existing) useConcurseiroStore.setState({ activeChatId: existing.id });
  };

  const createModeChat = () => {
    const timestamp = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date());
    return createNewChat(
      activeConcursoId || undefined,
      `${selectedMode.chatPrefix} · ${timestamp}`
    );
  };

  const handleSendMessage = async (textToSend?: string) => {
    const rawMessage = textToSend ?? inputMessage;
    if (!rawMessage.trim() || isSending) return;

    const targetChatId = activeChat?.id ?? createModeChat();
    const history = activeChat
      ? activeChat.mensagens
          .filter((message) => message.id !== "m-welcome")
          .map((message) => ({
            role: message.remetente === "USER" ? ("user" as const) : ("model" as const),
            text: message.conteudo
          }))
      : [];

    addChatMessage(targetChatId, {
      remetente: "USER",
      conteudo: rawMessage.trim()
    });
    setInputMessage("");
    setIsSending(true);

    try {
      const currentDecision =
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
        casosRecuperacaoErro,
        historicoAtividades,
        decision: currentDecision,
        privateMaterialCatalog:
          findCompetitionRuntimeDefinition(configuracao.concursoAlvoId)?.privateStudyMaterials ?? []
      });

      const response = await authenticatedFetch("/api/coach-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: rawMessage.trim(),
          history,
          performanceContext,
          decisionContext: performanceContext.decisaoSDE,
          safetyMode: "SDE_GROUNDED",
          agentId: selectedMode.id
        })
      });

      if (!response.ok) throw new Error("Não foi possível consultar o modelo do Coach IA.");
      const parsed = await response.json();
      addChatMessage(targetChatId, {
        remetente: "AI",
        conteudo:
          parsed.reply ||
          "Não consegui produzir uma resposta fundamentada com os dados disponíveis."
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha desconhecida";
      addChatMessage(targetChatId, {
        remetente: "AI",
        conteudo: `Falha ao consultar o Coach IA: ${message}. A prescrição determinística do SDE continua válida e pode ser executada normalmente.`
      });
    } finally {
      setIsSending(false);
    }
  };

  const ModeIcon = selectedMode.icon;

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-4 text-zinc-100 sm:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col justify-between gap-4 border-b border-zinc-900 pb-4 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-violet-300">
              <Brain className="h-4 w-4" /> IA contextual, decisão determinística
            </div>
            <h1 className="mt-2 text-xl font-bold">Pergunte dentro do plano</h1>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-zinc-500">
              A IA explica, ensina e analisa erros. Ela não substitui o SDE, não muda a ordem das sessões e não inventa tendências da banca.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-2 text-[10px] text-emerald-300">
            <ShieldCheck className="h-4 w-4" /> Modo SDE Grounded
          </div>
        </header>

        <section className="grid gap-3 lg:grid-cols-3">
          {COACH_MODES.map((mode) => {
            const Icon = mode.icon;
            const isActive = mode.id === selectedMode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => switchMode(mode.id)}
                className={`rounded-xl border p-4 text-left transition ${
                  isActive
                    ? mode.accentClass
                    : "border-zinc-800 bg-zinc-900/20 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-semibold">{mode.name}</span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed opacity-80">{mode.description}</p>
              </button>
            );
          })}
        </section>

        <div className="grid min-h-[650px] gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/20">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${selectedMode.accentClass}`}>
                  <ModeIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-200">{selectedMode.name}</div>
                  <div className="text-[10px] text-zinc-600">Contexto atualizado em {referenceDate}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={createModeChat}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-2 text-[11px] text-zinc-500 transition hover:text-zinc-300"
              >
                <Plus className="h-4 w-4" /> Nova conversa
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
              {!activeChat || activeChat.mensagens.length === 0 ? (
                <div className="m-auto max-w-lg rounded-2xl border border-dashed border-zinc-800 p-8 text-center">
                  <Sparkles className="mx-auto h-8 w-8 text-violet-400" />
                  <h2 className="mt-3 text-sm font-semibold text-zinc-200">{selectedMode.shortName} pronta</h2>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500">{selectedMode.welcome}</p>
                </div>
              ) : (
                activeChat.mensagens.map((message) => {
                  const isUser = message.remetente === "USER";
                  const content = message.id === "m-welcome" ? selectedMode.welcome : message.conteudo;
                  return (
                    <div
                      key={message.id}
                      className={`flex max-w-3xl gap-3 ${isUser ? "self-end flex-row-reverse" : "self-start"}`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${
                          isUser
                            ? "border-blue-400 bg-blue-600 text-white"
                            : selectedMode.accentClass
                        }`}
                      >
                        {isUser ? "U" : <ModeIcon className="h-4 w-4" />}
                      </div>
                      <div
                        className={`rounded-xl border p-4 text-xs leading-relaxed whitespace-pre-wrap ${
                          isUser
                            ? "border-zinc-700 bg-zinc-800/70 text-zinc-200"
                            : "border-zinc-800 bg-zinc-950/60 text-zinc-300"
                        }`}
                      >
                        {content}
                        <div className="mt-2 text-[9px] font-mono text-zinc-700">
                          {formatMessageTime(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {isSending && (
                <div className="flex max-w-3xl gap-3 self-start">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${selectedMode.accentClass}`}>
                    <ModeIcon className="h-4 w-4" />
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-[11px] text-zinc-500">
                    Analisando somente os dados registrados e a decisão atual...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="border-t border-zinc-800 bg-zinc-950/70 p-4">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSendMessage();
                }}
                className="flex gap-2"
              >
                <textarea
                  value={inputMessage}
                  onChange={(event) => setInputMessage(event.target.value)}
                  placeholder={`Pergunte ao ${selectedMode.name.toLowerCase()}...`}
                  rows={2}
                  className="min-h-[52px] flex-1 resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-zinc-200 outline-none transition placeholder:text-zinc-700 focus:border-violet-500"
                />
                <button
                  type="submit"
                  disabled={isSending || !inputMessage.trim()}
                  className="flex w-12 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Enviar mensagem"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <section className="rounded-2xl border border-blue-500/25 bg-blue-500/[0.04] p-4">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-blue-300">
                <Target className="h-4 w-4" /> Decisão atual
              </div>
              {prescription ? (
                <>
                  <h2 className="mt-3 text-sm font-bold text-zinc-100">
                    {prescription.subtopicName ?? prescription.topicName}
                  </h2>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {prescription.disciplineName} · {prescription.durationMinutes} min · {prescription.activity}
                  </p>
                  {prescription.material && (
                    <p className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-[10px] leading-relaxed text-zinc-400">
                      {privateMaterialSourceRoleLabel(prescription.material.sourceRole)} · {privateMaterialProviderLabel(prescription.material.sourceProvider)} · {prescription.material.materialTitle} · {prescription.material.sectionTitle} · páginas {prescription.material.startPage}–{prescription.material.endPage}
                    </p>
                  )}
                  {prescription.questionPractice?.externalSourcePlan && (
                    <div className="mt-3">
                      <ExternalQuestionSourcePlanCard
                        plan={prescription.questionPractice.externalSourcePlan}
                        compact
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={onOpenSession}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500"
                  >
                    <Clock className="h-4 w-4" /> Executar sessão
                  </button>
                </>
              ) : (
                <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                  Não há prescrição executável para hoje. A IA não criará uma alternativa paralela.
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-4">
              <h2 className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                <MessageSquare className="h-4 w-4 text-violet-400" /> Perguntas úteis agora
              </h2>
              <div className="mt-3 space-y-2">
                {selectedMode.quickPrompts.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    disabled={isSending}
                    onClick={() => void handleSendMessage(item.prompt)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-3 text-left text-[11px] text-zinc-400 transition hover:border-violet-500/40 hover:text-zinc-200 disabled:opacity-40"
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-4">
              <h2 className="text-xs font-semibold text-zinc-300">Evidências disponíveis</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <EvidenceMetric label="Questões" value={String(tentativasQuestoes.length)} />
                <EvidenceMetric label="Acerto observado" value={observedAccuracy === null ? "—" : `${observedAccuracy}%`} />
                <EvidenceMetric label="Sessões" value={String(sessoesEstudo.length)} />
                <EvidenceMetric label="Revisões vencidas" value={String(dueReviewCount)} />
              </div>
              {missingData.length > 0 && (
                <details className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3">
                  <summary className="cursor-pointer text-[10px] font-semibold text-amber-300">
                    {missingData.length} dado(s) ainda ausente(s)
                  </summary>
                  <ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-zinc-500">
                    {missingData.map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                </details>
              )}
            </section>

            <section className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onOpenReviews}
                className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/20 px-3 py-3 text-[11px] text-zinc-400 transition hover:text-zinc-200"
              >
                <RotateCcw className="h-4 w-4" /> Revisões
              </button>
              <button
                type="button"
                onClick={onOpenQuestions}
                className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/20 px-3 py-3 text-[11px] text-zinc-400 transition hover:text-zinc-200"
              >
                <FileQuestion className="h-4 w-4" /> Questões
              </button>
            </section>

            <section className="flex items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-900/10 p-3 text-[10px] leading-relaxed text-zinc-600">
              {decision?.status === "SUCCESS" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              )}
              <p>
                Tendências da FGV permanecem fora das decisões enquanto o corpus oficial não estiver validado. A IA deve declarar essa ausência em vez de preencher lacunas com conhecimento genérico.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function EvidenceMetric(props: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
      <div className="text-base font-bold text-zinc-200">{props.value}</div>
      <div className="mt-1 text-[9px] font-mono uppercase text-zinc-600">{props.label}</div>
    </div>
  );
}
