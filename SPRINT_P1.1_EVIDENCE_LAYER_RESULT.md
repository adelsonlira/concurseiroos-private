# ConcurseiroOS — Sprint P1.1 — Camada de Evidências Estratégicas

## Status

IMPLEMENTADO e validado tecnicamente.

A matriz empírica FGV continua **não ativada**, por decisão de segurança científica.

## Objetivo

Receber e catalogar materiais externos relevantes sem permitir que:

- uma síntese de IA seja tratada como fonte independente;
- um estudo secundário não reproduzível altere pesos;
- vídeos de especialistas sejam convertidos em incidência;
- um corpus heterogêneo de questões contamine a estratégia do Perfil 3;
- o prior neutro seja apresentado como frequência histórica.

## Fontes registradas

- edital oficial DATAPREV 001/2026;
- seis PDFs de questões FGV, de 2021 a 2026;
- estudo secundário de incidência;
- síntese NotebookLM enviada pelo usuário;
- três vídeos de especialistas.

## Auditoria objetiva do corpus

O script reproduzível encontrou:

- 3.352 blocos de questões;
- 3.348 IDs externos únicos;
- quatro IDs repetidos no corpus completo;
- 1.503 registros com ao menos um tópico candidato automático;
- 438 registros com alertas automáticos de possível conteúdo fora do escopo;
- 1.849 registros sem classificação automática.

A classificação é lexical e permanece `AUTO_CLASSIFIED_UNREVIEWED`. Nenhuma dessas contagens foi
usada como incidência.

## Implementação

### Novo núcleo

- `src/core/evidence/types.ts`
- `src/core/evidence/evidencePolicy.ts`
- `src/core/evidence/tests/evidencePolicy.test.ts`

### Registro DATAPREV

- `src/config/concursos/dataprev-2026-perfil-3/strategicEvidence.ts`

### Pipeline reproduzível

- `scripts/build_fgv_question_corpus.py`
- `data/evidence/dataprev-2026-perfil-3/source-manifest.json`
- `data/evidence/dataprev-2026-perfil-3/question-corpus-summary.json`
- `data/evidence/dataprev-2026-perfil-3/question-corpus-draft.ndjson`
- `data/evidence/dataprev-2026-perfil-3/README.md`

### Integrações seguras

- `CompetitionConfigurationPackage` passou a carregar `strategicEvidence`.
- O pacote oficial calcula a incidência por meio da política de evidências.
- Sem evidência validada, todos os tópicos permanecem com `historicalIncidenceSource = UNAVAILABLE`.
- O prior 0,5 continua apenas como valor de estabilidade, mas gera score de incidência igual a zero.
- O veto de inutilidade não usa incidência indisponível.
- Os três vídeos foram catalogados na biblioteca como `pendente-transcricao`.

## Estudo de terceiros

As estimativas foram registradas como `UNVERIFIED_EXTERNAL_ESTIMATE`.

Não foram ativadas porque o documento não fornece:

- lista auditável das provas e questões;
- IDs por classificação;
- critérios reproduzíveis de inclusão e exclusão;
- regra de deduplicação;
- revisão manual por tópico;
- análise de incerteza.

## NotebookLM

A saída foi registrada como `AI_SYNTHESIS` e serve somente para descobrir hipóteses. Ela não pode:

- fornecer fatos oficiais;
- alterar incidência;
- alterar prioridade;
- ser citada pelo Coach como evidência empírica.

## Vídeos

Os vídeos estão registrados como `EXPERT_VIDEO / PENDING_TRANSCRIPT`.

Eles podem ser consultados pelo usuário, mas nenhuma recomendação do vídeo será incorporada ao
motor até que uma afirmação seja transcrita, vinculada ao minuto e comparada com edital/questões.

## Testes

- testes anteriores: 145;
- novos testes de evidência: 13;
- novos testes de integração da configuração: 3;
- total final: 161.

Resultados:

- `npm run test:run`: 161/161 aprovados;
- `npm run lint`: aprovado;
- `npm run build`: aprovado.

O build mantém aviso não bloqueador de bundle JavaScript superior a 500 kB.

## Próxima etapa

Curadoria por ondas:

1. questões DATAPREV 2024 e cargos de desenvolvimento;
2. banco de dados e SQL;
3. segurança de aplicações e OWASP;
4. engenharia de software, requisitos e métricas;
5. Java/Spring e arquitetura;
6. BI, governança, frontend, DevOps e demais tópicos.

Somente tópicos que alcançarem revisão mínima, deduplicação e critérios reproduzíveis poderão
alimentar `SDE_HISTORICAL_INCIDENCE`.
