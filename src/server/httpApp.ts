import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import readinessReport from "../../data/quality/product-readiness-report.json" with { type: "json" };
import { assessProductReadiness } from "../core/readiness/productReadiness.js";
import type { ReadinessCheck } from "../core/readiness/types.js";
import { buildPublicRuntimeConfiguration, resolveRuntimeEnvironment } from "./runtimeEnvironment.js";
import { gradePilotDiagnosticAttempt } from "./diagnostics/pilotDiagnosticServer.js";
import type { FinalizePilotDiagnosticRequest } from "../features/pilotDiagnostic/types.js";
import type { CheckFgvTrainingAnswerRequest, FinalizeFgvTrainingRequest } from "../features/fgvTraining/types.js";

dotenv.config({ quiet: true });

const app = express();
const PORT = Number(process.env.PORT || 3000);
const runtime = resolveRuntimeEnvironment();
const GEMINI_MODEL = runtime.ai.model;
const runtimeSupabaseUrl = runtime.supabase.url;
const runtimeSupabaseAnonKey = runtime.supabase.anonKey;
const runtimeSupabaseConfigured = runtime.supabase.configured;
const runtimeNodeMajor = Number(process.versions.node.split(".")[0]);
const runtimeGeminiConfigured = runtime.ai.configured;
const apiAuthMode = runtime.auth.mode;

app.use(express.json({ limit: "50mb" }));

// 1. Gemini is loaded lazily only when an AI endpoint is invoked.
// This keeps health/auth routes independent from the SDK and from GEMINI_API_KEY.
const SchemaType = {
  STRING: "STRING",
  NUMBER: "NUMBER",
  INTEGER: "INTEGER",
  ARRAY: "ARRAY",
  OBJECT: "OBJECT"
} as const;

async function createAiClient() {
  const apiKey = runtime.ai.apiKey;
  if (!apiKey) {
    const error = new Error("GEMINI_API_KEY não configurada no servidor.");
    (error as Error & { statusCode?: number; code?: string }).statusCode = 503;
    (error as Error & { statusCode?: number; code?: string }).code = "GEMINI_NOT_CONFIGURED";
    throw error;
  }

  const { GoogleGenAI } = await import("@google/genai");
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "concurseiroos-server"
      }
    }
  });
}

function sanitizeProviderError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const apiKey = runtime.ai.apiKey;
  return apiKey ? message.split(apiKey).join("[REDACTED]") : message;
}

function isGeminiNotConfigured(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "GEMINI_NOT_CONFIGURED";
}

function resolveAiFailureStatus(error: unknown): number {
  if (isGeminiNotConfigured(error)) return 503;
  const status = Number((error as { statusCode?: number; status?: number } | null)?.statusCode ?? (error as { status?: number } | null)?.status);
  if (status === 429) return 429;
  return 502;
}

// 2. Full-Stack API Endpoints
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.get("/api/readiness", (_req, res) => {
  const checks = (readinessReport.checks as ReadinessCheck[]).map((check) => {
    if (check.id === "node-runtime") {
      return {
        ...check,
        status: runtimeNodeMajor === 24 ? "PASS" as const : "WARN" as const,
        detail: runtimeNodeMajor === 24
          ? `Runtime-alvo confirmado: Node.js ${process.versions.node}.`
          : `Servidor em Node.js ${process.versions.node}; alvo declarado 24.x.`
      };
    }
    if (check.id === "supabase-authenticated") {
      return {
        ...check,
        status: runtimeSupabaseConfigured ? "WARN" as const : "NOT_TESTED" as const,
        detail: runtimeSupabaseConfigured
          ? "Configuração pública presente no servidor. O login e a leitura autenticada precisam ser confirmados pela interface com uma conta real."
          : "Supabase não está configurado neste processo do servidor."
      };
    }
    if (check.id === "gemini-live") {
      return {
        ...check,
        status: runtimeGeminiConfigured ? "WARN" as const : "NOT_TESTED" as const,
        detail: runtimeGeminiConfigured
          ? "Chave presente no backend. Uma chamada autenticada em /api/ai-health confirma a resposta real do modelo."
          : "Gemini não está configurado neste processo; o Coach determinístico continua operacional."
      };
    }
    return check;
  });
  const assessment = assessProductReadiness(checks);
  res.setHeader("Cache-Control", "no-store");
  res.json({
    status: assessment.status,
    confidence: assessment.confidence,
    blockingChecks: assessment.blockingChecks,
    warnings: assessment.warnings,
    runtime: {
      supabaseConfigured: runtimeSupabaseConfigured,
      geminiConfigured: runtimeGeminiConfigured,
      authMode: apiAuthMode,
      nodeVersion: process.versions.node,
      note: "Configuração presente não substitui o smoke test autenticado com uma conta real."
    },
    checks: checks.map((check) => ({
      id: check.id,
      label: check.label,
      status: check.status,
      requiredForDailyUse: check.requiredForDailyUse,
      detail: check.detail,
    })),
  });
});

app.get("/api/runtime-config", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(buildPublicRuntimeConfiguration(runtime));
});

let authVerifier: ReturnType<typeof createClient> | null | undefined;

function getAuthVerifier(): ReturnType<typeof createClient> | null {
  if (authVerifier !== undefined) return authVerifier;
  if (!runtimeSupabaseUrl || !runtimeSupabaseAnonKey) {
    authVerifier = null;
    return authVerifier;
  }
  try {
    authVerifier = createClient(runtimeSupabaseUrl, runtimeSupabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  } catch (error) {
    console.error("[API Auth Configuration Error]", error);
    authVerifier = null;
  }
  return authVerifier;
}

app.use("/api", async (req: any, res: any, next: any) => {
  if (apiAuthMode === "disabled") return next();

  const verifier = getAuthVerifier();
  if (!verifier) {
    if (apiAuthMode === "required") {
      return res.status(503).json({
        error: "Autenticação on-line não configurada no servidor."
      });
    }
    return next();
  }

  const authorization = req.header("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    if (apiAuthMode === "required") {
      return res.status(401).json({ error: "Sessão autenticada obrigatória." });
    }
    return next();
  }

  try {
    const { data, error } = await verifier.auth.getUser(match[1]);
    if (error || !data.user) {
      return res.status(401).json({ error: "Sessão inválida ou expirada." });
    }
    req.authUser = { id: data.user.id, email: data.user.email ?? null };
    return next();
  } catch (error) {
    console.error("[API Auth Error]", error);
    return res.status(401).json({ error: "Não foi possível validar a sessão." });
  }
});

app.get("/api/diagnostic-finalize", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(405).json({ error: "A correção só está disponível após finalização explícita por POST." });
});

app.post("/api/diagnostic-finalize", (req, res) => {
  try {
    const result = gradePilotDiagnosticAttempt(req.body as FinalizePilotDiagnosticRequest);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível finalizar o diagnóstico.";
    res.status(400).json({ error: message });
  }
});

app.get(["/api/training-fgv/check", "/api/training-fgv/finalize"], (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(405).json({ error: "A correção do Treino FGV exige ação explícita por POST." });
});

app.post("/api/training-fgv/check", async (req, res) => {
  try {
    const { checkFgvTrainingAnswer } = await import("./training/fgvTrainingServer.js");
    const result = checkFgvTrainingAnswer(req.body as CheckFgvTrainingAnswerRequest);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Não foi possível conferir a resposta." });
  }
});

app.post("/api/training-fgv/finalize", async (req, res) => {
  try {
    const { finalizeFgvTrainingAttempt } = await import("./training/fgvTrainingServer.js");
    const result = finalizeFgvTrainingAttempt(req.body as FinalizeFgvTrainingRequest);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Não foi possível finalizar o treino." });
  }
});

app.post("/api/ai-health", async (_req, res) => {
  const startedAt = Date.now();
  try {
    const ai = await createAiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: "Responda somente com a palavra OK.",
      config: { temperature: 0 }
    });
    res.json({
      status: "ok",
      model: GEMINI_MODEL,
      latencyMs: Date.now() - startedAt,
      responseReceived: Boolean(response.text?.trim())
    });
  } catch (error: unknown) {
    const status = resolveAiFailureStatus(error);
    if (status !== 503) console.error("[AI Health Error]", error);
    const notConfigured = isGeminiNotConfigured(error);
    res.status(status).json({
      error: notConfigured ? "Gemini não configurado no servidor." : "Falha ao validar a conexão com o Gemini.",
      code: notConfigured ? "GEMINI_NOT_CONFIGURED" : "GEMINI_PROBE_FAILED",
      model: GEMINI_MODEL,
      details: sanitizeProviderError(error)
    });
  }
});

// Intelligent Syllabus Parser Route
app.post("/api/parse-edital", async (req: any, res: any) => {
  try {
    const { text, filename, fileType, customContext, pdfBase64, sensitivity } = req.body;

    if (sensitivity === "PRIVATE_LICENSED_USER_COPY") {
      return res.status(403).json({ error: "Materiais privados licenciados não podem ser enviados ao serviço de IA." });
    }

    if (!text && !pdfBase64) {
      return res.status(400).json({ error: "Conteúdo do arquivo ou base64 está vazio." });
    }

    const systemInstruction = `
      Você é um especialista em concursos públicos brasileiros e engenheiro de dados sênior.
      Sua tarefa é analisar o conteúdo textual de um edital (ou edital verticalizado, lei, documento de estudo) e estruturá-lo em uma árvore hierárquica completa de estudo.
      
      Regras cruciais:
      1. Extraia todas as disciplinas citadas (ex: Direito Constitucional, Língua Portuguesa).
      2. Para cada disciplina, extraia os Assuntos correspondentes de forma lógica e sequencial.
      3. Para cada Assunto, extraia os Subassuntos (detalhes ou tópicos menores descritos).
      4. Identifique o PESO de cada disciplina somente se estiver explícito no texto. Se não estiver, use 1 como valor neutro e não inferido.
      5. Para a prioridade do assunto, retorne ALTA, MEDIA ou BAIXA somente quando o documento declarar essa hierarquia de forma explícita. Caso contrário, retorne NAO_INFORMADA.
      6. Não estime incidência da banca, relevância histórica, tendência ou prioridade com conhecimento externo. Esta rota apenas extrai o documento.
      7. Se encontrar tópicos duplicados ou redundantes, mescle-os sem criar conteúdo ausente.
      8. Mantenha os nomes claros e gramaticalmente corretos em português do Brasil.
    `;

    // Strict schema to return the structured syllabus structure
    const responseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        concursoNome: {
          type: SchemaType.STRING,
          description: "Nome sugerido para o Concurso com base no documento (ex: INSS 2026, Auditor RFB)."
        },
        orgao: {
          type: SchemaType.STRING,
          description: "Órgão do concurso (ex: Receita Federal, Caixa Econômica, TCU)."
        },
        banca: {
          type: SchemaType.STRING,
          description: "Banca organizadora identificada (ex: Cebraspe, FGV, FCC, etc. Se não identificar, deixe em branco)."
        },
        disciplinas: {
          type: SchemaType.ARRAY,
          description: "Lista de disciplinas extraídas do edital.",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              nome: {
                type: SchemaType.STRING,
                description: "Nome da disciplina (ex: Direito Administrativo, Língua Portuguesa)."
              },
              peso: {
                type: SchemaType.NUMBER,
                description: "Peso explícito da disciplina no certame. Quando ausente, usar 1 como valor neutro, sem inferência."
              },
              assuntos: {
                type: SchemaType.ARRAY,
                description: "Lista de temas/assuntos dentro dessa disciplina.",
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    nome: {
                      type: SchemaType.STRING,
                      description: "Nome do assunto principal (ex: Princípios da Administração Pública, Atos Administrativos)."
                    },
                    prioridade: {
                      type: SchemaType.STRING,
                      description: "Prioridade explicitamente declarada no documento: ALTA, MEDIA, BAIXA ou NAO_INFORMADA. Nunca estimar por incidência externa."
                    },
                    subassuntos: {
                      type: SchemaType.ARRAY,
                      description: "Subtópicos menores ou artigos específicos detalhados no edital para esse assunto.",
                      items: {
                        type: SchemaType.STRING
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    console.log(`[AI Parser] Calling ${GEMINI_MODEL} to parse document: ${filename}`);

    let contents: any;

    if (pdfBase64) {
      const mime = fileType || (filename?.endsWith(".pdf") ? "application/pdf" : "image/png");
      const cleanMime = mime.includes("pdf") ? "application/pdf" : mime.includes("image") ? mime : "application/pdf";

      contents = {
        parts: [
          {
            inlineData: {
              mimeType: cleanMime,
              data: pdfBase64
            }
          },
          {
            text: `Por favor, analise o documento anexo (${filename || "Edital"}) para extrair e estruturar as disciplinas, assuntos e subassuntos do concurso público.
            
            Contexto opcional do usuário para a extração: ${customContext || "Nenhum"}`
          }
        ]
      };
    } else {
      contents = `
        Nome do arquivo original: ${filename || "Documento"}
        Tipo de arquivo detectado: ${fileType || "Desconhecido"}
        Contexto opcional do usuário: ${customContext || "Nenhum"}

        Conteúdo do edital a ser parseado:
        ----------------------------------
        ${text.slice(0, 80000)} // Safe length slicing to avoid exceeding token input boundaries
        ----------------------------------
      `;
    }

    const ai = await createAiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.1, // Low temperature for maximum structure alignment
      },
    });

    const parsedJson = JSON.parse(response.text || "{}");
    res.json(parsedJson);

  } catch (error: any) {
    console.error("[AI Parser Error]", error);
    res.status(Number(error?.statusCode) || 500).json({
      error: "Falha ao processar o arquivo com Inteligência Artificial.",
      details: error.message || String(error)
    });
  }
});

// Intelligent Explanation / Question Help Route
app.post("/api/explain-question", async (req: any, res: any) => {
  try {
    const { question, options, selectedAnswer, correctAnswer, subject } = req.body;

    const systemInstruction = `
      Você é o Coach IA do ConcurseiroOS, um mentor de alto desempenho especialista em concursos públicos.
      Sua missão é explicar detalhadamente por que uma resposta está correta e as outras estão erradas.
      Sempre explique em português do Brasil de forma didática, direta e incentivadora, no formato Markdown.
      Mantenha as respostas focadas, use tabelas e listas para melhor memorização.
    `;

    const userPrompt = `
      Assunto: ${subject || "Geral"}
      Enunciado da Questão: ${question}
      Opções disponíveis:
      ${options.map((o: any) => `- Opção [${o.letra || o.id}]: ${o.texto}`).join("\n")}
      
      Resposta do Usuário: ${selectedAnswer}
      Resposta Correta Oficial: ${correctAnswer}

      Por favor, forneça:
      1. Uma explicação objetiva da resposta correta.
      2. Uma tabela ou lista resumindo a regra jurídica ou teórica por trás do assunto.
      3. Armadilhas observáveis nesta questão concreta e como identificar alternativas semelhantes. Não generalize para toda a banca sem evidência validada.
    `;

    console.log("[AI Coach] Explaining question...");

    const ai = await createAiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    res.json({ explanation: response.text });
  } catch (error: any) {
    console.error("[AI Coach Error]", error);
    res.status(Number(error?.statusCode) || 500).json({ error: "Falha ao gerar explicação da IA.", details: error.message });
  }
});

// Helper function to get specialized system instructions for each of the 12 AI Coaches
function getSystemInstructionForAgent(agentId: string): string {
  const baseRules = `
    Você é a camada conversacional do ConcurseiroOS. O Strategic Decision Engine (SDE), e não o modelo generativo, determina prioridades, duração, vetos, risco categórico, materiais localizados e plano de estudos.

    REGRAS INVIOLÁVEIS:
    - Para perguntas estratégicas, explique somente a decisão estruturada enviada em decisaoSDE. Não altere a ordem, não crie atividade alternativa e não recomende duração diferente.
    - Se decisaoSDE estiver ausente, inválida ou sem dados suficientes, diga explicitamente que não há base para uma recomendação estratégica.
    - Use apenas registros granulares enviados: tentativas, sessões, revisões e resultados do SDE. Ausência de dados nunca significa rendimento zero.
    - Não invente pesos, incidência histórica da banca, probabilidade de aprovação, ganho esperado de pontos, retorno marginal, tendência, domínio, esquecimento ou risco.
    - Diferencie claramente FATO REGISTRADO, RESULTADO DO SDE, INFERÊNCIA DIDÁTICA e DADO AUSENTE.
    - Não prometa aprovação e não use linguagem de certeza quando houver baixa confiança.
    - Padrões da FGV só podem ser afirmados quando houver fonte validada no contexto ou quando o usuário fornecer uma questão concreta. Caso contrário, declare que a tendência não está validada.
    - Quando prescricaoAtual.focusGuide existir, use exatamente suas perguntas, pontos de atenção, fonte e limites. Não invente novos padrões de cobrança da FGV.
    - materialSugerido é apenas um localizador de cópia privada. Cite título, seção e páginas recebidas, mas não alegue ter lido, transcrito ou inferido o conteúdo desse material.
    - Causas de erro são declarações do usuário. Autoavaliação de revisão não equivale a acerto; acertos posteriores são evidência observada de recuperação, não domínio definitivo.
    - Nunca declare um método vencedor quando statusComparacaoMetodos for INSUFFICIENT_DATA ou INCONCLUSIVE. Uma preferência observada permanece reversível e não prova causalidade.
    - A calibração semanal é descritiva. Não transforme presença, minutos ou taxa em nota moral, produtividade causal ou previsão de aprovação.
    - A fila de revisão não pode congelar o avanço do edital. Explique as proteções do Planner sem removê-las.
    - Responda em português do Brasil, de forma direta, estruturada e compatível com a confiança dos dados.
  `;

  if (agentId === "tutor") {
    return `${baseRules}
      PAPEL: Tutor do tópico atual.
      - Ensine somente o conteúdo solicitado ou o tópico presente na prescrição atual.
      - Você pode explicar definições, mecanismos, exemplos, contrastes e formular perguntas de recuperação ativa.
      - Não altere prioridade, duração, material ou sequência do plano.
      - Não diga que determinada forma de cobrança é típica da FGV sem evidência validada no contexto.
      - Não reproduza conteúdo protegido nem alegue conhecer páginas privadas apenas porque recebeu um localizador.`;
  }

  if (agentId === "erros") {
    return `${baseRules}
      PAPEL: Analista de erros e recuperação.
      - Organize erros observados, causas declaradas e acertos posteriores.
      - Separe explicitamente fato, declaração do candidato e hipótese didática.
      - Pode sugerir um protocolo curto de correção e nova tentativa, mas não criar uma prioridade ou agenda paralela ao SDE.
      - Não classifique automaticamente a causa de um erro nem declare domínio recuperado.`;
  }

  return `${baseRules}
    PAPEL: Coach Estratégico explicativo.
    - Explique por que a prescrição atual veio primeiro, quais dados foram usados, qual a confiança e quais dados faltam.
    - Não substitua a decisão, não crie plano alternativo e não use linguagem de marketing.
    - Quando o usuário perguntar o que fazer, direcione-o para a prescrição atual do SDE e seu protocolo executável.`;
}

// AI Coach Conversational Chat Route
app.post("/api/coach-chat", async (req: any, res: any) => {
  try {
    const { messages, stats, message, history, performanceContext, decisionContext, safetyMode, agentId } = req.body;

    const systemInstruction = getSystemInstructionForAgent(agentId || "geral");

    let formattedText = "";
    if (messages && Array.isArray(messages)) {
      formattedText = messages.map((m: any) => `${m.remetente === "USER" ? "Usuário" : "Coach"}: ${m.conteudo}`).join("\n\n");
    } else if (history && Array.isArray(history)) {
      formattedText = history.map((m: any) => `${m.role === "user" ? "Usuário" : "Coach"}: ${m.text}`).join("\n\n");
      if (message) {
        formattedText += `\n\nUsuário: ${message}`;
      }
    } else if (message) {
      formattedText = `Usuário: ${message}`;
    }

    // Integrate the statistics into the prompt dynamically
    const studyStats = stats || performanceContext;
    let statsSection = "";
    if (studyStats) {
      statsSection = `\n\n[DADOS DE DESEMPENHO EM TEMPO REAL DO ESTUDANTE DO CONCURSEIROOS]:\n${JSON.stringify(studyStats, null, 2)}`;
    }

    const decisionSection = decisionContext
      ? `\n\n[DECISÃO ESTRUTURADA DO SDE — ÚNICA FONTE AUTORIZADA PARA ESTRATÉGIA]:\n${JSON.stringify(decisionContext, null, 2)}`
      : "\n\n[DECISÃO DO SDE]: AUSENTE. Não faça recomendação estratégica.";
    const safetySection = `\n\n[MODO DE SEGURANÇA]: ${safetyMode || "DIDACTIC_ONLY"}`;
    const fullPrompt = `${formattedText}${statsSection}${decisionSection}${safetySection}`;

    console.log(`[AI Central de Inteligência] Gerando recomendação personalizada para o agente: ${agentId || "geral"}...`);

    const ai = await createAiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: fullPrompt,
      config: {
        systemInstruction,
        temperature: 0.4,
      }
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error("[AI Coach Chat Error]", error);
    res.status(Number(error?.statusCode) || 500).json({ error: "Erro ao consultar a Central de Inteligência.", details: error.message });
  }
});

// Semantic Search Route
app.post("/api/semantic-search", async (req: any, res: any) => {
  try {
    const { query, items } = req.body;
    if (!query || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Query ou items inválidos." });
    }
    if (items.some((item: any) => item?.privateMaterial || item?.rightsClassification === "PRIVATE_LICENSED_USER_COPY")) {
      return res.status(403).json({ error: "Metadados de materiais privados devem permanecer na busca local." });
    }

    const systemInstruction = `
      Você é um motor de busca semântica inteligente para o ConcurseiroOS.
      Seu papel é analisar a intenção por trás da query de busca do estudante e encontrar quais materiais de estudo da biblioteca são mais relevantes.
      Estes materiais podem ser leis, resumos, vídeos, mapas mentais, flashcards, anotações ou links.
      
      Você deve analisar as palavras-chave, mas principalmente o significado semântico conceitual (ex: se o usuário busca "limitação do estado", isso se relaciona fortemente com "Direito Administrativo", "Princípios", "Abuso de Poder", etc.).
      
      Retorne os resultados classificados do mais relevante para o menos relevante.
      Ignore itens que não tenham absolutamente nenhuma relevância.
    `;

    const userPrompt = `
      Query de busca do estudante: "${query}"

      Lista de itens cadastrados na Biblioteca:
      ${JSON.stringify(items.map((it: any) => ({
        id: it.id,
        titulo: it.titulo,
        descricao: it.descricao || "",
        tipoMaterial: it.tipoMaterial || "",
        tags: it.tags || [],
        disciplinaNome: it.disciplinaNome || "",
        assuntoNome: it.assuntoNome || ""
      })), null, 2)}

      Forneça uma resposta JSON contendo um array de correspondências mais relevantes. Cada correspondência deve ter o ID do item, um score de relevância de 0 a 100, e uma breve justificativa explicativa em português (uma frase) de por que este item é relevante para a query.
    `;

    const responseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        results: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              id: { type: SchemaType.STRING },
              score: { type: SchemaType.INTEGER, description: "Relevância de 0 a 100" },
              justificativa: { type: SchemaType.STRING, description: "Frase explicando a conexão semântica." }
            },
            required: ["id", "score", "justificativa"]
          }
        }
      },
      required: ["results"]
    };

    console.log(`[Semantic Search] Searching for query: "${query}" across ${items.length} items`);

    const ai = await createAiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.1,
      }
    });

    res.json(JSON.parse(response.text || "{\"results\": []}"));
  } catch (error: any) {
    console.error("[Semantic Search Error]", error);
    res.status(Number(error?.statusCode) || 500).json({ error: "Falha na busca semântica com IA.", details: error.message });
  }
});

// Automatic Material Organization Route
app.post("/api/organize-material", async (req: any, res: any) => {
  try {
    const { filename, fileContent, fileType, disciplinasList, sensitivity } = req.body;
    if (!filename || !disciplinasList || !Array.isArray(disciplinasList)) {
      return res.status(400).json({ error: "Filename ou disciplinasList inválidos." });
    }
    if (sensitivity === "PRIVATE_LICENSED_USER_COPY") {
      return res.status(403).json({ error: "Materiais privados licenciados não podem ser enviados ao serviço de IA." });
    }
    if (sensitivity === "METADATA_ONLY" && fileContent) {
      return res.status(400).json({ error: "METADATA_ONLY não aceita conteúdo do arquivo." });
    }
    if (sensitivity === "DERIVED_OUTLINE_ONLY" && String(fileContent || "").length > 12000) {
      return res.status(400).json({ error: "O sumário derivado excede o limite permitido." });
    }

    const systemInstruction = `
      Você é o organizador automático de arquivos do ConcurseiroOS.
      Sua tarefa é classificar um material usando nome, tipo e, quando explicitamente autorizado, somente um sumário derivado localmente com títulos e intervalos de páginas. Nunca presuma que recebeu ou leu o PDF integral.
      
      Selecione a disciplina e o assunto existentes que mais se aproximam do assunto do material.
      Se nenhum assunto existente for compatível, sugira a disciplina mais próxima e sugira um novo assunto adequado.
    `;

    const userPrompt = `
      Material para classificar:
      - Nome do arquivo/título: "${filename}"
      - Tipo: "${fileType || "Desconhecido"}"
      - Trecho do conteúdo / Descrição: "${(fileContent || "").slice(0, 3000)}"

      Lista de Disciplinas e Assuntos Cadastrados:
      ${JSON.stringify(disciplinasList.map((d: any) => ({
        id: d.id,
        nome: d.nome,
        assuntos: d.assuntos ? d.assuntos.map((a: any) => ({ id: a.id, nome: a.nome })) : []
      })), null, 2)}

      Forneça uma classificação de organização automática contendo:
      1. ID da disciplina recomendada (ou string vazia se nenhuma).
      2. ID do assunto recomendado (ou string vazia se for um novo assunto).
      3. Se for um novo assunto, indique o nome sugerido para o novo assunto.
      4. Um título otimizado e limpo para o material (ex: remova extensões, datas feias ou lixo do nome do arquivo).
      5. Uma descrição curta (1-2 frases) gerada por IA sintetizando o provável conteúdo do material.
      6. Uma lista de tags sugeridas para catalogação (3 a 5 tags em minúsculo).
      7. O tipo de material sugerido (deve ser um dos seguintes: "PDF", "VIDEO", "RESUMO", "MAPA_MENTAL", "LINK", "MARKDOWN", "ANOTACAO").
    `;

    const responseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        disciplinaId: { type: SchemaType.STRING, description: "ID da disciplina selecionada da lista." },
        assuntoId: { type: SchemaType.STRING, description: "ID do assunto selecionado da lista, ou vazio se for criar novo." },
        novoAssuntoNome: { type: SchemaType.STRING, description: "Nome do novo assunto se assuntoId for vazio." },
        tituloOtimizado: { type: SchemaType.STRING, description: "Título limpo e profissional." },
        descricaoSintetizada: { type: SchemaType.STRING, description: "Descrição gerada pela IA." },
        tagsSugeridas: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING }
        },
        tipoMaterialSugerido: { 
          type: SchemaType.STRING, 
          description: "PDF, VIDEO, RESUMO, MAPA_MENTAL, LINK, MARKDOWN, ou ANOTACAO" 
        }
      },
      required: ["disciplinaId", "assuntoId", "tituloOtimizado", "descricaoSintetizada", "tagsSugeridas", "tipoMaterialSugerido"]
    };

    console.log(`[Auto-Organize] Processing item: "${filename}"`);

    const ai = await createAiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.1,
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("[Auto-Organize Error]", error);
    res.status(Number(error?.statusCode) || 500).json({ error: "Falha ao organizar material com IA.", details: error.message });
  }
});

export default app;
