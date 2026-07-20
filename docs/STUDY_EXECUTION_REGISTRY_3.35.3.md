# studyExecutionRegistry — v3.35.3

## Finalidade

O registro versionado declara capacidades reais de execução. Ele não altera prioridade nem substitui a taxonomia. Seu arquivo canônico é `data/study-execution/study-execution-registry-v1.json`.

## Estados de notebook

- `NOT_CONFIGURED`: não pode ser apresentado como ambiente executável;
- `CONFIGURED_PENDING_REVIEW`: cadastro ainda não aprovado;
- `READY_THEORY_ONLY`: teoria permitida, sem alegações sobre padrão FGV;
- `READY_WITH_FGV_EVIDENCE`: teoria e uso restrito de evidências FGV aprovadas;
- `BLOCKED`: ambiente expressamente indisponível.

## Registro inicial

### Banco de Dados

- notebook: `DATAPREV 2026 — Banco de Dados — Tutor FGV`;
- status: `READY_WITH_FGV_EVIDENCE`;
- fontes institucionais e teóricas aprovadas cadastradas;
- pacote FGV v1.2.1 selecionável apenas quando a atividade exigir padrões observados, distratores ou questões oficiais do conjunto documental;
- modo `Personalizado`, resposta `Mais longa`, pesquisa web e análise de dados desativadas;
- Conversas do Gemini (1), Aula 08 — Data Mining e Aula 11 — Inteligência Artificial desmarcadas por padrão.

### Língua Portuguesa

- notebook: `DATAPREV 2026 — Língua Portuguesa — Tutor`;
- status: `READY_THEORY_ONLY`;
- `fgvEvidenceStatus = PENDING`;
- `fgvStyleTeaching = DISABLED`;
- teoria alinhada ao edital é permitida com fontes institucionais e teóricas registradas;
- padrões, estilo, incidência ou preferência da FGV não podem ser ensinados enquanto a evidência documental permanecer pendente.

### Demais disciplinas

- status inicial do NotebookLM: `NOT_CONFIGURED`;
- QConcursos e sessão guiada existem apenas quando o método e a captura de resultado forem compatíveis;
- materiais privados são resolvidos no catálogo existente e precisam passar pelo gate semântica/taxonomia.

## Materiais e resultados

O registro aponta para o catálogo versionado de materiais privados e aceita como pronto apenas `EXACT_SUBTOPIC` e `EXACT_TOPIC`. Material amplo exige validação; `UNVERIFIED` e `INCOMPATIBLE` não são apresentados como prontos. As rotas de registro de resultado também são declaradas no registro.
