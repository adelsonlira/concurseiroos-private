# Sprint 3.32.0 — Treino FGV Essencial

**Data:** 2026-07-18  
**Linha de base:** 3.31.4  
**Tipo:** incremento funcional isolado

## Objetivo

Disponibilizar rapidamente um treino manual e estável de questões FGV de Banco de Dados, usando exclusivamente o banco operacional `CUR-BD-BANCO-OPERACIONAL-FGV-DATAPREV-v2`.

## Escopo entregue

- Fonte preservada: 797 registros, manifesto, arquivos operacionais e 301 assets.
- Catálogo derivado reproduzível: 664 questões elegíveis.
- Catálogo público sanitizado e respostas privadas no backend.
- Filtros por área, item primário, aderência e quantidade.
- Seleção aleatória com seed e ordem imutável.
- Conferência explícita por questão e bloqueio posterior.
- Persistência isolada, F5, cancelamento e finalização com brancos.
- Resultado por `selection_area`, item primário e aderência.
- Histórico básico imutável.
- Rotas independentes de landing, tentativa e resultado.

## Guardrails preservados

- `training_type = thematic_fgv`.
- `affects_sde = false`.
- `counts_as_official_simulation = false`.
- Nenhuma alteração no SDE, mastery, prioridades, roadmap, sessões, simulados oficiais ou diagnóstico piloto.
- Nenhuma nova curadoria, OCR, classificação, recuperação ou busca externa.
- Nenhuma frequência histórica usada na seleção.

## Fora do escopo

- Explicações por IA.
- Filtro de não vistas.
- Filtro de erradas anteriormente.
- Estatísticas acumuladas complexas.
- Recomendações automáticas.
- Simulados configuráveis e novos diagnósticos.
