# Hotfix P3.1.2 — APIs explícitas na Vercel

## Diagnóstico

O deployment publicava somente os ativos estáticos de `public/`. A aba Resources não continha Vercel Functions e `/api/health` retornava `404 NOT_FOUND` da plataforma.

## Correção implementada

Foram adicionadas funções explícitas em `api/`, cada uma delegando ao aplicativo Express compartilhado de `server.ts`:

- `api/health.ts`
- `api/parse-edital.ts`
- `api/explain-question.ts`
- `api/coach-chat.ts`
- `api/semantic-search.ts`
- `api/organize-material.ts`

O `vercel.json` agora fixa `outputDirectory: public`, preservando o frontend Vite e permitindo que os arquivos em `api/` sejam compilados separadamente como funções Node.

## Validação local

- 247/247 testes aprovados
- TypeScript aprovado
- build web aprovado
- build server aprovado
- `npm audit --omit=dev`: 0 vulnerabilidades

## Limite da validação

A geração das funções depende da infraestrutura da Vercel e deve ser confirmada no próximo deployment pela aba Resources e por `/api/health`.
