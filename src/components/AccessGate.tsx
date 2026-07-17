import { useState } from "react";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,

  LogIn,
  Mail,
  UserPlus
} from "lucide-react";
import { useCloudAccountStore } from "../integrations/cloud/cloudStore";
import BrandMark from "./BrandMark";

export default function AccessGate(props: { misconfigured?: boolean }) {
  const cloud = useCloudAccountStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const busy = cloud.phase === "AUTHENTICATING" || cloud.phase === "INITIALIZING";

  if (props.misconfigured) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-950 p-6 text-zinc-100">
        <section className="w-full max-w-lg rounded-2xl border border-amber-500/30 bg-amber-500/5 p-7">
          <AlertTriangle className="h-8 w-8 text-amber-300" />
          <h1 className="mt-4 text-xl font-semibold">Acesso privado indisponível</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Este ambiente exige login, mas o serviço de autenticação não foi configurado corretamente. Nenhum dado de estudo foi aberto.
          </p>
          <p className="mt-4 text-xs leading-5 text-zinc-500">
            Configure SUPABASE_URL e SUPABASE_ANON_KEY no servidor e publique novamente.
          </p>
        </section>
      </div>
    );
  }

  const submit = async () => {
    if (recoveryMode) {
      await cloud.requestPasswordReset(email);
      return;
    }
    await cloud.signIn(email, password);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-950 p-5 text-zinc-100">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <BrandMark className="mx-auto h-28 w-28 drop-shadow-[0_18px_32px_rgba(30,64,175,0.28)]" />
          <p className="mt-4 text-[10px] font-mono uppercase tracking-[0.22em] text-blue-400">ConcurseiroOS</p>
          <h1 className="mt-2 text-2xl font-semibold">Área privada de estudos</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Entre para abrir seu plano, histórico, materiais privados e recomendações do Coach.
          </p>
        </div>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-6 shadow-2xl shadow-black/30">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-400">E-mail</span>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </label>

          {!recoveryMode && (
            <label className="mt-4 block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">Senha</span>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && email.trim() && password.length >= 8) void submit();
                  }}
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2.5 pl-10 pr-11 text-sm outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-zinc-600 hover:text-zinc-300"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
          )}

          {cloud.error && (
            <div className="mt-4 rounded-lg border border-red-500/25 bg-red-500/5 p-3 text-xs leading-5 text-red-200">
              {cloud.error}
            </div>
          )}
          {cloud.notice && (
            <div className="mt-4 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs leading-5 text-emerald-200">
              {cloud.notice}
            </div>
          )}

          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || !email.trim() || (!recoveryMode && password.length < 8)}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : recoveryMode ? <Mail className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {recoveryMode ? "Enviar recuperação" : "Entrar"}
          </button>

          {!recoveryMode && cloud.runtimeStatus.allowSelfSignup && (
            <button
              type="button"
              onClick={() => void cloud.signUp(email, password)}
              disabled={busy || !email.trim() || password.length < 8}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:border-zinc-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <UserPlus className="h-4 w-4" />
              Criar conta
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setRecoveryMode((value) => !value);
              cloud.clearNotice();
            }}
            className="mt-3 w-full text-center text-xs text-zinc-500 transition hover:text-zinc-300"
          >
            {recoveryMode ? "Voltar para o login" : "Esqueci minha senha"}
          </button>

          {cloud.runtimeStatus.allowSelfSignup ? (
            <p className="mt-5 border-t border-zinc-800 pt-4 text-center text-xs text-zinc-500">
              O cadastro público está habilitado pelo administrador neste ambiente.
            </p>
          ) : (
            <p className="mt-5 border-t border-zinc-800 pt-4 text-center text-xs leading-5 text-zinc-500">
              Acesso por convite. Novas contas são liberadas pelo administrador.
            </p>
          )}
        </section>
        <p className="mt-5 text-center text-[10px] text-zinc-700">© 2026 ConcurseiroOS. Todos os direitos reservados.</p>
      </div>
    </div>
  );
}
