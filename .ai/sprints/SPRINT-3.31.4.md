# Sprint 3.31.4 — Correção de navegação do diagnóstico piloto

**Data:** 2026-07-18  
**Linha de base:** 3.31.3  
**Tipo:** hotfix funcional restrito

## Defeito confirmado

Ao hidratar o módulo, o store selecionava automaticamente `finalizedAttempts.at(-1)`. Como a tela tratava qualquer seleção finalizada como prioridade sobre a landing page, o menu `Diagnóstico piloto` reabria a última tentativa. Clicar novamente no mesmo item lateral também não limpava essa seleção, pois o estado principal permanecia no mesmo tab.

## Correção implementada

- Removida a seleção persistente/transversal de resultado finalizado do store do diagnóstico.
- Introduzidos estados de navegação explícitos: `landing`, `active_attempt` e `finalized_result`.
- Adotadas rotas por fragmento, compatíveis com o shell atual e com F5 em deploy estático:
  - `#/diagnostico`;
  - `#/diagnostico/tentativa`;
  - `#/diagnostico/resultado/:attemptId`.
- O item lateral sempre envia para `landing`, inclusive quando já está dentro do diagnóstico.
- A landing page mostra `Retomar diagnóstico` quando existe tentativa ativa e mantém o histórico visível.
- Resultados são abertos somente pelo `attemptId` escolhido ou imediatamente após finalização.
- Cancelamento substitui a rota ativa pela landing sem criar resultado.
- F5 preserva a tentativa ativa ou o resultado específico por meio da rota e da persistência isolada já existente.

## Guardrails preservados

- Nenhuma alteração nas 24 questões, gabarito, assets, cálculo, histórico ou chaves de armazenamento.
- Nenhuma alteração no store principal, SDE, mastery, prioridades, sessões ou simulados oficiais.
- `affectsSde: false` permanece obrigatório.
- Nenhum Treino FGV, explicação por IA ou funcionalidade adicional foi implementado.

## Validação esperada

- Suite completa anterior sem regressão.
- Testes novos de navegação, retomada, cancelamento, resultado específico, F5 e imutabilidade.
- TypeScript, builds web/Express/serverless, auditorias e smoke HTTP.
