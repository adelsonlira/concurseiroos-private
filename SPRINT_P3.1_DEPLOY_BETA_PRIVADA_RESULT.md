# Sprint P3.1 — Preparação da beta privada

## Implementado

- Build web separado em `public/`, compatível com o CDN da Vercel para Express.
- `server.ts` continua funcionando localmente e é capturável como servidor Node na Vercel.
- `vercel.json` com instalação reproduzível via `npm ci`.
- Node.js 24 fixado no `package.json`.
- `.env`, `public/`, `dist/`, materiais privados e dependências permanecem fora do Git.
- Guia de implantação privada incluído.

## Limites

- A implantação real depende das contas GitHub e Vercel do usuário.
- A URL final precisa ser cadastrada no Supabase Auth.
- Recursos Gemini permanecem indisponíveis até a chave ser configurada no backend.
