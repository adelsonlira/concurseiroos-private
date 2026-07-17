import { resolveRuntimeEnvironment } from "../src/server/runtimeEnvironment";

function json(payload: unknown, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function sanitizeError(error: unknown, secret: string | null): string {
  const message = error instanceof Error ? error.message : String(error);
  return secret ? message.split(secret).join("[REDACTED]") : message;
}

async function authorize(request: Request, runtime: ReturnType<typeof resolveRuntimeEnvironment>): Promise<Response | null> {
  if (runtime.auth.mode === "disabled") return null;
  if (!runtime.supabase.configured || !runtime.supabase.url || !runtime.supabase.anonKey) {
    return runtime.auth.mode === "required"
      ? json({ error: "Autenticação on-line não configurada no servidor.", code: "AUTH_NOT_CONFIGURED" }, 503)
      : null;
  }

  const match = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return runtime.auth.mode === "required"
      ? json({ error: "Sessão autenticada obrigatória.", code: "AUTH_REQUIRED" }, 401)
      : null;
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const verifier = createClient(runtime.supabase.url, runtime.supabase.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const { data, error } = await verifier.auth.getUser(match[1]);
    if (error || !data.user) {
      return json({ error: "Sessão inválida ou expirada.", code: "AUTH_INVALID" }, 401);
    }
    return null;
  } catch (error) {
    console.error("[AI Health Auth Error]", error);
    return json({ error: "Não foi possível validar a sessão.", code: "AUTH_VERIFICATION_FAILED" }, 401);
  }
}

export default {
  async fetch(request: Request) {
    const runtime = resolveRuntimeEnvironment();
    const authFailure = await authorize(request, runtime);
    if (authFailure) return authFailure;

    if (!runtime.ai.apiKey) {
      return json({
        error: "Gemini não configurado no servidor.",
        code: "GEMINI_NOT_CONFIGURED",
        model: runtime.ai.model,
      }, 503);
    }

    const startedAt = Date.now();
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey: runtime.ai.apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "concurseiroos-server",
          },
        },
      });
      const response = await ai.models.generateContent({
        model: runtime.ai.model,
        contents: "Responda somente com a palavra OK.",
        config: { temperature: 0 },
      });
      return json({
        status: "ok",
        model: runtime.ai.model,
        latencyMs: Date.now() - startedAt,
        responseReceived: Boolean(response.text?.trim()),
      });
    } catch (error) {
      const providerStatus = Number((error as { status?: number; statusCode?: number } | null)?.status ?? (error as { statusCode?: number } | null)?.statusCode);
      const status = providerStatus === 429 ? 429 : 502;
      console.error("[AI Health Error]", error);
      return json({
        error: "Falha ao validar a conexão com o Gemini.",
        code: "GEMINI_PROBE_FAILED",
        model: runtime.ai.model,
        details: sanitizeError(error, runtime.ai.apiKey),
      }, status);
    }
  },
};
