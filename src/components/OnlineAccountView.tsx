import { ChangeEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  CloudOff,
  DownloadCloud,
  ExternalLink,
  Eye,
  EyeOff,
  FileLock2,
  Folder,
  KeyRound,
  LoaderCircle,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserPlus
} from "lucide-react";
import { useCloudAccountStore } from "../integrations/cloud/cloudStore";
import { useConcurseiroStore } from "../store";
import { authenticatedFetch } from "../integrations/cloud/authenticatedFetch";
import { clearAllPrivatePdfAssociations } from "../integrations/localFiles/privatePdfAccess";
import { normalizeMaterialFileName } from "../integrations/cloud/privateDocumentPolicy";

function formatBytes(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Tamanho não informado";
  const units = ["B", "KB", "MB", "GB"];
  let amount = value;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  return `${amount.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatTimestamp(value: string | null): string {
  if (!value) return "Ainda não realizado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

export default function OnlineAccountView() {
  const cloud = useCloudAccountStore();
  const { configuracao, updateConfiguracao, biblioteca, disciplinas, assuntos, resetAllData } = useConcurseiroStore();
  const [email, setEmail] = useState(configuracao.estudanteEmail ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryConfirmation, setRecoveryConfirmation] = useState("");
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadSummary, setUploadSummary] = useState<string | null>(null);
  const [aiProbe, setAiProbe] = useState<{ status: "IDLE" | "RUNNING" | "OK" | "ERROR"; message: string | null }>({ status: "IDLE", message: null });
  const [secureSignOutRunning, setSecureSignOutRunning] = useState(false);

  const busy = ["INITIALIZING", "AUTHENTICATING", "SYNCING", "UPLOADING"].includes(
    cloud.phase
  );
  const recoveryPasswordsMatch =
    recoveryPassword.length >= 8 && recoveryPassword === recoveryConfirmation;
  const storageTotal = useMemo(
    () => cloud.privateDocuments.reduce((sum, item) => sum + (item.sizeBytes ?? 0), 0),
    [cloud.privateDocuments]
  );
  const vaultGroups = useMemo(() => {
    const groups = new Map<string, {
      id: string;
      label: string;
      documents: Array<{ document: (typeof cloud.privateDocuments)[number]; topicLabel: string | null }>;
    }>();

    for (const document of cloud.privateDocuments) {
      const normalizedDocumentName = normalizeMaterialFileName(document.name);
      const libraryItem = biblioteca.find((item) =>
        item.privateMaterial?.storagePath === document.storagePath ||
        normalizeMaterialFileName(item.privateMaterial?.sourceFileName ?? "") === normalizedDocumentName
      );
      const discipline = disciplinas.find((item) => item.id === libraryItem?.disciplinaId);
      const topic = assuntos.find((item) => item.id === libraryItem?.assuntoId);
      const detailedLabel = discipline?.nome === "Conhecimentos Específicos"
        ? libraryItem?.privateMaterial?.courseTitle || topic?.nome || discipline.nome
        : discipline?.nome;
      const id = detailedLabel ? `GROUP:${detailedLabel}` : "UNCLASSIFIED";
      const current = groups.get(id) ?? {
        id,
        label: detailedLabel ?? "Materiais ainda não classificados",
        documents: []
      };
      current.documents.push({ document, topicLabel: topic?.nome ?? null });
      groups.set(id, current);
    }

    return [...groups.values()]
      .map((group) => ({
        ...group,
        documents: [...group.documents].sort((left, right) =>
          left.document.name.localeCompare(right.document.name, "pt-BR")
        )
      }))
      .sort((left, right) => {
        if (left.id === "UNCLASSIFIED") return 1;
        if (right.id === "UNCLASSIFIED") return -1;
        return left.label.localeCompare(right.label, "pt-BR");
      });
  }, [assuntos, biblioteca, cloud.privateDocuments, disciplinas]);

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(Array.from(event.target.files ?? []));
    setUploadSummary(null);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    const result = await cloud.uploadPrivateDocuments(selectedFiles);
    const parts = [`${result.uploaded} enviado(s)`];
    if (result.duplicates.length) {
      const names = result.duplicates.slice(0, 3).map((item) => item.name).join(", ");
      parts.push(`${result.duplicates.length} já existente(s), sem nova cópia${names ? `: ${names}` : ""}`);
    }
    if (result.rejected.length) parts.push(`${result.rejected.length} rejeitado(s)`);
    if (result.failed.length) parts.push(`${result.failed.length} com falha`);
    setUploadSummary(parts.join(" · "));
    setSelectedFiles([]);
  };

  const handleOpen = async (storagePath: string) => {
    const url = await cloud.openPrivateDocument(storagePath);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const secureSignOut = async () => {
    if (cloud.conflict) {
      window.alert("Resolva o conflito de sincronização antes de limpar este dispositivo.");
      return;
    }
    const confirmed = window.confirm(
      "Este modo é indicado para computador público. O progresso será sincronizado, a conta será desconectada e os dados locais deste navegador serão removidos. A cópia na nuvem e os PDFs originais serão preservados. Continuar?"
    );
    if (!confirmed) return;

    setSecureSignOutRunning(true);
    try {
      const synced = await cloud.syncNow(false);
      if (!synced) return;
      await cloud.prepareForLocalReset();
      await clearAllPrivatePdfAssociations();
      resetAllData();
      window.location.reload();
    } finally {
      setSecureSignOutRunning(false);
    }
  };

  const testGemini = async () => {
    setAiProbe({ status: "RUNNING", message: null });
    try {
      const response = await authenticatedFetch("/api/ai-health", { method: "POST" });
      const payload = await response.json().catch(() => ({})) as { error?: string; model?: string; latencyMs?: number };
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      setAiProbe({
        status: "OK",
        message: `${payload.model ?? cloud.runtimeStatus.geminiModel ?? "Gemini"} respondeu em ${payload.latencyMs ?? "?"} ms.`
      });
    } catch (error) {
      setAiProbe({ status: "ERROR", message: error instanceof Error ? error.message : String(error) });
    }
  };

  if (cloud.environment.availability !== "CONFIGURED") {
    return (
      <div className="h-full overflow-y-auto bg-zinc-950 p-6 md:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-blue-400">Diagnóstico dos serviços</p>
              <h2 className="mt-2 text-2xl font-semibold text-zinc-100">Login, sincronização e IA</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                O estudo local continua funcionando. Esta tela verifica o que o servidor remoto realmente recebeu — não apenas o arquivo .env do seu computador.
              </p>
            </div>
            <button
              type="button"
              onClick={cloud.refreshRuntimeConfiguration}
              disabled={cloud.phase === "INITIALIZING"}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${cloud.phase === "INITIALIZING" ? "animate-spin" : ""}`} /> Verificar novamente
            </button>
          </header>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
              <div className="flex items-start gap-3">
                <CloudOff className="mt-0.5 h-5 w-5 text-amber-400" />
                <div>
                  <h3 className="font-semibold text-zinc-100">Supabase não detectado pelo aplicativo</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    No servidor remoto, configure <code className="text-zinc-200">SUPABASE_URL</code> e <code className="text-zinc-200">SUPABASE_ANON_KEY</code> — ou as variantes VITE — e faça um novo deploy. Um .env local não altera um deploy já publicado.
                  </p>
                  <p className="mt-3 text-xs text-zinc-500">
                    Endpoint de configuração: {cloud.runtimeStatus.runtimeEndpointReachable ? "acessível" : "não acessível"}. Fonte atual: {cloud.environment.source}.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h3 className="flex items-center gap-2 font-semibold text-zinc-100">
                <KeyRound className="h-5 w-5 text-violet-400" /> Gemini
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Configuração informada pelo servidor: {cloud.runtimeStatus.geminiConfigured === true ? "chave detectada" : cloud.runtimeStatus.geminiConfigured === false ? "chave ausente" : "não foi possível verificar"}. Modelo: {cloud.runtimeStatus.geminiModel ?? "não informado"}.
              </p>
              <button
                type="button"
                onClick={testGemini}
                disabled={aiProbe.status === "RUNNING"}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {aiProbe.status === "RUNNING" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Testar conexão real
              </button>
              {aiProbe.message && <p className={`mt-3 text-xs ${aiProbe.status === "OK" ? "text-emerald-300" : "text-red-300"}`}>{aiProbe.message}</p>}
              {cloud.runtimeStatus.authMode === "required" && (
                <p className="mt-3 text-xs text-amber-300">AUTH_MODE=required: o teste da IA exige login, que só aparecerá após o Supabase ser detectado.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h3 className="flex items-center gap-2 font-semibold text-zinc-100">
              <ShieldCheck className="h-5 w-5 text-emerald-400" /> O que continua funcionando
            </h3>
            <div className="mt-4 grid gap-3 text-sm text-zinc-400 md:grid-cols-2">
              <p>Dados e sessões permanecem disponíveis neste navegador.</p>
              <p>O SDE e a prescrição diária não dependem do Gemini.</p>
              <p>Login e sincronização aparecem assim que o servidor expõe uma configuração Supabase válida.</p>
              <p>PDFs privados não são enviados ao Gemini.</p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-zinc-950 p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-blue-400">Infraestrutura on-line</p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-100">Conta, sincronização e cofre privado</h2>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">
              Arquitetura local-first: o estudo continua funcionando sem internet e a nuvem conserva uma cópia privada para sincronização.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300">
            {cloud.authStatus === "SIGNED_IN" ? (
              <Cloud className="h-4 w-4 text-emerald-400" />
            ) : (
              <CloudOff className="h-4 w-4 text-zinc-500" />
            )}
            {cloud.authStatus === "SIGNED_IN" ? "Conta conectada" : "Modo local"}
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
            <p className="text-[10px] font-mono uppercase text-emerald-300">Supabase</p>
            <p className="mt-2 text-sm font-semibold text-zinc-100">Configurado via {cloud.environment.source === "SERVER_RUNTIME" ? "servidor" : "build"}</p>
            <p className="mt-1 text-xs text-zinc-500">Login e sincronização disponíveis.</p>
          </div>
          <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-4">
            <p className="text-[10px] font-mono uppercase text-violet-300">Gemini</p>
            <p className="mt-2 text-sm font-semibold text-zinc-100">{cloud.runtimeStatus.geminiConfigured ? "Disponível para o Coach" : "Chave não confirmada"}</p>
            <p className="mt-1 text-xs text-zinc-500">O SDE continua independente da IA.</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-[10px] font-mono uppercase text-zinc-500">Proteção da API</p>
            <p className="mt-2 text-sm font-semibold text-zinc-100">AUTH_MODE={cloud.runtimeStatus.authMode}</p>
            <p className="mt-1 text-xs text-zinc-500">Em ambiente público, use required.</p>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
          <h3 className="text-sm font-semibold text-zinc-100">O que o Supabase conserva</h3>
          <div className="mt-4 grid gap-3 text-xs leading-5 text-zinc-400 md:grid-cols-3">
            <div><strong className="block text-zinc-200">Conta</strong>E-mail, sessão e recuperação de senha pelo Supabase Auth.</div>
            <div><strong className="block text-zinc-200">Histórico do Coach</strong>Um snapshot privado com sessões, questões, revisões, configurações e metadados da biblioteca.</div>
            <div><strong className="block text-zinc-200">PDFs privados</strong>Arquivos no bucket individual. A abertura usa links temporários e o conteúdo não é enviado ao Gemini.</div>
          </div>
        </section>

        <details className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-5">
          <summary className="cursor-pointer text-sm font-semibold text-zinc-300">Diagnóstico técnico</summary>
          <p className="mt-3 text-xs leading-5 text-zinc-500">
            Use somente ao verificar uma implantação. Não é uma etapa da rotina de estudos.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={testGemini}
              disabled={aiProbe.status === "RUNNING"}
              className="inline-flex items-center gap-2 rounded-lg border border-violet-500/30 px-4 py-2 text-xs font-semibold text-violet-300 disabled:opacity-40"
            >
              {aiProbe.status === "RUNNING" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Testar resposta do Gemini
            </button>
            <span className="text-xs text-zinc-500">AUTH_MODE={cloud.runtimeStatus.authMode}</span>
          </div>
          {aiProbe.message && (
            <p className={`mt-3 text-xs ${aiProbe.status === "OK" ? "text-emerald-300" : "text-red-300"}`}>
              {aiProbe.message}
            </p>
          )}
        </details>

        {cloud.error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Operação não concluída</p>
              <p className="mt-1 break-all text-red-300/80">{cloud.error}</p>
            </div>
            <button onClick={cloud.clearNotice} className="text-xs text-red-300 hover:text-red-100">Fechar</button>
          </div>
        )}

        {cloud.notice && (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="flex-1">{cloud.notice}</p>
            <button onClick={cloud.clearNotice} className="text-xs text-emerald-300 hover:text-emerald-100">Fechar</button>
          </div>
        )}

        {cloud.passwordRecoveryActive ? (
          <section className="mx-auto max-w-2xl rounded-xl border border-blue-500/30 bg-blue-500/5 p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
              <KeyRound className="h-5 w-5 text-blue-400" /> Definir nova senha
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              O link de recuperação foi validado. Defina uma nova senha com pelo menos oito caracteres.
            </p>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-zinc-400">Nova senha</span>
                <div className="relative">
                  <input
                    type={showRecoveryPassword ? "text" : "password"}
                    value={recoveryPassword}
                    onChange={(event) => setRecoveryPassword(event.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 pr-11 text-sm text-zinc-100 outline-none focus:border-blue-500"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRecoveryPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-zinc-500 hover:text-zinc-200"
                    aria-label={showRecoveryPassword ? "Ocultar nova senha" : "Mostrar nova senha"}
                  >
                    {showRecoveryPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-zinc-400">Confirmar nova senha</span>
                <input
                  type={showRecoveryPassword ? "text" : "password"}
                  value={recoveryConfirmation}
                  onChange={(event) => setRecoveryConfirmation(event.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500"
                  autoComplete="new-password"
                />
              </label>
              {recoveryConfirmation && recoveryPassword !== recoveryConfirmation && (
                <p className="text-xs text-amber-300">As senhas ainda não conferem.</p>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  disabled={busy || !recoveryPasswordsMatch}
                  onClick={async () => {
                    const ok = await cloud.completePasswordRecovery(recoveryPassword);
                    if (ok) {
                      setRecoveryPassword("");
                      setRecoveryConfirmation("");
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Atualizar senha
                </button>
                <button
                  onClick={cloud.signOut}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300"
                >
                  Cancelar e sair
                </button>
              </div>
            </div>
          </section>
        ) : cloud.authStatus !== "SIGNED_IN" ? (
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
                <LogIn className="h-5 w-5 text-blue-400" /> Entrar na conta individual
              </h3>
              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-zinc-400">E-mail</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500"
                    autoComplete="email"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-zinc-400">Senha</span>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      onKeyDown={(event) => setCapsLockOn(event.getModifierState("CapsLock"))}
                      onKeyUp={(event) => setCapsLockOn(event.getModifierState("CapsLock"))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 pr-11 text-sm text-zinc-100 outline-none focus:border-blue-500"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-zinc-500 hover:text-zinc-200"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {capsLockOn && <span className="mt-1.5 block text-xs text-amber-300">Caps Lock está ativado.</span>}
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    disabled={busy || !email.trim() || password.length < 8}
                    onClick={async () => {
                      const ok = await cloud.signIn(email, password);
                      if (ok) {
                        updateConfiguracao({ estudanteEmail: email.trim().toLowerCase() });
                        setPassword("");
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                    Entrar
                  </button>
                  {cloud.runtimeStatus.allowSelfSignup && (
                    <button
                      disabled={busy || !email.trim() || password.length < 8}
                      onClick={() => cloud.signUp(email, password)}
                      className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <UserPlus className="h-4 w-4" /> Criar conta
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <p className="leading-5 text-zinc-500">
                    A senha deve possuir ao menos oito caracteres. O aplicativo não armazena a senha no estado local.
                    {!cloud.runtimeStatus.allowSelfSignup && " O acesso é por convite administrado no Supabase."}
                  </p>
                  <button
                    type="button"
                    disabled={busy || !email.trim()}
                    onClick={() => cloud.requestPasswordReset(email)}
                    className="font-medium text-blue-300 hover:text-blue-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h3 className="flex items-center gap-2 font-semibold text-zinc-100">
                <ShieldCheck className="h-5 w-5 text-emerald-400" /> Isolamento dos seus dados
              </h3>
              <div className="mt-4 space-y-3 text-sm leading-6 text-zinc-400">
                <p>Cada registro e arquivo é protegido por políticas associadas ao usuário autenticado.</p>
                <p>Os PDFs ficam em bucket privado. A abertura usa endereço temporário de dez minutos.</p>
                <p>Uma futura versão pública poderá ser gerada sem seus materiais privados.</p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Usuário</p>
                <p className="mt-2 truncate text-sm font-medium text-zinc-100">{cloud.user?.email ?? cloud.user?.id}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Última sincronização</p>
                <p className="mt-2 text-sm font-medium text-zinc-100">{formatTimestamp(cloud.metadata.lastSuccessfulSyncAt)}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Cofre privado</p>
                <p className="mt-2 text-sm font-medium text-zinc-100">{cloud.privateDocuments.length} PDF(s) · {formatBytes(storageTotal)}</p>
              </div>
            </section>

            {cloud.conflict && (
              <section className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-1 h-5 w-5 text-amber-400" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-zinc-100">Existem dados diferentes neste dispositivo e na nuvem</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      Este aviso aparece somente quando este dispositivo e outro dispositivo alteraram o histórico a partir da mesma base. Para evitar perda, a sincronização foi pausada até você escolher qual cópia deve prevalecer.
                    </p>
                    <p className="mt-2 text-xs text-zinc-500">
                      Nuvem atualizada em {formatTimestamp(cloud.conflict.remoteUpdatedAt)}. A opção não escolhida deve ser preservada por backup antes de ser substituída.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        onClick={cloud.resolveConflictWithCloud}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950"
                      >
                        <DownloadCloud className="h-4 w-4" /> Usar dados da nuvem neste dispositivo
                      </button>
                      <button
                        onClick={cloud.resolveConflictWithLocal}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 px-4 py-2 text-sm font-medium text-amber-200"
                      >
                        <UploadCloud className="h-4 w-4" /> Substituir a nuvem pelos dados locais
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-100">Sincronização do progresso</h3>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-400">
                    Toda alteração é salva imediatamente neste navegador. Com a sincronização automática ativa, o snapshot é enviado à nuvem após alguns segundos e um dispositivo novo recebe a cópia mais recente sem intervenção. Sessões, tentativas, agenda e configurações são sincronizadas; decisões recalculáveis do SDE não precisam ser persistidas.
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">
                    Estado atual: {configuracao.offlineSyncAtivo ? "automática ativa" : "automática pausada"} · última confirmação: {formatTimestamp(cloud.metadata.lastSuccessfulSyncAt)}.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={configuracao.offlineSyncAtivo}
                      onChange={(event) => updateConfiguracao({ offlineSyncAtivo: event.target.checked })}
                      className="h-4 w-4 accent-blue-500"
                    />
                    Sincronização automática (recomendado)
                  </label>
                  <button
                    onClick={() => cloud.syncNow(false)}
                    disabled={busy || Boolean(cloud.conflict)}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RefreshCw className={`h-4 w-4 ${cloud.phase === "SYNCING" ? "animate-spin" : ""}`} /> Verificar agora
                  </button>
                  <button
                    onClick={cloud.signOut}
                    disabled={busy || secureSignOutRunning}
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300"
                  >
                    <LogOut className="h-4 w-4" /> Sair
                  </button>
                  <button
                    onClick={() => void secureSignOut()}
                    disabled={busy || secureSignOutRunning || Boolean(cloud.conflict)}
                    title="Sincroniza, desconecta e remove os dados locais deste navegador; use em computador público."
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 px-4 py-2 text-sm text-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {secureSignOutRunning ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Sair e limpar este dispositivo
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="flex items-center gap-2 font-semibold text-zinc-100">
                    <FileLock2 className="h-5 w-5 text-violet-400" /> Cofre de materiais privados
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                    Selecione PDFs já catalogados para acesso individual. Para adicionar e indexar uma aula nova, prefira Biblioteca Inteligente; esta área funciona como administração do cofre. O upload não envia o conteúdo ao Coach nem ao Gemini.
                  </p>
                </div>
                <div className="text-xs text-zinc-500">Bucket privado · links temporários</div>
              </div>

              <div className="mt-5 rounded-lg border border-dashed border-zinc-700 bg-zinc-950/60 p-5">
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  onChange={handleFiles}
                  className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-sm file:text-zinc-200 hover:file:bg-zinc-700"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-zinc-500">{selectedFiles.length ? `${selectedFiles.length} arquivo(s) selecionado(s)` : "Somente PDFs são aceitos."}</p>
                  <button
                    onClick={handleUpload}
                    disabled={busy || selectedFiles.length === 0}
                    className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {cloud.phase === "UPLOADING" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                    Enviar ao cofre
                  </button>
                </div>
                {uploadSummary && <p className="mt-3 text-xs text-zinc-300">{uploadSummary}</p>}
              </div>

              <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
                {cloud.privateDocuments.length === 0 ? (
                  <div className="p-8 text-center text-sm text-zinc-500">Nenhum PDF armazenado na nuvem.</div>
                ) : (
                  <div className="divide-y divide-zinc-800">
                    {vaultGroups.map((group) => (
                      <details key={group.id} className="group bg-zinc-950/30">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-zinc-900/45 px-4 py-3 transition hover:bg-zinc-900/70 [&::-webkit-details-marker]:hidden">
                          <h4 className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                            <Folder className="h-4 w-4 text-violet-400" /> {group.label}
                          </h4>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-zinc-500">{group.documents.length} PDF(s)</span>
                            <span className="text-[10px] text-zinc-600 transition group-open:rotate-90">▶</span>
                          </div>
                        </summary>
                        <div className="divide-y divide-zinc-800/70">
                          {group.documents.map(({ document, topicLabel }) => (
                            <div key={document.storagePath} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-zinc-200">{document.name.replace(/^\d+-/, "")}</p>
                                <p className="mt-1 text-xs text-zinc-500">
                                  {topicLabel ? `${topicLabel} · ` : ""}{formatBytes(document.sizeBytes)} · enviado em {formatTimestamp(document.createdAt)}
                                </p>
                              </div>
                              <div className="flex shrink-0 gap-2">
                                <button
                                  onClick={() => handleOpen(document.storagePath)}
                                  className="inline-flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-blue-500 hover:text-blue-300"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" /> Abrir
                                </button>
                                <button
                                  onClick={() => cloud.removePrivateDocument(document.storagePath)}
                                  className="inline-flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:border-red-500 hover:text-red-300"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Remover
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
              {cloud.privateDocuments.length > 0 && (
                <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">
                  As disciplinas ficam recolhidas por padrão para reduzir a rolagem. Expanda somente a pasta que deseja consultar.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
