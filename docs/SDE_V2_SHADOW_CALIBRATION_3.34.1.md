# SDE v2 em Shadow Mode — ConcurseiroOS v3.34.1

## Contrato de ativação

A prescrição efetiva permanece produzida pelo SDE v1:

```text
activeSdeVersion = v1
```

O SDE v2 usa a mesma fotografia objetiva de dados, executa em paralelo e não modifica a orientação:

```text
executionMode = shadow
affectsPrescription = false
```

O motor v2 não foi duplicado nem recalibrado. Adaptador de evidências, pesos, grafo, regras duras, score, seleção de método e incidência histórica com peso zero permanecem os mesmos da versão 3.34.0.

## Sequência determinística

1. Executar o SDE v1 e produzir a decisão efetiva.
2. Executar o SDE v2 sobre a mesma fotografia.
3. Comparar disciplina, assunto, subassunto, método, duração, critério de avanço, pré-requisito e score.
4. Entregar somente ações, planner e prescrição do SDE v1.
5. Registrar a comparação no `sdeCalibrationLedger` append-only.
6. Registrar a decisão técnica do SDE v2 no `sdeDecisionLedger`, sem efeito prescritivo.

## Ledger de calibração

Cada registro contém:

- identificador determinístico de calibração;
- data de referência e fingerprint dos inputs objetivos;
- snapshots compactos das decisões v1 e v2;
- fatores principais;
- divergências tipadas;
- fallback e motivo;
- IDs das evidências objetivas consideradas;
- incidência histórica shadow;
- campo reservado para resultado futuro da sessão.

O fingerprint não inclui observações livres, conteúdo de questões, respostas textuais privadas ou outros dados desnecessários. A repetição da mesma decisão, na mesma data e sem mudança dos inputs, não cria novo evento.

## Interface

A tela principal continua mostrando uma única prescrição: a do SDE v1. Na área recolhida de auditoria aparece:

> SDE v2 em calibração — não altera a orientação atual

A comparação técnica fica em uma subseção secundária e recolhida. Ela não oferece ação concorrente nem altera sessão, roadmap, mastery, revisões ou prioridades.

## Promoção futura

Não há promoção automática. Uma decisão arquitetural futura deverá analisar, no mínimo:

- número de decisões comparadas;
- número e tipo de divergências;
- divergências de assunto e método;
- fallbacks e decisões inválidas;
- tratamento de pré-requisitos;
- disponibilidade de material;
- possibilidade de associar resultado real da sessão.
