# Knowledge Graph e Ontologia

## Finalidade

Conectar a linguagem oficial dos editais, questões, gabaritos, materiais e evidências do candidato sem transformar semelhança textual em verdade estratégica.

## Cadeia canônica

```text
Concurso
→ Edital
→ Disciplina
→ Assunto
→ Subassunto
→ Prova/Caderno
→ Questão canônica
→ Gabarito definitivo/anulação
→ Classificação de origem
→ Equivalência com DATAPREV 2026
→ Evidência humana
→ Estatística shadow
```

## Estados e portões

- `OFFICIAL`: presente em documento oficial.
- `PROPOSED`: proposta automática para triagem.
- `HUMAN_APPROVED` ou `HUMAN_CORRECTED`: decisão de curadoria registrada.
- `INSUFFICIENT_EVIDENCE`: relação explicitamente bloqueada.
- `REJECTED`: relação descartada com justificativa.

## Implementado na versão 3.21.0

- 123 nós oficiais e 94 subassuntos da taxonomia DATAPREV;
- cobertura de materiais e questões por subassunto;
- ledger append-only de decisões de curadoria;
- backlog agrupado e priorizado;
- propostas conservadoras de classificação;
- métricas históricas descritivas apenas sobre sinais revisados;
- comparação shadow sem permissão de ativação.

## Regras invariáveis

- material pedagógico localiza conteúdo, mas não altera incidência;
- proposta automática nunca equivale a revisão humana;
- questão anulada pode informar estilo, não desempenho;
- duplicatas devem ser resolvidas antes de denominadores históricos;
- equivalência registra origem, força, confiança, racional e versão;
- estatística sem amostra suficiente mostra insuficiência, não zero;
- conexão ao SDE exige decisão arquitetural explícita e reversível.
