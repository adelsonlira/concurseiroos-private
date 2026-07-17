# Configuração de ambiente — ConcurseiroOS 3.31.1

## O ponto mais importante

O `.env` local configura apenas a execução naquela máquina. Em Vercel ou outro host, cadastre as variáveis no painel e faça novo deploy. Cole somente o valor, sem envolver com aspas; a 3.31.1 normaliza aspas externas por compatibilidade, mas o painel deve manter o valor limpo.

## Desenvolvimento local

```powershell
Copy-Item .env.example .env
```

Configuração mínima:

```env
GEMINI_API_KEY=SUA_CHAVE_REAL
GEMINI_MODEL=gemini-3.5-flash
AUTH_MODE=optional
AUTH_ALLOW_SELF_SIGNUP=false
```

O modo local pode continuar opcional. Reinicie `npm run dev` após alterações.

## Deploy privado recomendado

```env
GEMINI_API_KEY=SUA_CHAVE_REAL
GEMINI_MODEL=gemini-3.5-flash
AUTH_MODE=required
AUTH_ALLOW_SELF_SIGNUP=false
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_ANON_KEY=SUA_CHAVE_ANON_OU_PUBLISHABLE
VITE_SUPABASE_SNAPSHOT_TABLE=user_snapshots
VITE_SUPABASE_PRIVATE_BUCKET=private-study-materials
```

Em produção, `optional` é promovido para `required` por segurança. Somente `AUTH_MODE=disabled` explícito libera acesso sem login, o que não é recomendado neste projeto.

`AUTH_ALLOW_SELF_SIGNUP=false` esconde e bloqueia o cadastro pelo aplicativo. Também desative novos cadastros nas configurações de autenticação do Supabase; o sinal de runtime não substitui a política do provedor.

## Segurança das chaves

- `GEMINI_API_KEY` fica somente no servidor.
- Nunca use prefixo `VITE_` para segredos.
- A chave anon/publishable do Supabase pode chegar ao navegador; a segurança depende de RLS.
- Nunca exponha `service_role`.

## Diagnóstico

Abra:

```text
https://SEU_DOMINIO/api/runtime-config
```

O retorno esperado é semelhante a:

```json
{
  "supabase": { "configured": true, "source": "SERVER_RUNTIME", "configurationIssue": null },
  "auth": { "mode": "required", "allowSelfSignup": false },
  "ai": { "configured": true, "model": "gemini-3.5-flash" }
}
```

A chave Gemini nunca aparece. Se o par principal do Supabase estiver inválido e o par VITE estiver válido, `source` será `VITE_COMPAT` e `configurationIssue` explicará o fallback sem derrubar o endpoint. Depois, confirme que a raiz do aplicativo mostra somente a tela de login até existir sessão autenticada e use o botão de teste do Gemini já autenticado.

## Contas

O projeto atual é privado. Crie ou convide a conta autorizada pelo painel Supabase. Não foi construído um sistema próprio de aprovação administrativa, pois isso exigiria credenciais privilegiadas e duplicaria funções do provedor de identidade.

Consulte `PRIVATE_ACCESS_GUIDE.md`.
