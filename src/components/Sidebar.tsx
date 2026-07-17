import { useEffect, useMemo, useRef, useState } from "react";
import {
  Brain,
  CalendarRange,
  Cloud,
  CloudOff,
  Database,
  FileQuestion,
  Flame,
  Layers,
  LayoutDashboard,
  Library,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Route,
  Search,
  Target,
  Timer,
  X,
  type LucideIcon,
} from "lucide-react";
import { APP_RELEASE_CHANNEL, APP_VERSION } from "../config/appMetadata";
import { useCloudAccountStore } from "../integrations/cloud/cloudStore";
import {
  filterNavigationItems,
  NAVIGATION_GROUPS,
  type NavigationGroupId,
} from "../navigation/navigationModel";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  streak: number;
  mobileOpen: boolean;
  onMobileClose: () => void;
  desktopCollapsed: boolean;
  onToggleDesktopCollapsed: () => void;
  searchFocusToken: number;
}

const ICONS_BY_ID: Readonly<Record<string, LucideIcon>> = {
  dashboard: LayoutDashboard,
  focus: Timer,
  roadmap: Route,
  reviews: RotateCcw,
  exercises: FileQuestion,
  flashcards: Layers,
  weekly: CalendarRange,
  coach: Brain,
  syllabus: Target,
  library: Library,
  online: Cloud,
  backup: Database,
};

export default function Sidebar({
  activeTab,
  setActiveTab,
  streak,
  mobileOpen,
  onMobileClose,
  desktopCollapsed,
  onToggleDesktopCollapsed,
  searchFocusToken,
}: SidebarProps) {
  const cloudAvailability = useCloudAccountStore((state) => state.environment.availability);
  const cloudAuthStatus = useCloudAccountStore((state) => state.authStatus);
  const cloudPhase = useCloudAccountStore((state) => state.phase);
  const cloudUser = useCloudAccountStore((state) => state.user);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => filterNavigationItems(query), [query]);
  const resultsByGroup = useMemo(() => {
    const grouped = new Map<NavigationGroupId, typeof results>();
    for (const group of NAVIGATION_GROUPS) {
      grouped.set(
        group.id,
        results.filter((result) => result.item.group === group.id),
      );
    }
    return grouped;
  }, [results]);

  useEffect(() => {
    if (searchFocusToken <= 0) return;
    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 100);
    return () => window.clearTimeout(timer);
  }, [searchFocusToken]);

  useEffect(() => {
    if (!mobileOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (query) {
        setQuery("");
      } else {
        onMobileClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [mobileOpen, onMobileClose, query]);

  const openExpandedSearch = () => {
    if (desktopCollapsed) onToggleDesktopCollapsed();
    window.setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const navigate = (tab: string) => {
    setActiveTab(tab);
    onMobileClose();
  };

  const cloudStatusText =
    cloudAvailability !== "CONFIGURED"
      ? "salvo neste navegador"
      : cloudAuthStatus === "SIGNED_IN"
        ? cloudPhase === "SYNCING" || cloudPhase === "UPLOADING"
          ? "sincronizando"
          : "nuvem conectada"
        : "nuvem desconectada";
  const profileLabel =
    cloudAuthStatus === "SIGNED_IN" && cloudUser?.email
      ? cloudUser.email
      : "Perfil de estudos";
  const profileInitials =
    cloudAuthStatus === "SIGNED_IN" && cloudUser?.email
      ? cloudUser.email.slice(0, 2).toUpperCase()
      : "PE";

  return (
    <>
      <button
        type="button"
        aria-label="Fechar menu de navegação"
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity lg:hidden ${
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onMobileClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(88vw,20rem)] shrink-0 select-none flex-col border-r border-zinc-800 bg-zinc-950 shadow-2xl transition-[transform,width] duration-200 lg:static lg:z-auto lg:h-full lg:translate-x-0 lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${desktopCollapsed ? "lg:w-20" : "lg:w-72"}`}
        id="sidebar-rail"
        aria-label="Navegação principal"
      >
        <div className={`shrink-0 border-b border-zinc-900 p-4 ${desktopCollapsed ? "lg:px-3" : ""}`}>
          <div className={`flex items-center ${desktopCollapsed ? "lg:justify-center" : "justify-between"}`}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-400 bg-blue-600 font-mono text-base font-bold text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                C
              </div>
              <div className={`min-w-0 ${desktopCollapsed ? "lg:hidden" : ""}`}>
                <h1 className="truncate text-sm font-semibold tracking-wide text-zinc-100">ConcurseiroOS</h1>
                <p className="truncate font-mono text-[10px] text-zinc-500">v{APP_VERSION} · {APP_RELEASE_CHANNEL}</p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Fechar menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100 lg:hidden"
              onClick={onMobileClose}
            >
              <X className="h-5 w-5" />
            </button>

            <button
              type="button"
              aria-label={desktopCollapsed ? "Expandir menu" : "Recolher menu"}
              title={desktopCollapsed ? "Expandir menu" : "Recolher menu"}
              className={`hidden h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-100 lg:inline-flex ${
                desktopCollapsed ? "lg:absolute lg:left-[4.9rem] lg:top-4 lg:border lg:border-zinc-800 lg:bg-zinc-950" : ""
              }`}
              onClick={onToggleDesktopCollapsed}
            >
              {desktopCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>

          <div
            className={`mt-4 flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 transition hover:border-zinc-700 ${
              desktopCollapsed ? "lg:hidden" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 animate-pulse fill-amber-500 text-amber-500" />
              <span className="text-xs font-medium text-zinc-200">Dias seguidos</span>
            </div>
            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-xs font-bold text-amber-500">
              {streak}d
            </span>
          </div>

          <div className={`mt-4 ${desktopCollapsed ? "lg:hidden" : ""}`}>
            <label htmlFor="navigation-search" className="sr-only">
              Buscar telas e funções
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                ref={searchInputRef}
                id="navigation-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar telas e funções…"
                autoComplete="off"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-12 text-xs text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
              />
              <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500">
                Ctrl K
              </kbd>
            </div>
          </div>

          <button
            type="button"
            aria-label="Abrir busca de navegação"
            title="Buscar telas e funções (Ctrl+K)"
            onClick={openExpandedSearch}
            className={`mt-4 hidden h-10 w-full items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100 ${
              desktopCollapsed ? "lg:flex" : ""
            }`}
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3" id="sidebar-navigation">
          {results.length === 0 ? (
            <div className={`rounded-lg border border-dashed border-zinc-800 p-4 text-center ${desktopCollapsed ? "lg:hidden" : ""}`}>
              <Search className="mx-auto mb-2 h-5 w-5 text-zinc-600" />
              <p className="text-xs text-zinc-400">Nenhuma função encontrada.</p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-2 text-[11px] font-medium text-blue-400 hover:text-blue-300"
              >
                Limpar busca
              </button>
            </div>
          ) : (
            NAVIGATION_GROUPS.map((group) => {
              const groupResults = resultsByGroup.get(group.id) ?? [];
              if (groupResults.length === 0) return null;

              return (
                <section key={group.id} className="mb-4 last:mb-1" aria-labelledby={`navigation-group-${group.id}`}>
                  <h2
                    id={`navigation-group-${group.id}`}
                    className={`mb-1.5 px-3 py-1 text-[9px] font-bold tracking-[0.16em] text-zinc-600 ${
                      desktopCollapsed ? "lg:hidden" : ""
                    }`}
                  >
                    {group.label}
                  </h2>

                  <div className="flex flex-col gap-1">
                    {groupResults.map(({ item, matchContext }) => {
                      const Icon = ICONS_BY_ID[item.id] ?? LayoutDashboard;
                      const isActive = activeTab === item.id;

                      return (
                        <button
                          type="button"
                          key={item.id}
                          id={`sidebar-link-${item.id}`}
                          onClick={() => navigate(item.id)}
                          aria-current={isActive ? "page" : undefined}
                          title={desktopCollapsed ? item.label : undefined}
                          className={`group w-full rounded-md border-l-2 py-2 text-left text-xs transition ${
                            desktopCollapsed ? "lg:flex lg:justify-center lg:px-2" : "px-3"
                          } ${
                            isActive
                              ? "border-blue-500 bg-zinc-900 font-medium text-zinc-100"
                              : "border-transparent text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <Icon
                                className={`h-[18px] w-[18px] shrink-0 ${
                                  isActive ? "text-blue-500" : "text-zinc-400 group-hover:text-zinc-300"
                                }`}
                              />
                              <div className={`min-w-0 ${desktopCollapsed ? "lg:hidden" : ""}`}>
                                <span className="block truncate">{item.label}</span>
                                {query && matchContext ? (
                                  <span className="mt-0.5 block truncate text-[9px] font-normal text-zinc-600">
                                    {matchContext}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <kbd
                              className={`shrink-0 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500 ${
                                desktopCollapsed ? "lg:hidden" : ""
                              }`}
                            >
                              {item.badge}
                            </kbd>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </nav>

        <div
          className={`shrink-0 border-t border-zinc-900 bg-zinc-950/95 p-4 ${
            desktopCollapsed ? "lg:px-3" : ""
          }`}
        >
          <button
            type="button"
            onClick={() => navigate("online")}
            className={`flex w-full items-center gap-2 rounded-lg p-1 text-left transition hover:bg-zinc-900 ${desktopCollapsed ? "lg:justify-center" : "justify-between"}`}
            title="Abrir conta e diagnóstico dos serviços"
          >
            <div className={`flex min-w-0 items-center gap-2 ${desktopCollapsed ? "lg:hidden" : ""}`}>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xs font-bold uppercase text-zinc-300">
                {profileInitials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-zinc-200">{profileLabel}</p>
                <p className="truncate font-mono text-[9px] text-zinc-500">{cloudStatusText}</p>
              </div>
            </div>
            {cloudAuthStatus === "SIGNED_IN" ? (
              <Cloud
                title={cloudStatusText}
                className={`h-4 w-4 shrink-0 ${cloudPhase === "ERROR" ? "text-red-400" : "text-emerald-400"}`}
              />
            ) : (
              <CloudOff title={cloudStatusText} className="h-4 w-4 shrink-0 text-zinc-600" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
