# Hotfix P3.0.1 — Restauração da rolagem do conteúdo principal

Data: 13/07/2026  
Versão: 3.0.1

## Problema observado

Após a introdução da navegação responsiva no P3.0, o contêiner intermediário do workspace permaneceu com `overflow-hidden`, mas não era um contêiner flexível em coluna. As telas internas usam `flex-1 overflow-y-auto`; sem um pai flexível com altura limitada, elas cresciam além do viewport e acabavam recortadas pelo shell.

## Correção

O limite do conteúdo principal passou a usar explicitamente:

```text
flex min-h-0 flex-1 flex-col overflow-hidden
```

Isso mantém o shell fixo, deixa cada módulo ocupar a altura disponível e devolve a rolagem ao próprio módulo, sem criar rolagem dupla no documento.

Foi criado um invariante de layout centralizado em `src/layout/appShellLayout.ts` e um teste de regressão para impedir a remoção acidental das classes necessárias.

## Validação

- 243/243 testes aprovados;
- 25 arquivos de testes;
- TypeScript/lint aprovado;
- build de produção aprovado;
- `npm audit --omit=dev`: 0 vulnerabilidades;
- backend de produção iniciado;
- `/api/health`: HTTP 200;
- página principal: HTTP 200;
- nenhuma alteração em Supabase, autenticação, sincronização, Storage, SDE ou Planner.

## Arquivos alterados

- `src/App.tsx`
- `src/layout/appShellLayout.ts`
- `src/layout/tests/appShellLayout.test.ts`
- `src/components/Sidebar.tsx`
- `package.json`
- `package-lock.json`
