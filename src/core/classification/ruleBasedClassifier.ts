import type { QuestionClassificationProposal } from "./types";

export interface ClassificationRule {
  id: string;
  targetTaxonomyNodeId: string;
  keywords: RegExp[];
  confidence: number;
}

export const DATAPREV_PRIORITY_CLASSIFICATION_RULES: readonly ClassificationRule[] = [
  { id: "java-frameworks", targetTaxonomyNodeId: "dp26-p3-esp-linguagens-frameworks", keywords: [/\bjava\b/i, /spring(?: boot| cloud)?/i, /hibernate|jpa|junit|jakarta|javaee/i], confidence: 0.76 },
  { id: "software-architecture-api", targetTaxonomyNodeId: "dp26-p3-esp-arquitetura-software", keywords: [/\bapi\b|swagger|web services?|mensageria|\bsoa\b/i, /interoperabilidade/i], confidence: 0.74 },
  { id: "web-data-standards", targetTaxonomyNodeId: "dp26-p3-esp-padroes-dados-web", keywords: [/\bxml\b|xslt|uddi|\bjson\b/i, /\brest(?:ful)?\b/i], confidence: 0.72 },
  { id: "devops-git", targetTaxonomyNodeId: "dp26-p3-esp-devops-git", keywords: [/\bdevops\b|integração contínua|entrega contínua/i, /\bgit\b|controle de versão/i], confidence: 0.75 },
  { id: "software-testing", targetTaxonomyNodeId: "dp26-p3-esp-testes", keywords: [/teste(?:s)? unitári|teste(?:s)? de integração|\btdd\b/i, /automação de testes|caso de teste|ciclo de vida de testes/i], confidence: 0.76 },
  { id: "agile-methods", targetTaxonomyNodeId: "dp26-p3-esp-metodologias-ageis", keywords: [/\bscrum\b|\bkanban\b|extreme programming|\bxp\b/i, /sprint|product backlog|scrum master/i], confidence: 0.78 },
  { id: "software-metrics", targetTaxonomyNodeId: "dp26-p3-esp-metricas", keywords: [/pontos? de função|análise de pontos? de função/i, /story points?/i], confidence: 0.79 },
  { id: "requirements", targetTaxonomyNodeId: "dp26-p3-esp-requisitos", keywords: [/elicitação de requisitos|requisito(?:s)? funcionais?|requisito(?:s)? não funcionais?/i, /caso de uso|história de usuário/i], confidence: 0.75 },
  { id: "modern-architecture", targetTaxonomyNodeId: "dp26-p3-esp-design-arquitetura", keywords: [/microsserviços?|arquitetura hexagonal|api gateway/i, /containers?|transaç(?:ão|ões) distribuída/i], confidence: 0.76 },
  { id: "ai-data-bigdata", targetTaxonomyNodeId: "dp26-p3-esp-ia-dados-bigdata", keywords: [/machine learning|aprendizado de máquina|inteligência artificial/i, /big data|modelo de linguagem|rede neural/i], confidence: 0.72 },
  { id: "security-policy", targetTaxonomyNodeId: "dp26-p3-esp-si-politicas", keywords: [/política de segurança da informação|gestão de segurança da informação/i, /confidencialidade.*integridade.*disponibilidade/i], confidence: 0.74 },
  { id: "identity-access", targetTaxonomyNodeId: "dp26-p3-esp-si-acesso", keywords: [/oauth\s*2|single sign-on|\bsso\b/i, /controle de acesso|autenticação|autorização/i], confidence: 0.74 },
  { id: "owasp-sdl", targetTaxonomyNodeId: "dp26-p3-esp-si-sdl-owasp", keywords: [/owasp|cross-site scripting|sql injection/i, /secure development lifecycle|\bsdl\b/i], confidence: 0.8 },
  { id: "sql", targetTaxonomyNodeId: "dp26-p3-esp-bd-sql", keywords: [/\bsql\b|select\s+.+\s+from/i, /join|group by|having|procedure|trigger/i], confidence: 0.76 },
  { id: "nosql", targetTaxonomyNodeId: "dp26-p3-esp-bd-nosql", keywords: [/\bnosql\b|mongodb|cassandra|banco de documentos/i, /chave[- ]valor|família de colunas/i], confidence: 0.78 },
  { id: "etl-integration", targetTaxonomyNodeId: "dp26-p3-esp-bd-integracao-ingestao", keywords: [/\betl\b|\belt\b|extração.*transformação.*carga/i, /ingestão de dados|pipeline de dados/i], confidence: 0.78 },
  { id: "lgpd", targetTaxonomyNodeId: "dp26-p3-leg-lgpd-capitulos", keywords: [/\blgpd\b|lei\s*n?[ºo.]?\s*13\.709/i, /controlador.*operador|dados pessoais sensíveis/i], confidence: 0.8 },
  { id: "lai", targetTaxonomyNodeId: "dp26-p3-leg-lai-capitulos", keywords: [/lei de acesso à informação|lei\s*n?[ºo.]?\s*12\.527/i, /acesso à informação pública/i], confidence: 0.8 },
] as const;

export function proposeRuleBasedClassification(params: {
  questionId: string;
  text: string;
  evidenceSourceId: string;
  evidencePage: number | null;
  rules?: readonly ClassificationRule[];
}): QuestionClassificationProposal | null {
  const text = params.text.normalize("NFKC");
  const matches = (params.rules ?? DATAPREV_PRIORITY_CLASSIFICATION_RULES)
    .map((rule) => ({ rule, matchCount: rule.keywords.filter((keyword) => keyword.test(text)).length }))
    .filter((item) => item.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount || b.rule.confidence - a.rule.confidence || a.rule.id.localeCompare(b.rule.id));
  if (matches.length === 0) return null;
  const best = matches[0];
  const tiedTarget = matches[1] && matches[1].matchCount === best.matchCount && matches[1].rule.targetTaxonomyNodeId !== best.rule.targetTaxonomyNodeId;
  if (tiedTarget) return null;
  const confidence = Math.min(0.79, best.rule.confidence + Math.max(0, best.matchCount - 1) * 0.02);
  return {
    id: `classification:${params.questionId}:${best.rule.id}`,
    questionId: params.questionId,
    sourceTaxonomyNodeId: null,
    targetTaxonomyNodeId: best.rule.targetTaxonomyNodeId,
    equivalenceStrength: "APPROXIMATE",
    confidence,
    evidenceSourceIds: [params.evidenceSourceId],
    evidencePage: params.evidencePage,
    method: "RULE_BASED",
    status: "PROPOSED",
    rationale: `Regra determinística '${best.rule.id}' encontrou ${best.matchCount} sinal(is) lexical(is). Requer classificação no edital de origem e revisão humana antes de qualquer incidência.`,
  };
}
