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
  const { configuracao, updateConfiguracao } = useConcurseiroStore();
  const [email, setEmail] = useState(configuracao.estudanteEmail ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryConfirmation, setRecoveryConfirmation] = useState("");
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadSummary, setUploadSummary] = useState<string | null>(null);

  const busy = ["INITIALIZING", "AUTHENTICATING", "SYNCING", "UPLOADING"].includes(
    cloud.phase
  );
  const recoveryPasswordsMatch =
    recoveryPassword.length >= 8 && recoveryPassword === recoveryConfirmation;
  const storageTotal = useMemo(
    () => cloud.privateDocuments.reduce((sum, item) => sum + (item.sizeBytes ?? 0), 0),
    [cloud.privateDocuments]
  );

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(Array.from(event.target.files ?? []));
    setUploadSummary(null);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    const result = await cloud.uploadPrivateDocuments(selectedFiles);
    const parts = [`${result.uploaded} enviado(s)`];
    if (result.rejected.length) parts.push(`${result.rejected.length} rejeitado(s)`);
    if (result.failed.length) parts.push(`${result.failed.length} com falha`);
    setUploadSummary(parts.join(" · "));
    setSelectedFiles([]);
  };

  const handleOpen = async (storagePath: string) => {
    const url = await cloud.openPrivateDocument(storagePath);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  if (cloud.environment.availability !== "CONFIGURED") {
    return (
      <div className="h-full overflow-y-auto bg-zinc-950 p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <header>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-blue-400">Infraestrutura on-line</p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-100">Conta, sincronização e cofre privado</h2>
          </header>

          <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
            <div className="flex items-start gap-3">
              <CloudOff className="mt-0.5 h-5 w-5 text-amber-400" />
              <div>
                <h3 className="font-semibold text-zinc-100">Supabase ainda não configurado</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  O aplicativo continua funcionando integralmente no modo local. Para ativar login,
                  sincronização entre dispositivos e PDFs privados on-line, configure as variáveis
                  <code className="mx-1 rounded bg-zinc-900 px-1.5 py-0.5 text-xs text-zinc-300">VITE_SUPABASE_URL</code>
                  e
                  <code className="mx-1 rounded bg-zinc-900 px-1.5 py-0.5 text-xs text-zinc-300">VITE_SUPABASE_ANON_KEY</code>.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h3 className="flex items-center gap-2 font-semibold text-zinc-100">
              <ShieldCheck className="h-5 w-5 text-emerald-400" /> Proteções já ativas
            </h3>
            <div className="mt-4 grid gap-3 text-sm text-zinc-400 md:grid-cols-2">
              <p>Dados locais continuam disponíveis sem internet.</p>
              <p>PDFs privados nunca entram no pacote público do aplicativo.</p>
              <p>O Coach recebe apenas localizadores pedagógicos, não os PDFs.</p>
              <p>A nuvem usa bucket privado e políticas por usuário.</p>
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
                  <button
                    disabled={busy || !email.trim() || password.length < 8}
                    onClick={() => cloud.signUp(email, password)}
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <UserPlus className="h-4 w-4" /> Criar conta
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <p className="leading-5 text-zinc-500">A senha deve possuir ao menos oito caracteres. O aplicativo não armazena a senha no estado local.</p>
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
                      Para evitar perda de histórico, a sincronização automática foi interrompida. Escolha qual cópia deve prevalecer.
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
                  <p className="mt-1 text-sm text-zinc-400">Sessões, tentativas, agenda e configurações são sincronizadas. Saídas recalculáveis do SDE não são persistidas.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={configuracao.offlineSyncAtivo}
                      onChange={(event) => updateConfiguracao({ offlineSyncAtivo: event.target.checked })}
                      className="h-4 w-4 accent-blue-500"
                    />
                    Sincronização automática
                  </label>
                  <button
                    onClick={() => cloud.syncNow(false)}
                    disabled={busy || Boolean(cloud.conflict)}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RefreshCw className={`h-4 w-4 ${cloud.phase === "SYNCING" ? "animate-spin" : ""}`} /> Sincronizar agora
                  </button>
                  <button
                    onClick={cloud.signOut}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300"
                  >
                    <LogOut className="h-4 w-4" /> Sair
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
                    Selecione PDFs da sua assinatura para acesso individual. O upload não envia o conteúdo ao Coach nem à Gemini; somente o armazenamento privado recebe o arquivo.
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
                    {cloud.privateDocuments.map((document) => (
                      <div key={document.storagePath} className="flex flex-col gap-3 bg-zinc-950/40 p-4 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-200">{document.name.replace(/^\d+-/, "")}</p>
                          <p className="mt-1 text-xs text-zinc-500">{formatBytes(document.sizeBytes)} · enviado em {formatTimestamp(document.createdAt)}</p>
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
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
