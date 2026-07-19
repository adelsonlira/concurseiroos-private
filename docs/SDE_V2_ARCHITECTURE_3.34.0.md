# SDE v2 — Arquitetura decisória explicável

**Versão do produto:** 3.34.0  
**Versão do motor:** 2.0

## Finalidade

O SDE v2 permanece puro, determinístico e independente da interface. Ele recebe uma fotografia imutável do estado, normaliza evidências, calcula estado de conhecimento, aplica grafo e regras duras, produz score explicável de 0 a 100, escolhe método e devolve uma prescrição executável. O SDE v1 continua disponível como fallback técnico.

## Pipeline

```text
store e módulos isolados
→ adaptador unificado de evidências
→ estado de conhecimento por subassunto
→ pesos hierárquicos
→ grafo versionado
→ regras duras
→ score normalizado
→ escolha determinística do método
→ planner/prescrição existentes
→ ledger append-only de decisões
```

## Portões de ativação

`activeSdeVersion = v2` só resulta em decisão v2 quando:

- configuração e datas são válidas;
- grafo não possui ciclo de pré-requisito obrigatório;
- score e componentes são finitos;
- existe ação não bloqueada;
- a sequência cabe no tempo disponível;
- existe material ou fonte utilizável;
- o planner e a prescrição existentes permanecem executáveis.

Em falha, o resultado do SDE v1 é preservado e o motivo do fallback é registrado. Nenhuma decisão é inventada.

## Estado de conhecimento

O motor classifica cada subassunto em `UNSEEN`, `INSUFFICIENT_EVIDENCE`, `LEARNING`, `PRACTICING`, `STABLE`, `DECAYING`, `CRITICAL` ou `INVALID`. O estado combina taxa ponderada, amostra efetiva, recência, consulta, tendência, cobertura teórica e revisão pendente. Leitura ou sessão concluída informa cobertura, nunca domínio.

## Score

Os coeficientes residem em `src/core/sde-v2/config/sde-v2-weights.json`. Somam 1, possuem limite individual de dominância e geram contribuições recomponíveis. Valores ausentes usam fallback explícito. Incidência histórica possui `decisionWeight = 0`.

## Explicabilidade

Cada decisão v2 cria `DecisionRecord` append-only com:

- regras duras avaliadas;
- componentes do score;
- IDs das evidências utilizadas;
- estado dos pré-requisitos;
- sinal histórico shadow;
- alternativas comparadas;
- comparação com o SDE v1;
- fallback e motivo, quando aplicável.

A tela **Hoje — Seu Coach** mostra a área recolhida **Como esta decisão foi tomada**, sem transformar a tela principal em relatório técnico.

## Isolamentos preservados

- Treino FGV continua `affectsSde = false` e é apenas observado no adaptador, com peso de decisão zero.
- Diagnóstico Piloto continua não elegível, salvo futura marcação explícita em contrato próprio.
- Conteúdo livre de observações do ledger não entra no score.
- SDE não altera evidências anteriores, mastery, corpus, simulados ou materiais.
