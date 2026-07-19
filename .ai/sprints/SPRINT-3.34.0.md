# Sprint 3.34.0 — SDE v2 e Coach Decisório Explicável

**Data:** 2026-07-19  
**Linha de base:** 3.33.1

## Escopo entregue

- SDE v2 puro e determinístico com fallback para v1.
- Adaptador de tentativas, lotes, simulados, sessões, revisões e módulos isolados.
- Estados de conhecimento e amostra efetiva.
- Pesos hierárquicos sem repetição do peso disciplinar.
- Grafo DATAPREV com 26 nós e 20 relações aprovadas.
- Regras duras, score 0–100 e coeficientes versionados.
- Escolha de método, plano completo, critério de avanço e plano reduzido.
- Sinal histórico calculado em shadow mode, peso zero.
- Ledger append-only de decisões e comparação v1 × v2.
- Área recolhida de auditoria no Hoje — Seu Coach.
- Integração do ledger objetivo sem tentativas sintéticas.

## Guardrails

- SDE v1 preservado.
- Nenhum dado legado reescrito.
- Treino FGV e Diagnóstico Piloto permanecem isolados.
- Observações livres não entram no score.
- Nenhuma IA decide ou gera relações.
- Corpus e 301 assets não foram alterados ou reimportados.
