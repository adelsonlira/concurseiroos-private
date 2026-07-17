import type {
  CloudAuthStatus,
  CloudEnvironmentConfig,
  CloudSyncPhase,
  RuntimeServiceStatus
} from "./types";

export type AppAccessDecision =
  | { status: "INITIALIZING"; reason: string }
  | { status: "ALLOW"; reason: string }
  | { status: "LOGIN_REQUIRED"; reason: string }
  | { status: "MISCONFIGURED"; reason: string };

export function decideAppAccess(input: {
  initialized: boolean;
  phase: CloudSyncPhase;
  authStatus: CloudAuthStatus;
  environment: CloudEnvironmentConfig;
  runtimeStatus: RuntimeServiceStatus;
}): AppAccessDecision {
  if (!input.initialized || input.phase === "INITIALIZING" || input.authStatus === "UNKNOWN") {
    return {
      status: "INITIALIZING",
      reason: "A configuração de acesso e a sessão ainda estão sendo verificadas."
    };
  }

  const authMode = input.runtimeStatus.authMode;
  const shouldFailClosed = authMode === "required" || (
    authMode === "unknown" && input.environment.availability === "CONFIGURED"
  );

  if (!shouldFailClosed) {
    return {
      status: "ALLOW",
      reason: "O ambiente permite uso local sem autenticação obrigatória."
    };
  }

  if (input.environment.availability !== "CONFIGURED") {
    return {
      status: "MISCONFIGURED",
      reason: "O servidor exige autenticação, mas o Supabase não está configurado."
    };
  }

  if (input.authStatus === "SIGNED_IN") {
    return {
      status: "ALLOW",
      reason: "Sessão autenticada confirmada."
    };
  }

  return {
    status: "LOGIN_REQUIRED",
    reason: "Este ambiente privado exige uma sessão autenticada antes de abrir o aplicativo."
  };
}
