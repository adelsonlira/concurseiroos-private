# ConcurseiroOS v3.32.1 — Relatório de correção

**Versão:** 3.32.1  
**Baseline:** ConcurseiroOS v3.32.0  
**Data:** 18/07/2026  
**Escopo:** hotfix crítico do Treino FGV, sem funcionalidades adicionais.

## Resultado

Foram corrigidos os quatro defeitos reportados:

1. a correção individual passou a possuir funções serverless explícitas em `api/training-fgv/check.ts` e `api/training-fgv/finalize.ts`;
2. mensagens transitórias da tentativa foram separadas de mensagens da landing e deixaram de ser persistidas;
3. o fluxo ativo passou a usar uma única área vertical rolável, com imagens contidas no viewport;
4. o filtro inicial e o fallback de aderência passaram a usar `DIRECT` (`Direta`).

## Correção individual

A chamada permanece em mesma origem:

- URL: `/api/training-fgv/check`;
- método: `POST`;
- conteúdo: JSON;
- resposta válida no runtime serverless compilado: HTTP 200;
- `GET` permanece bloqueado com HTTP 405.

O catálogo privado continua fora do bundle web. Cada entrypoint serverless importa e valida explicitamente o catálogo privado no backend antes de encaminhar a requisição para o app Express compartilhado.

O contrato da conferência agora também envia a ordem imutável da tentativa. O servidor rejeita tentativa inválida, questão fora da tentativa, ordem duplicada/desconhecida e alternativa fora de A–E.

## Ciclo de vida dos erros

O estado transitório foi separado em:

- `attemptError`: visível somente na tentativa ativa;
- `landingError`: reservado a falhas próprias da landing.

`attemptError` é limpo em nova conferência, sucesso, troca de questão, cancelamento, finalização, navegação para landing, abertura de resultado e início de nova tentativa. Nenhuma mensagem transitória integra o snapshot persistido.

Em falha real, a alternativa selecionada é preservada, a questão continua editável e a conferência pode ser repetida.

## Rolagem

O módulo usa uma única fronteira com:

- `h-full min-h-0 overflow-y-auto overflow-x-hidden`;
- pais flexíveis com `min-height: 0` já preservados no shell;
- imagens com `max-width: 100%` e altura automática;
- enunciados e alternativas com quebra de texto;
- marcadores de teste para alternativa E e navegação inferior.

O `body` e o workspace continuam protegidos pelo shell com `overflow: hidden`; a rolagem ocorre exclusivamente no contêiner do Treino FGV, evitando barras concorrentes.

## Preservações verificadas

Os seguintes artefatos têm os mesmos SHA-256 da v3.32.0:

| Artefato | SHA-256 |
|---|---|
| Catálogo público, 664 questões | `c4b311a8bae1bbf39548efe96d393298efedc0397cb30b263d4b9fe4d643b6ab` |
| Catálogo privado, 664 questões | `edcc6318ab9f0227da5739ad451393e3763b0b56ecfa55a7b2b76bca9b889991` |
| JSONL de origem, 797 registros | `98b441df1af5338b4f799eea444e5f403f68408dcbbca98ecf90bba044e4580c` |
| Manifesto de origem | `dfa56c43c12166f48fc79efc9cf2686a71ef32b739da90c3f3db0c1aa0654edc` |
| Conjunto agregado dos 301 assets | `56bd547f47d841a464b76b4d939a38e4737028446ff211472ebb82c4f54dcccf` |

Também foram preservados `affects_sde = false`, `counts_as_official_simulation = false`, store principal, SDE, mastery, prioridades, sessões, simulados oficiais, histórico, tentativas finalizadas e Diagnóstico Piloto.

## Arquivos de implementação diretamente envolvidos

### Adicionados

- `api/training-fgv/check.ts`
- `api/training-fgv/finalize.ts`
- `scripts/smokeFgvTrainingServerless.mjs`
- `src/features/fgvTraining/defaults.ts`
- `src/features/fgvTraining/layout.ts`
- testes específicos do hotfix
- ADR-033 e sprint 3.32.1

### Modificados funcionalmente

- `src/components/FgvTrainingView.tsx`
- `src/features/fgvTraining/api.ts`
- `src/features/fgvTraining/engine.ts`
- `src/features/fgvTraining/store.ts`
- `src/features/fgvTraining/types.ts`
- `src/server/training/fgvTrainingServer.ts`
- testes de endpoint e deployment
- scripts de build no `package.json`

Não houve remoção de arquivos.

## Inventário comparativo final

Comparação da árvore-fonte empacotada com a v3.32.0, desconsiderando artefatos transitórios de build (`node_modules`, `public`, `dist` e `.git`):

- arquivos adicionados: **15**;
- arquivos modificados: **24**;
- arquivos removidos: **0**.
