# Evidências estratégicas — DATAPREV 2026 — Perfil 3

## Status

**CORPUS BRUTO EXTRAÍDO, NÃO VALIDADO PARA PRIORIZAÇÃO.**

Este diretório separa evidência sobre a banca/edital da evidência de desempenho do candidato.
Nada aqui altera automaticamente o SDE enquanto não cumprir a política de ativação definida em
`src/core/evidence/`.

## Fontes recebidas

- Edital oficial DATAPREV 001/2026.
- Seis exportações de questões FGV, de 2021 a 2026.
- Um estudo secundário de incidência.
- Uma síntese produzida no NotebookLM.
- Três vídeos de professores/especialistas indicados pelo usuário.

## Extração objetiva do corpus

A execução de `scripts/build_fgv_question_corpus.py` encontrou:

- 3.352 blocos de questões;
- 3.348 identificadores externos únicos;
- quatro identificadores repetidos no conjunto completo;
- 1.503 registros com ao menos um tópico candidato por regra lexical;
- 438 registros com ao menos um alerta de possível conteúdo fora do escopo;
- 1.849 registros sem tópico candidato automático.

Esses números descrevem a extração e a triagem automática. Eles **não representam incidência
validada**.

## Arquivos derivados

- `source-manifest.json`: hashes e contagens objetivas por arquivo.
- `question-corpus-summary.json`: resumo da extração e limitações.
- `question-corpus-draft.ndjson`: metadados por questão, sem enunciado e sem alternativas.
- `build-output.json`: saída da execução que gerou o resumo.

## Regras de segurança científica

Uma incidência só pode alimentar o SDE quando:

1. a questão foi deduplicada;
2. os critérios de inclusão e exclusão são reproduzíveis;
3. a classificação no edital foi revisada manualmente;
4. o tamanho mínimo de revisão por tópico foi atingido;
5. todas as fontes usadas estão marcadas como `VALIDATED` e autorizadas para
   `SDE_HISTORICAL_INCIDENCE`.

O estudo secundário, a síntese do NotebookLM e os vídeos podem sugerir hipóteses, mas não podem
fornecer pesos ou frequências ao motor.

## Direitos autorais e minimização de dados

Os arquivos derivados não armazenam enunciados nem alternativas. O aplicativo deve registrar
somente metadados, classificação, resultado do candidato e referência à fonte externa, salvo se
houver licença explícita para armazenar o conteúdo integral.
