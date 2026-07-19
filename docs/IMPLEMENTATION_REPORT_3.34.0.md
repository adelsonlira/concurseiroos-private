# Relatório de implementação — ConcurseiroOS v3.34.0

## Entrega

Foi implementado o SDE v2 e o Coach Decisório Explicável sobre a baseline v3.33.1. O SDE v1 permanece como fallback técnico.

## Componentes adicionados

- adaptador unificado de evidências;
- estados de conhecimento;
- pesos hierárquicos;
- grafo versionado;
- regras duras e score configurável;
- seleção determinística de método;
- sinal histórico shadow;
- ledger append-only de decisões;
- comparação v1 × v2;
- auditor `sde:v2-audit`;
- auditoria recolhida na tela Hoje — Seu Coach;
- grounding determinístico para Perguntar ao Coach.

## Alterações no Ledger de Evidências Externas

Novos registros objetivos, íntegros e não anulados recebem `decisionStatus = eligible_for_future_sde` e `affectsSde = true`. Registros antigos não são migrados nem regravados. NotebookLM, recuperação guiada sem medição, eventos anulados/substituídos e dados inválidos permanecem fora do cálculo.

Salvar, corrigir ou anular uma evidência invalida somente a decisão efêmera atual. O próximo cálculo usa a cadeia ativa sem alterar eventos anteriores.

## Persistência

`externalEvidenceLedger` permanece append-only. Foi adicionado `sdeDecisionLedger`, também append-only, ao store, backup, restauração e sincronização existentes. O formato de backup passa para 2.3.0 por migração aditiva.

## Preservações

Não houve alteração no corpus FGV, assets, catálogos, respostas operacionais, Treino FGV, Diagnóstico Piloto, simulados, autenticação ou infraestrutura de nuvem.

## Validação e inventário final

- 584 testes aprovados em 87 arquivos;
- 54 testes líquidos adicionados frente à v3.33.1;
- TypeScript e builds web, Express e serverless aprovados;
- smoke HTTP e serverless aprovados;
- 20 relações no grafo, sem ciclo obrigatório;
- 31 arquivos adicionados, 35 modificados e nenhum removido;
- corpus operacional, catálogos e 301 assets preservados por SHA-256;
- `npm audit` com zero vulnerabilidades.

## Limitações remanescentes

- o grafo ativa somente 20 relações explicitamente aprovadas;
- distribuições internas não validadas usam prior neutro explícito;
- incidência histórica continua com peso decisório zero;
- a auditoria contém uma evidência elegível de fixture, não dados reais do usuário;
- calibração de coeficientes depende de observação prospectiva;
- a sincronização do ledger de decisões reutiliza a reconciliação integral existente;
- o chunk web `study-engine` mantém aviso não bloqueante de tamanho.
