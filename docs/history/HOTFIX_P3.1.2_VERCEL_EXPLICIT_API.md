# Hotfix P3.1.2 — Funções explícitas da Vercel

## Problema confirmado

O frontend compilado em `public` era publicado corretamente, mas o `server.ts` da raiz não era convertido em Vercel Function no projeto configurado como `Other` com Output Directory explícito. O deployment continha somente ativos estáticos e `/api/health` retornava 404 da plataforma.

## Correção

Foram criados entrypoints explícitos no diretório `api/`, mecanismo suportado diretamente pelo runtime Node.js da Vercel:

- `api/health.ts`
- `api/parse-edital.ts`
- `api/explain-question.ts`
- `api/coach-chat.ts`
- `api/semantic-search.ts`
- `api/organize-material.ts`

Cada entrypoint delega ao mesmo aplicativo Express exportado por `server.ts`. Não há duplicação da lógica de negócio e os caminhos públicos permanecem inalterados.

## Configuração esperada na Vercel

- Framework Preset: `Other`
- Build Command: `npm run vercel-build`
- Output Directory: `public`
- Install Command: `npm ci`
- Root Directory: `./`

## Resultado esperado

A aba Resources deve mostrar seis funções Node sob `/api/*`, além dos ativos estáticos. `/api/health` deve responder JSON com `status: ok`.
