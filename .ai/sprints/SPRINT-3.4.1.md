# Sprint 3.4.1 — Compatibilidade arquitetural com Windows

Data: 2026-07-15

## Objetivo

Eliminar o falso positivo do teste `competitionIsolation.test.ts` quando a suíte é executada no Windows.

## Causa raiz

A regra filtrava diretórios usando barras `/` sobre caminhos absolutos. No Windows, `node:path` retorna `\`, então arquivos de teste não eram excluídos e apareciam como consumidores de produção do pacote DATAPREV.

## Entregas

- normalização de caminhos para formato portátil com `/`;
- análise baseada em caminho relativo ao diretório `src`;
- exclusão explícita e multiplataforma de diretórios de testes;
- teste de regressão com caminho Windows;
- atualização da memória institucional e versão patch.

## Validação

- 274 testes em 34 arquivos;
- TypeScript aprovado;
- builds web, Express e serverless aprovados.

## Impacto

Correção exclusiva de infraestrutura de testes. Não altera comportamento do produto nem decisões do SDE.
