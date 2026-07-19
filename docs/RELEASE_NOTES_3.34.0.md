# Release notes — ConcurseiroOS v3.34.0

## SDE v2 e Coach Decisório Explicável

A versão 3.34.0 ativa o SDE v2 quando os portões de segurança são satisfeitos e mantém o SDE v1 como fallback técnico.

Principais capacidades:

- adaptador unificado de evidências sem tentativas sintéticas;
- consumo determinístico de novos eventos objetivos válidos do ledger externo;
- estado de conhecimento por subassunto;
- pesos hierárquicos sem replicar o peso integral da disciplina;
- grafo versionado de pré-requisitos e transferências;
- regras duras antes da pontuação;
- score normalizado e recomponível de 0 a 100;
- incidência histórica calculada em shadow mode com peso zero;
- seleção explícita de método, sequência, critério de avanço e plano reduzido;
- comparação automática v1 × v2;
- ledger append-only de decisões;
- área recolhida `Como esta decisão foi tomada`;
- grounding determinístico para `Perguntar ao Coach`.

## Preservações

O SDE v1, o Ledger de Evidências Externas, Treino FGV, Diagnóstico Piloto, simulados, materiais, autenticação, backup, sincronização e dados existentes foram preservados. Não foi criado plano ou Coach paralelo.
