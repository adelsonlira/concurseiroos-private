# ConcurseiroOS v3.33.0 — Modelo do Ledger de Evidências Externas

## Coleção

```ts
externalEvidenceLedger: ExternalEvidenceRecord[]
```

A coleção é ordenada por inserção e tratada como append-only. Cada evento recebe ID próprio, versão de schema e timestamps.

## Contrato principal

O contrato implementado preserva os conceitos exigidos:

- identidade: `evidenceId`, `schemaVersion`, `createdAt`, `recordedAt`;
- natureza: `evidenceType`, `source`, `granularity`;
- referência externa curta: `sourceLabel`, `sourceReference`;
- vínculo operacional: `prescriptionId`, `sessionId`;
- taxonomia: `disciplineId`, `topicId`, `subtopicId`, `syllabusItemId`;
- medição: total, acertos, erros, brancos, duração, planejado e realizado;
- condições: consulta, confiança e causas de erro;
- notas opcionais: pontos difíceis e observações;
- governança: `decisionStatus`, `affectsSde`, `ledgerAction`;
- relações append-only: `supersedesEvidenceId`, `voidsEvidenceId`;
- qualidade derivada: `evidenceQuality`.

Os nomes seguem camelCase, padrão predominante do projeto.

## Tipos de evidência

- `aggregate_question_batch`: bateria agregada;
- `individual_question`: questão individual informada pelo usuário;
- `guided_retrieval`: recuperação guiada ou atividade NotebookLM;
- `external_simulation`: simulado externo.

## Fontes

- `qconcursos`;
- `treino_fgv`;
- `notebooklm`;
- `simulado_externo`;
- `outra`.

## Relações e estado derivado

O evento não armazena um campo mutável de situação. A visualização deriva:

- `active`: não foi substituído nem anulado;
- `superseded`: existe evento posterior que aponta para ele por `supersedesEvidenceId`;
- `voided`: existe evento de anulação posterior que aponta por `voidsEvidenceId`.

Eventos de anulação são preservados no ledger, mas não aparecem como baterias independentes no histórico de desempenho.

## Validações

Para qualquer registro objetivo:

```text
acertos + erros + brancos = total
total > 0
valores inteiros e não negativos
```

A disciplina, assunto e subassunto precisam pertencer à taxonomia ativa. A quantidade realizada deve coincidir com o total registrado. Duração não pode ser negativa.

## Qualidade derivada

```ts
evidenceQuality = {
  authority: "low" | "medium" | "high";
  measurementStrength: "low" | "medium" | "high";
  effectiveSampleSize: number;
}
```

O cálculo considera fonte, banca, vínculo operacional, granularidade, quantidade, presença de resultado objetivo e consulta a material. Consulta reduz a amostra efetiva. NotebookLM recebe força de medição baixa para resultados de leitura ou autoavaliação.

A qualidade não contém mastery, domínio, prioridade ou prognóstico e não é consumida pelo SDE atual.

## Resumo descritivo

O resumo agrupa eventos ativos por disciplina e assunto e apresenta:

- número de baterias;
- questões, acertos, erros e brancos;
- percentual bruto;
- duração total;
- última evidência;
- contagem com e sem consulta.

Eventos anulados são ignorados. Em uma cadeia de correção, somente a versão ativa substituta é contabilizada.
