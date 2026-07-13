export type NavigationGroupId = "daily" | "intelligence" | "system";

export interface NavigationGroupDefinition {
  id: NavigationGroupId;
  label: string;
}

export interface NavigationItemDefinition {
  id: string;
  label: string;
  badge: string;
  group: NavigationGroupId;
  keywords: readonly string[];
  subitems: readonly string[];
}

export interface NavigationSearchResult {
  item: NavigationItemDefinition;
  matchContext: string | null;
}

export const NAVIGATION_GROUPS: readonly NavigationGroupDefinition[] = [
  { id: "daily", label: "ESTUDO DE HOJE" },
  { id: "intelligence", label: "PLANEJAMENTO E INTELIGÊNCIA" },
  { id: "system", label: "CONTA E SISTEMA" },
] as const;

// A ordem segue o fluxo operacional esperado: decidir, executar, corrigir e calibrar.
// Ela não representa importância acadêmica nem peso de prova.
export const NAVIGATION_ITEMS: readonly NavigationItemDefinition[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    badge: "G D",
    group: "daily",
    keywords: ["inicio", "hoje", "resumo", "prioridade", "proxima acao"],
    subitems: ["Próxima recomendação", "Saldo diário", "Resumo do dia"],
  },
  {
    id: "focus",
    label: "Desk de Foco",
    badge: "Alt P",
    group: "daily",
    keywords: ["sessao", "cronometro", "estudar", "executar", "pomodoro"],
    subitems: ["Sessão atual", "Cronômetro", "Registro de execução"],
  },
  {
    id: "roadmap",
    label: "Rota Estratégica",
    badge: "G E",
    group: "daily",
    keywords: ["rota", "plano", "semana", "diagnostico", "cobertura"],
    subitems: ["Mapa de evidências", "Próximos sete dias", "Fila estratégica"],
  },
  {
    id: "reviews",
    label: "Revisões & Erros",
    badge: "G R",
    group: "daily",
    keywords: ["revisao", "erro", "recuperacao", "memoria", "caderno"],
    subitems: ["Revisões vencidas", "Caderno de erros", "Recuperação adaptativa"],
  },
  {
    id: "exercises",
    label: "Banco de Questões",
    badge: "G Q",
    group: "daily",
    keywords: ["questoes", "tentativa", "acerto", "erro", "fgv", "diagnostico"],
    subitems: ["Registrar questão externa", "Tentativas", "Diagnóstico por questões"],
  },
  {
    id: "flashcards",
    label: "Flashcards Ativos",
    badge: "G F",
    group: "daily",
    keywords: ["cartoes", "memorizacao", "recuperacao", "baralho"],
    subitems: ["Cartões pendentes", "Recuperação ativa", "Agendamento adaptativo"],
  },
  {
    id: "weekly",
    label: "Calibração Semanal",
    badge: "G W",
    group: "daily",
    keywords: ["semana", "calibracao", "execucao", "planejado", "tempo"],
    subitems: ["Planejado versus executado", "Eficiência observada", "Proteção de avanço"],
  },
  {
    id: "coach",
    label: "Coach IA Mentoria",
    badge: "G C",
    group: "daily",
    keywords: ["coach", "ia", "mentor", "explicacao", "ajuda", "duvida"],
    subitems: ["Mentoria", "Explicar recomendação", "Preparar sessão"],
  },
  {
    id: "parser",
    label: "Edital Inteligente",
    badge: "G P",
    group: "intelligence",
    keywords: ["edital", "parser", "conteudo", "programa"],
    subitems: ["Estrutura do edital", "Importação", "Conteúdo programático"],
  },
  {
    id: "syllabus",
    label: "Edital Verticalizado",
    badge: "G V",
    group: "intelligence",
    keywords: ["edital", "verticalizado", "topicos", "cobertura", "progresso"],
    subitems: ["Disciplinas", "Assuntos", "Subassuntos", "Cobertura confirmada"],
  },
  {
    id: "library",
    label: "Biblioteca Inteligente",
    badge: "G L",
    group: "intelligence",
    keywords: ["biblioteca", "material", "pdf", "aula", "paginas", "estrategia"],
    subitems: ["Materiais privados", "Localizador de aulas", "Páginas recomendadas"],
  },
  {
    id: "online",
    label: "Conta & Nuvem",
    badge: "G O",
    group: "system",
    keywords: ["conta", "login", "nuvem", "supabase", "sincronizacao", "pdf"],
    subitems: ["Autenticação", "Sincronização", "Cofre privado"],
  },
  {
    id: "backup",
    label: "Ajustes & Backup",
    badge: "G B",
    group: "system",
    keywords: ["ajustes", "backup", "perfil", "disponibilidade", "restaurar", "exportar"],
    subitems: ["Disponibilidade semanal", "Exportar backup", "Restaurar dados"],
  },
] as const;

export function normalizeNavigationText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function filterNavigationItems(query: string): NavigationSearchResult[] {
  const normalizedQuery = normalizeNavigationText(query);

  if (!normalizedQuery) {
    return NAVIGATION_ITEMS.map((item) => ({ item, matchContext: null }));
  }

  return NAVIGATION_ITEMS.flatMap((item) => {
    const label = normalizeNavigationText(item.label);
    const keywordMatch = item.keywords.find((keyword) =>
      normalizeNavigationText(keyword).includes(normalizedQuery),
    );
    const subitemMatch = item.subitems.find((subitem) =>
      normalizeNavigationText(subitem).includes(normalizedQuery),
    );

    if (label.includes(normalizedQuery) || keywordMatch || subitemMatch) {
      return [{ item, matchContext: subitemMatch ?? keywordMatch ?? null }];
    }

    return [];
  });
}

export function getNavigationItem(id: string): NavigationItemDefinition | undefined {
  return NAVIGATION_ITEMS.find((item) => item.id === id);
}
