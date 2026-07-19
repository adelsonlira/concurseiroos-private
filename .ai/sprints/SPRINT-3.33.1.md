# Sprint 3.33.1 — Correção de integridade do corpus no Git e CI

**Data:** 2026-07-18  
**Linha de base:** 3.33.0  
**Tipo:** hotfix de empacotamento e integração contínua; sem alteração funcional

## Objetivo

Preservar no Git e em checkouts limpos os bytes CRLF canônicos dos quatro CSVs aprovados do banco operacional do Treino FGV e eliminar a segunda execução redundante da validação no GitHub Actions.

## Escopo entregue

- `.gitattributes` com regras específicas para CSV, JSONL, JSON, Markdown, XLSX e assets do pacote operacional do Treino FGV.
- Quatro CSVs copiados novamente do pacote operacional aprovado após ativação de `-text`.
- Auditor reproduzível de tamanho, SHA-256, CRLF e blob Git.
- Regressões para atributos, bytes brutos, manifesto e estrutura do workflow.
- Workflow com uma única execução de `npm run validate` e builds separados.
- Validação em clone limpo com Node.js 24 e configuração de checkout propensa a conversão de texto.

## Guardrails preservados

- Nenhuma alteração no Ledger de Evidências Externas, Treino FGV, Diagnóstico Piloto ou SDE.
- Manifesto operacional e validação de bytes brutos mantidos.
- 797 registros, 664 questões elegíveis, 301 assets e catálogos derivados preservados.
- Nenhuma regra global de finais de linha.
