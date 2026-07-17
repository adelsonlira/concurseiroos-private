import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Menu, Search } from "lucide-react";
import { useConcurseiroStore } from "./store";
import Sidebar from "./components/Sidebar";
import { useCloudAccountStore } from "./integrations/cloud/cloudStore";
import { getNavigationItem } from "./navigation/navigationModel";
import { WORKSPACE_CONTENT_CLASS_NAME } from "./layout/appShellLayout";
import AccessGate from "./components/AccessGate";
import { decideAppAccess } from "./integrations/cloud/appAccessPolicy";

const DashboardView = lazy(() => import("./components/DashboardView"));
const LibraryView = lazy(() => import("./components/LibraryView"));
const ExerciseDeskView = lazy(() => import("./components/ExerciseDeskView"));
const FlashcardView = lazy(() => import("./components/FlashcardView"));
const FocusModeDesk = lazy(() => import("./components/FocusModeDesk"));
const CoachIAView = lazy(() => import("./components/CoachIAView"));
const BackupSettingsView = lazy(() => import("./components/BackupSettingsView"));
const OnlineAccountView = lazy(() => import("./components/OnlineAccountView"));
const VerticalizedSyllabusView = lazy(() => import("./components/VerticalizedSyllabusView"));
const ReviewAndErrorsView = lazy(() => import("./components/ReviewAndErrorsView"));
const WeeklyCalibrationView = lazy(() => import("./components/WeeklyCalibrationView"));
const StrategicRoadmapView = lazy(() => import("./components/StrategicRoadmapView"));

const SIDEBAR_COLLAPSED_STORAGE_KEY = "concurseiroos.sidebar.desktop-collapsed";

export default function App() {
  const { hydrateStore, estatisticas } = useConcurseiroStore();
  const cloud = useCloudAccountStore();
  const initializeCloud = cloud.initialize;
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchFocusToken, setSearchFocusToken] = useState(0);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true";
  });

  useEffect(() => {
    hydrateStore();
    void initializeCloud();
  }, [hydrateStore, initializeCloud]);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(desktopSidebarCollapsed));
  }, [desktopSidebarCollapsed]);

  const navigateTo = useCallback((tab: string) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
  }, []);

  const openNavigationSearch = useCallback(() => {
    setDesktopSidebarCollapsed(false);
    setMobileSidebarOpen(true);
    setSearchFocusToken((token) => token + 1);
  }, []);



  const accessDecision = useMemo(
    () => decideAppAccess({
      initialized: cloud.initialized,
      phase: cloud.phase,
      authStatus: cloud.authStatus,
      environment: cloud.environment,
      runtimeStatus: cloud.runtimeStatus
    }),
    [cloud.authStatus, cloud.environment, cloud.initialized, cloud.phase, cloud.runtimeStatus]
  );

  const activeNavigationItem = useMemo(() => getNavigationItem(activeTab), [activeTab]);

  if (accessDecision.status === "INITIALIZING") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-950 text-sm text-zinc-500">
        Verificando acesso privado…
      </div>
    );
  }

  if (accessDecision.status === "LOGIN_REQUIRED") return <AccessGate />;
  if (accessDecision.status === "MISCONFIGURED") return <AccessGate misconfigured />;

  const renderActiveView = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView onStartSession={() => navigateTo("focus")} onAskCoach={() => navigateTo("coach")} />;
      case "library":
        return <LibraryView />;
      case "exercises":
        return <ExerciseDeskView />;
      case "flashcards":
        return <FlashcardView />;
      case "reviews":
        return <ReviewAndErrorsView />;
      case "focus":
        return <FocusModeDesk onOpenQuestions={() => navigateTo("exercises")} onAskCoach={() => navigateTo("coach")} />;
      case "weekly":
        return <WeeklyCalibrationView />;
      case "roadmap":
        return <StrategicRoadmapView />;
      case "coach":
        return (
          <CoachIAView
            onOpenSession={() => navigateTo("focus")}
            onOpenReviews={() => navigateTo("reviews")}
            onOpenQuestions={() => navigateTo("exercises")}
          />
        );
      case "backup":
        return <BackupSettingsView />;
      case "online":
        return <OnlineAccountView />;
      case "syllabus":
        return <VerticalizedSyllabusView />;
      default:
        return <DashboardView onStartSession={() => navigateTo("focus")} onAskCoach={() => navigateTo("coach")} />;
    }
  };

  return (
    <div
      className="flex h-dvh min-h-0 w-screen overflow-hidden bg-zinc-950 font-sans text-zinc-100"
      id="concurseiro-app-shell"
    >
      <Sidebar
        activeTab={activeTab}
        setActiveTab={navigateTo}
        streak={estatisticas.streakDiasEstudo || 0}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        desktopCollapsed={desktopSidebarCollapsed}
        onToggleDesktopCollapsed={() => setDesktopSidebarCollapsed((collapsed) => !collapsed)}
        searchFocusToken={searchFocusToken}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden" id="workspace-viewport">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-3 backdrop-blur lg:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-label="Abrir menu de navegação"
              aria-expanded={mobileSidebarOpen}
              onClick={() => setMobileSidebarOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:border-zinc-700 hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-[9px] font-bold tracking-[0.16em] text-zinc-600">CONCURSEIROOS</p>
              <h1 className="truncate text-sm font-semibold text-zinc-100">
                {activeNavigationItem?.label ?? "Dashboard"}
              </h1>
            </div>
          </div>

          <button
            type="button"
            aria-label="Buscar telas e funções"
            onClick={openNavigationSearch}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:text-white"
          >
            <Search className="h-4.5 w-4.5" />
          </button>
        </header>

        <div className={WORKSPACE_CONTENT_CLASS_NAME} id="workspace-content-scroll-boundary">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center bg-zinc-950 text-sm text-zinc-500">
                Carregando módulo…
              </div>
            }
          >
            {renderActiveView()}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
