# Sprint 3.32.1 — Correções críticas do Treino FGV

**Data:** 2026-07-18  
**Linha de base:** 3.32.0  
**Tipo:** hotfix funcional e de produção

## Objetivo

Restaurar a correção individual no runtime serverless da Vercel, impedir vazamento de erros transitórios para outras telas, garantir rolagem integral de questões extensas e iniciar o filtro de aderência em `Direta`.

## Escopo entregue

- Entry points explícitos `api/training-fgv/check.ts` e `api/training-fgv/finalize.ts`.
- Inclusão estática e validação do catálogo privado no bundle serverless.
- Validação de tentativa, ordem, pertencimento da questão e alternativa no endpoint de conferência.
- Mensagens específicas por status HTTP, preservando a alternativa para nova tentativa.
- Separação entre `attemptError` e `landingError`; erros transitórios não são persistidos.
- Limpeza de erros em nova conferência, sucesso, troca de questão, cancelamento, finalização, landing e resultado.
- Contêiner vertical único com `min-height: 0`, `overflow-y: auto` e imagens contidas.
- Aderência padrão e fallback definidos como `DIRECT`.
- Smoke real dos entry points serverless compilados com tentativa mínima de cinco questões.

## Guardrails preservados

- 664 questões elegíveis e 301 assets sem alteração.
- Catálogos público e privado sem alteração de conteúdo ou respostas.
- Histórico e tentativas finalizadas permanecem imutáveis.
- `training_type = thematic_fgv`.
- `affects_sde = false`.
- `counts_as_official_simulation = false`.
- SDE, mastery, prioridades, sessões, simulados, Diagnóstico Piloto e store principal sem alteração.

## Fora do escopo

- Filtros históricos.
- Recomendações.
- Explicações por IA.
- Simulados configuráveis.
- Novas questões, curadoria ou assets.
