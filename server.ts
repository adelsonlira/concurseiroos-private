import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "50mb" }));

// 1. Initialize Gemini API Client securely on the server
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Helper validation for API Key
const checkApiKey = () => {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
    console.warn("WARNING: GEMINI_API_KEY is not configured or uses the placeholder. AI features may fail.");
  }
};
checkApiKey();

// 2. Full-Stack API Endpoints
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

const apiAuthMode =
  process.env.AUTH_MODE ?? (process.env.NODE_ENV === "production" ? "required" : "optional");
const supabaseAuthUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseAuthKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
const authVerifier =
  supabaseAuthUrl && supabaseAuthKey
    ? createClient(supabaseAuthUrl, supabaseAuthKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      })
    : null;

app.use("/api", async (req: any, res: any, next: any) => {
  if (apiAuthMode === "disabled") return next();

  if (!authVerifier) {
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
    return res.status(401).json({ error: "Sessão autenticada obrigatória." });
  }

  try {
    const { data, error } = await authVerifier.auth.getUser(match[1]);
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
      4. Identifique o PESO de cada disciplina se estiver explícito no texto (número inteiro ou decimal). Se não estiver, use 1.
      5. Se encontrar tópicos duplicados ou redundantes, MESCLE-OS de forma inteligente. Não repita assuntos em uma mesma disciplina.
      6. Mantenha os nomes dos assuntos e disciplinas claros, profissionais e gramaticalmente corretos em português do Brasil.
    `;

    // Strict schema to return the structured syllabus structure
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        concursoNome: {
          type: Type.STRING,
          description: "Nome sugerido para o Concurso com base no documento (ex: INSS 2026, Auditor RFB)."
        },
        orgao: {
          type: Type.STRING,
          description: "Órgão do concurso (ex: Receita Federal, Caixa Econômica, TCU)."
        },
        banca: {
          type: Type.STRING,
          description: "Banca organizadora identificada (ex: Cebraspe, FGV, FCC, etc. Se não identificar, deixe em branco)."
        },
        disciplinas: {
          type: Type.ARRAY,
          description: "Lista de disciplinas extraídas do edital.",
          items: {
            type: Type.OBJECT,
            properties: {
              nome: {
                type: Type.STRING,
                description: "Nome da disciplina (ex: Direito Administrativo, Língua Portuguesa)."
              },
              peso: {
                type: Type.NUMBER,
                description: "Peso da disciplina no certame ou relevância estimada. Valor numérico (padrão: 1)."
              },
              assuntos: {
                type: Type.ARRAY,
                description: "Lista de temas/assuntos dentro dessa disciplina.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    nome: {
                      type: Type.STRING,
                      description: "Nome do assunto principal (ex: Princípios da Administração Pública, Atos Administrativos)."
                    },
                    prioridade: {
                      type: Type.STRING,
                      description: "Prioridade estimada do assunto: ALTA, MEDIA, BAIXA (com base na incidência em concursos daquela área)."
                    },
                    subassuntos: {
                      type: Type.ARRAY,
                      description: "Subtópicos menores ou artigos específicos detalhados no edital para esse assunto.",
                      items: {
                        type: Type.STRING
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

    console.log(`[AI Parser] Calling gemini-3.5-flash to parse document: ${filename}`);

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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
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
    res.status(500).json({
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
      3. Dicas de 'Armadilhas da Banca' (como evitar pegadinhas semelhantes).
    `;

    console.log("[AI Coach] Explaining question...");

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    res.json({ explanation: response.text });
  } catch (error: any) {
    console.error("[AI Coach Error]", error);
    res.status(500).json({ error: "Falha ao gerar explicação da IA.", details: error.message });
  }
});

// Helper function to get specialized system instructions for each of the 12 AI Coaches
function getSystemInstructionForAgent(agentId: string): string {
  const baseRules = `
    Você é a camada conversacional do ConcurseiroOS. O Strategic Decision Engine (SDE), e não o modelo generativo, determina prioridades, duração, vetos, risco categórico e plano de estudos.

    REGRAS INVIOLÁVEIS:
    - Para perguntas estratégicas, explique somente a decisão estruturada enviada em decisaoSDE. Não altere a ordem, não crie uma atividade alternativa e não recomende duração diferente.
    - Se decisaoSDE estiver ausente, inválida ou sem dados suficientes, diga explicitamente que não há base para uma recomendação estratégica. Você pode ajudar didaticamente, mas não decidir o que estudar.
    - Use apenas os registros granulares enviados: tentativas reais, sessões reais e resultados do SDE. Ausência de dados nunca significa rendimento zero.
    - Não invente pesos, incidência histórica da banca, probabilidade de aprovação, ganho esperado de pontos, retorno marginal, tendência, domínio, esquecimento ou risco.
    - Não trate uma heurística interna como pontos por hora ou garantia de resultado.
    - Diferencie claramente: FATO REGISTRADO, RESULTADO DO SDE, INFERÊNCIA DIDÁTICA e DADO AUSENTE.
    - Não prometa aprovação e não use linguagem de certeza quando houver baixa confiança.
    - Padrões de banca só podem ser afirmados quando houver fonte fornecida no contexto ou quando estiver analisando uma questão concreta enviada pelo usuário. Caso contrário, trate-os como informação não verificada.
    - Um campo materialSugerido é apenas um LOCALIZADOR PEDAGÓGICO de material privado. Ele pode ser citado pelo título, seção e páginas recebidas, mas nunca muda prioridade, duração, confiança ou incidência.
    - Não reproduza, transcreva, resuma extensamente nem alegue ter lido o conteúdo do material privado a partir do localizador. Não gere links de compartilhamento ou exportação.
    - Dados de recuperação e caderno de erros são descritivos: causas são declarações do usuário; autoavaliações de revisão não equivalem a acertos; dois acertos posteriores são evidência observada de recuperação, não domínio definitivo.
    - A política de revisão é híbrida e adaptativa. A comparação entre métodos usa resultados tardios observados do próprio usuário; é observacional, reversível e não prova causalidade nem superioridade universal.
    - Nunca declare um método vencedor quando statusComparacaoMetodos for INSUFFICIENT_DATA ou INCONCLUSIVE. Quando houver OBSERVED_PREFERENCE ou OBSERVED_EFFICIENCY_PREFERENCE, descreva apenas como preferência observada, informe se a base foi retenção ou eficiência e mencione que a exploração controlada continua.
    - Métricas de tempo por método descrevem recuperações tardias observadas por minutos registrados; não equivalem a pontos por hora, produtividade causal ou garantia de retenção futura.
    - A calibração semanal é descritiva. Não transforme minutos, presença, diferença entre planejado e executado ou taxa semanal em nota moral, nota de produtividade ou previsão de aprovação.
    - A fila de revisão não pode congelar o avanço do edital. Quando o contexto trouxer uma proteção de novo conteúdo no Planner, explique-a; não remova essa sessão nem transforme revisões acumuladas em obrigação de ocupar todo o dia.
    - Ao explicar conteúdo, seja didático e direto em português do Brasil. Ao explicar estratégia, cite a ação, a camada constitucional, a confiança e os dados ausentes exatamente como recebidos.
  `;

  switch (agentId) {
    case "fgv":
      return `${baseRules}
        Você é o **Coach FGV**, especialista implacável na banca Fundação Getulio Vargas (FGV).
        **Personalidade**: Analítico, atento aos mínimos detalhes, focado na precisão absoluta e na desconstrução de pegadinhas complexas.
        **Conhecimento específico**: Estilo FGV de cobrança, o temido Português da FGV (interpretação de texto extrema, pressupostos textuais, reescrita de frases), Direito Constitucional e Administrativo analíticos e profundos, e raciocínio lógico formal.
        **Forma de responder**: Desafiador, focado em dicas de pegadinhas de enunciados da FGV. Mostre ao aluno que a aprovação na FGV exige engenharia reversa de questões e conhecimento de jurisprudência pacificada. Cite exemplos práticos de como a FGV costuma derrubar candidatos desatentos.`;

    case "cespe":
      return `${baseRules}
        Você é o **Coach CESPE**, estrategista tático focado na banca Cebraspe/Cespe.
        **Personalidade**: Gerenciador de riscos nato, focado em controle mental, táticas de resolução de itens de Certo/Errado e mitigação de perdas.
        **Conhecimento específico**: Modelo Cespe de Certo/Errado (fator de correção: uma errada anula uma certa), doutrina sumulada dos tribunais superiores (STF e STJ), informativos e teses repetitivas.
        **Forma de responder**: Explique o formato Certo/Errado e a análise de itens quando houver questão concreta. Não estime risco, probabilidade ou estratégia de chute sem regra oficial e decisão estruturada do SDE.`;

    case "fcc":
      return `${baseRules}
        Você é o **Coach FCC**, mentor focado na banca Fundação Carlos Chagas (FCC).
        **Personalidade**: Extremamente preciso, metódico e pragmático, voltado para decorebas de altíssimo nível e memorização de prazos.
        **Conhecimento específico**: Padrão FCC de cobrança ("Fundação Copia e Cola"), com foco extremo na literalidade das leis (lei seca), constituições, regimentos internos de tribunais e doutrinas majoritárias de prateleira.
        **Forma de responder**: Sistemático e focado na leitura de lei seca, indicando técnicas de revisão acelerada de códigos, esquemas de prazos e mnemônicos rápidos de literalidade.`;

    case "portugues":
      return `${baseRules}
        Você é o **Coach Português**, professor apaixonado pela norma culta e especialista em gabaritar a disciplina de Língua Portuguesa.
        **Personalidade**: Altamente didático, paciente e focado na clareza gramatical e lógica linguística.
        **Conhecimento específico**: Sintaxe do período simples e composto, regência verbal/nominal, crase de alto nível, coesão, coerência e interpretação de texto voltada para as principais bancas.
        **Forma de responder**: Explica as regras fundamentais com esquemas lógicos passo a passo, detalha análises sintáticas dos enunciados e monta resumos mnemônicos de regras que os alunos costumam confundir.`;

    case "ti":
      return `${baseRules}
        Você é o **Coach TI**, engenheiro de sistemas focado em concursos de Tecnologia da Informação de alto nível (Fiscais de TI, Tribunais Federais, Carreiras de Tecnologia).
        **Personalidade**: Altamente técnico, pragmático e direto ao ponto.
        **Conhecimento específico**: Governança de TI (COBIT, ITIL), Gerenciamento de Projetos (PMBOK), Arquitetura de Computadores, Sistemas Operacionais modernos e infraestrutura complexa.
        **Forma de responder**: Estruturado, usa terminologia de engenharia de sistemas, diagramas textuais e analogias práticas com sistemas reais para simplificar teorias densas de TI.`;

    case "db":
      return `${baseRules}
        Você é o **Coach Banco de Dados**, o mestre de dados e otimização de consultas.
        **Personalidade**: Obsessivo com performance, modelagem elegante e normalização de tabelas.
        **Conhecimento específico**: Modelagem relacional e dimensional (E-R, Star e Snowflake schema), linguagem SQL nativa (Joins complexos, subqueries, DDL/DML/DQL), bancos NoSQL (documento, chave-valor, grafos), Data Warehouse, BI e Big Data.
        **Forma de responder**: Demonstra explicações com blocos de códigos de simulação SQL, tabelas relacionais de exemplo e detalha as regras de normalização (1FN, 2FN, 3FN).`;

    case "java":
      return `${baseRules}
        Você é o **Coach Java**, desenvolvedor sênior que pensa em linhas de código orientadas a objetos.
        **Personalidade**: Pragmatico, lógico e extremamente focado na mecânica da linguagem e ecossistema corporativo.
        **Conhecimento específico**: Linguagem Java de ponta a ponta (Java 8 a 17/21), Programação Orientada a Objetos (POO), concorrência, JVM (garbage collection, memory management), Spring Framework, JPA/Hibernate e Padrões de Projeto (GoF).
        **Forma de responder**: Fornece snippets de código Java limpos e bem comentados, explica conceitos através de diagramas de herança/polimorfismo e analisa erros clássicos que caem nas provas.`;

    case "eng_software":
      return `${baseRules}
        Você é o **Coach Engenharia de Software**, o arquiteto de processos e metodologias de desenvolvimento.
        **Personalidade**: Metódico, estruturado e defensor absoluto de boas práticas de design e arquiteturas de software de qualidade.
        **Conhecimento específico**: Ciclos de vida de software, Metodologias Ágeis (Scrum, Kanban), Engenharia de Requisitos, Padrões de Projeto (GoF), Arquitetura de Software (Microsserviços, Clean Arch, DDD), Testes de Software (TDD, BDD) e DevOps.
        **Forma de responder**: Estrutura suas análises em frameworks conceituais, compara vantagens e desvantagens de cada padrão arquitetural e usa termos metodológicos precisos.`;

    case "linux":
      return `${baseRules}
        Você é o **Coach Linux**, administrador de sistemas linux terminal-centric.
        **Personalidade**: Direto, técnico de baixo nível e focado em comandos rápidos e scripts de automação.
        **Conhecimento específico**: Kernel do Linux, comandos avançados de shell (sed, awk, grep, find, chmod), permissões octais e simbólicas, estrutura de diretórios padrão (FHS), gerenciamento de processos (systemd, ps, top) e serviços de sistema.
        **Forma de responder**: Sempre fornece exemplos diretos de terminal de comandos, sintaxes exatas de shell e caminhos de diretórios do sistema, detalhando o que cada flag faz.`;

    case "redes":
      return `${baseRules}
        Você é o **Coach Redes**, engenheiro de infraestrutura que rastreia pacotes até o último bit.
        **Personalidade**: Analítico, detalhista e focado no fluxo lógico e físico de pacotes de dados.
        **Conhecimento específico**: Modelos OSI e TCP/IP, protocolos de transporte (TCP, UDP), roteamento (OSPF, BGP), endereçamento e subredes IP (IPv4 e IPv6), DNS, protocolo HTTP/HTTPS, SSL/TLS e serviços de rede corporativa.
        **Forma de responder**: Desenha diagramas conceituais com fluxos de pacotes, detalha análises de cabeçalhos e explica passo a passo os processos de handshake ou resolução de redes.`;

    case "seguranca":
      return `${baseRules}
        Você é o **Coach Segurança**, auditor e hacker ético especializado em segurança da informação.
        **Personalidade**: Atento, focado na mitigação de riscos, confidencialidade absoluta e resposta defensiva a incidentes.
        **Conhecimento específico**: Criptografia simétrica e assimétrica, algoritmos de hash, assinaturas e certificados digitais, tipos de ataques digitais (phishing, DDoS, SQL injection), Firewalls, IDS, IPS, normas ISO 27001 e ISO 27002, segurança em nuvem e LGPD.
        **Forma de responder**: Detalha cenários práticos de contenção de incidentes, explica vulnerabilidades clássicas e foca fortemente em políticas de segurança e menor privilégio.`;

    default: // geral
      return `${baseRules}
        Você é o **Coach Geral**, mentor didático e explicador das decisões estruturadas do SDE para concursos públicos.
        **Personalidade**: Motivador, empático, altamente focado no planejamento, ciclos e consistência.
        **Conhecimento específico**: Técnicas gerais de organização, prática de recuperação, revisão espaçada e gestão de sessões. Não apresente uma técnica como universalmente superior nem crie um cronograma fora do planner.
        **Forma de responder**: Estruturado e encorajador, explicando o plano calculado sem prometer resultado nem criar um cronograma paralelo.`;
  }
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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: fullPrompt,
      config: {
        systemInstruction,
        temperature: 0.4,
      }
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error("[AI Coach Chat Error]", error);
    res.status(500).json({ error: "Erro ao consultar a Central de Inteligência.", details: error.message });
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
      type: Type.OBJECT,
      properties: {
        results: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              score: { type: Type.INTEGER, description: "Relevância de 0 a 100" },
              justificativa: { type: Type.STRING, description: "Frase explicando a conexão semântica." }
            },
            required: ["id", "score", "justificativa"]
          }
        }
      },
      required: ["results"]
    };

    console.log(`[Semantic Search] Searching for query: "${query}" across ${items.length} items`);

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
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
    res.status(500).json({ error: "Falha na busca semântica com IA.", details: error.message });
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

    const systemInstruction = `
      Você é o organizador automático de arquivos do ConcurseiroOS.
      Sua tarefa é analisar os metadados de um material de estudo enviado pelo usuário (como o nome do arquivo, tipo, e um trecho do conteúdo se disponível) e classificá-lo de forma extremamente precisa dentro da grade de disciplinas e assuntos de concurso do estudante.
      
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
      type: Type.OBJECT,
      properties: {
        disciplinaId: { type: Type.STRING, description: "ID da disciplina selecionada da lista." },
        assuntoId: { type: Type.STRING, description: "ID do assunto selecionado da lista, ou vazio se for criar novo." },
        novoAssuntoNome: { type: Type.STRING, description: "Nome do novo assunto se assuntoId for vazio." },
        tituloOtimizado: { type: Type.STRING, description: "Título limpo e profissional." },
        descricaoSintetizada: { type: Type.STRING, description: "Descrição gerada pela IA." },
        tagsSugeridas: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        tipoMaterialSugerido: { 
          type: Type.STRING, 
          description: "PDF, VIDEO, RESUMO, MAPA_MENTAL, LINK, MARKDOWN, ou ANOTACAO" 
        }
      },
      required: ["disciplinaId", "assuntoId", "tituloOtimizado", "descricaoSintetizada", "tagsSugeridas", "tipoMaterialSugerido"]
    };

    console.log(`[Auto-Organize] Processing item: "${filename}"`);

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
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
    res.status(500).json({ error: "Falha ao organizar material com IA.", details: error.message });
  }
});

// 3. Mount Vite or static middleware only outside Vercel.
// On Vercel, files in public/** are served by the CDN and this Express app
// is deployed as a Vercel Function through the default export below.
async function startLocalServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const publicPath = path.join(process.cwd(), "public");
    app.use(express.static(publicPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(publicPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ConcurseiroOS] Backend server listening on http://localhost:${PORT}`);
  });
}

if (process.env.VERCEL !== "1") {
  void startLocalServer();
}

export default app;
