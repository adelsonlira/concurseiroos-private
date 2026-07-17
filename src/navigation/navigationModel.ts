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
  primary: boolean;
}

export interface NavigationSearchResult {
  item: NavigationItemDefinition;
  matchContext: string | null;
}

export const NAVIGATION_GROUPS: readonly NavigationGroupDefinition[] = [
  { id: "daily", label: "AGORA" },
  { id: "intelligence", label: "PLANO E BASE" },
  { id: "system", label: "CONTA E SISTEMA" },
] as const;

// A ordem segue o fluxo operacional esperado: decidir, executar, corrigir e calibrar.
// Ela não representa importância acadêmica nem peso de prova.
export const NAVIGATION_ITEMS: readonly NavigationItemDefinition[] = [
  {
    id: "dashboard",
    label: "Hoje — Seu Coach",
    badge: "G D",
    group: "daily",
    keywords: ["inicio", "hoje", "resumo", "prioridade", "proxima acao"],
    subitems: ["Prescrição atual", "Saldo diário", "Próximas sessões"],
    primary: true,
  },
  {
    id: "focus",
    label: "Sessão guiada",
    badge: "Alt P",
    group: "daily",
    keywords: ["sessao", "cronometro", "estudar", "executar", "pomodoro"],
    subitems: ["Sessão atual", "Cronômetro", "Material e páginas"],
    primary: true,
  },
  {
    id: "roadmap",
    label: "Plano e Progresso",
    badge: "G E",
    group: "intelligence",
    keywords: ["rota", "plano", "progresso", "semana", "diagnostico", "cobertura"],
    subitems: ["Mapa de evidências", "Próximos sete dias", "Fila estratégica"],
    primary: true,
  },
  {
    id: "reviews",
    label: "Revisões e erros",
    badge: "G R",
    group: "daily",
    keywords: ["revisao", "erro", "recuperacao", "memoria", "caderno"],
    subitems: ["Revisões vencidas", "Caderno de erros", "Recuperação adaptativa"],
    primary: true,
  },
  {
    id: "exercises",
    label: "Registrar questões",
    badge: "G Q",
    group: "daily",
    keywords: ["questoes", "tentativa", "acerto", "erro", "fgv", "diagnostico"],
    subitems: ["Registrar resultados", "Tentativas", "Diagnóstico por questões"],
    primary: true,
  },
  {
    id: "flashcards",
    label: "Flashcards prescritos",
    badge: "G F",
    group: "daily",
    keywords: ["cartoes", "memorizacao", "recuperacao", "baralho"],
    subitems: ["Cartões pendentes", "Recuperação ativa", "Agendamento adaptativo"],
    primary: false,
  },
  {
    id: "weekly",
    label: "Revisão da semana",
    badge: "G W",
    group: "daily",
    keywords: ["semana", "calibracao", "execucao", "planejado", "tempo"],
    subitems: ["Planejado versus executado", "Eficiência observada", "Proteção de avanço"],
    primary: false,
  },
  {
    id: "coach",
    label: "Perguntar ao Coach",
    badge: "G C",
    group: "daily",
    keywords: ["coach", "ia", "mentor", "explicacao", "ajuda", "duvida"],
    subitems: ["Mentoria", "Explicar recomendação", "Preparar sessão"],
    primary: false,
  },
  {
    id: "syllabus",
    label: "Edital e cobertura",
    badge: "G V",
    group: "intelligence",
    keywords: ["edital", "verticalizado", "topicos", "cobertura", "progresso"],
    subitems: ["Disciplinas", "Assuntos", "Subassuntos", "Cobertura confirmada"],
    primary: true,
  },
  {
    id: "library",
    label: "Materiais e páginas",
    badge: "G L",
    group: "intelligence",
    keywords: ["biblioteca", "material", "pdf", "aula", "paginas", "estrategia"],
    subitems: ["Materiais privados", "Localizador de aulas", "Páginas recomendadas"],
    primary: true,
  },
  {
    id: "online",
    label: "Conta e sincronização",
    badge: "G O",
    group: "system",
    keywords: ["conta", "login", "nuvem", "supabase", "sincronizacao", "pdf"],
    subitems: ["Autenticação", "Sincronização", "Cofre privado"],
    primary: true,
  },
  {
    id: "backup",
    label: "Configurações e backup",
    badge: "G B",
    group: "system",
    keywords: ["ajustes", "backup", "perfil", "disponibilidade", "restaurar", "exportar"],
    subitems: ["Disponibilidade semanal", "Exportar backup", "Restaurar dados"],
    primary: true,
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
    return NAVIGATION_ITEMS.filter((item) => item.primary).map((item) => ({ item, matchContext: null }));
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
