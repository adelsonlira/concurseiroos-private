# ADR-010 — Configuração de serviços em runtime

## Contexto

Variáveis `VITE_*` são incorporadas no build. Um `.env` local não configura um deploy remoto e o frontend não conseguia detectar variáveis Supabase definidas somente no servidor.

## Decisão

O servidor expõe `/api/runtime-config` com configuração pública de Supabase, modo de autenticação e apenas o estado/modelo do Gemini. O frontend carrega esse endpoint antes de inicializar o cliente Supabase. `/api/ai-health` executa uma chamada real e nunca expõe a chave.

## Consequências

- configuração remota pode ser corrigida sem código, seguida de redeploy;
- login aparece quando o servidor detecta Supabase;
- diagnóstico distingue variável detectada de conexão realmente válida;
- deploy público deve usar `AUTH_MODE=required` para proteger a cota de IA.
