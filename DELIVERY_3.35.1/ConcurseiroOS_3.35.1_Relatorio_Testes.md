# ConcurseiroOS v3.35.1 — Relatório de testes

## Ambiente limpo

- commit: `a6d91f248c6913d85e400357ab56e60d7da28779`;
- checkout inicial: limpo;
- Node.js: 24.18.0;
- npm: 10.9.2;
- instalação: 292 pacotes, 0 vulnerabilidades;
- corpus: worktree e blobs Git canônicos aprovados.

## Resultado global

- arquivos de teste: **94/94**;
- testes: **710/710**;
- falhas: **0**;
- duração da regressão final: **24,22 s**;
- comparação com a v3.35.0: **37 testes líquidos adicionais** (673 → 710).

## Rastreabilidade dos requisitos

| Requisitos | Cobertura | Fonte principal | Resultado |
|---|---|---|---|
| 1–4 | Shadow real/fallback/isolamento | `optionalStudyIntegrity351.test.ts` | PASS |
| 5–10 | Erros, revisões, materiais, pré-requisitos e sinais reais | `optionalStudyIntegrity351.test.ts` | PASS |
| 11 | Avisos canônicos da escolha manual | `optionalStudyIntegrity351.test.ts` | PASS |
| 12–16 | Origem e banca, incluindo ausência de banca | `optionalStudyIntegrity351.test.ts + optionalStudyStoreIntegrity351.test.ts` | PASS |
| 17 | Um lote agregado gera uma única evidência | `optionalStudyStoreIntegrity351.test.ts` | PASS |
| 18–20 | Teoria, tempo e autopercepção não promovem mastery | `optionalStudyStoreIntegrity351.test.ts + optionalStudyStoreIntegration.test.ts` | PASS |
| 21–26 | Classificação canônica do histórico e organização não cognitiva | `optionalStudyStoreIntegrity351.test.ts` | PASS |
| 27–32 | Interrupção: tempo, histórico, terminalidade e ausência de penalidade | `optionalStudyStoreIntegrity351.test.ts` | PASS |
| 33–37 | Formulários, reload, backup, restauração e sincronização | `optionalStudyStoreIntegration.test.ts + backup/cloud suites` | PASS |
| 38–43 | Ledger, v1/v2 shadow, 120 minutos e migração | `optionalStudy suites + availability/backup suites` | PASS |
| 44 | Regressão completa | `94 arquivos / 710 testes` | PASS |
| 45 | TypeScript | `npm run validate / tsc --noEmit` | PASS |
| 46 | Builds | `web, Express e serverless` | PASS |
| 47 | Smoke | `HTTP compilado e serverless funcional` | PASS |
| 48 | CSVs canônicos | `training:audit-git com worktree e blobs PASS` | PASS |
| 49 | Dependências | `npm audit e npm audit --omit=dev` | PASS |

## Observação do runner

O pipeline de validação transfere o processo final diretamente ao Vitest por `exec`, evitando retenção do processo pai no ambiente de execução. A cobertura não foi reduzida: a regressão continua sendo executada exatamente uma vez pelo comando `npm run validate`.

## Resultado

`PASS — 710 testes aprovados, TypeScript e auditorias incluídos.`
