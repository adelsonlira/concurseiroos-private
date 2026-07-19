# Comparativo SDE v1 × SDE v2

## Preservação

O SDE v1 não foi removido nem reescrito. Seus testes de segurança, planner, prescrição e desempate continuam executados com `activeSdeVersion = v1`. O v2 usa o mesmo planner e a mesma infraestrutura de prescrição depois de escolher ação e método.

## Diferenças principais

| Dimensão | SDE v1 | SDE v2 |
|---|---|---|
| Evidência agregada externa | não consumida | consumida como lote único validado |
| Pesos internos | priorizador legado | peso disciplinar distribuído hierarquicamente |
| Pré-requisitos | sem grafo ativo | grafo versionado com bloqueio/recomendação/transferência |
| Método | ação cognitiva genérica | regra explícita escolhe diagnóstico, teoria, prática, revisão ou recuperação |
| Score | contrato constitucional legado | 0–100, componentes configurados e explicáveis |
| Histórico FGV | indisponível no ranking | calculado e registrado em shadow, peso zero |
| Log | decisão efêmera | ledger append-only de decisões v2 |
| Fallback | não aplicável | retorna ao v1 com motivo registrado |

## Amostra automática de validação

O auditor `sde:v2-audit` compara os dois motores na mesma fotografia. Na amostra da entrega:

- relações do grafo: 20;
- evidências objetivas elegíveis: 1;
- fallbacks observados: 1 cenário sem disponibilidade;
- incidência histórica: calculada com peso decisório zero;
- principal fonte de divergência: distribuição hierárquica de peso, qualidade/amostra da evidência, grafo e escolha explícita do método.

A divergência não é tratada como erro por si só. Ela é registrada e auditável.
