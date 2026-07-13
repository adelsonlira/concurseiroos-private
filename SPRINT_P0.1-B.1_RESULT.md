# ConcurseiroOS — Sprint P0.1-B.1

## Status

Sprint concluído localmente e validado por execução real.

## Correções realizadas

- Restaurada a compilação TypeScript do contrato `VetoResult`.
- `referenceDate` permanece explícita nas funções temporais; nenhuma função do núcleo usa o relógio do sistema.
- Retorno marginal permanece em `INSUFFICIENT_DATA`; `learningLeverageScore` não é exposto como pontos por hora.
- Removidas as fórmulas fictícias de custo individual e os thresholds econômicos arbitrários.
- Duração estimada passou a ser entrada externa opcional, sem duração fixa inventada por tipo de atividade.
- Custo comparativo só é calculado entre ações da mesma camada constitucional e com duração conhecida e comparável.
- Políticas de custo de oportunidade e alavancagem são obrigatórias e validadas.
- Simulados locais deixaram de ser gerados/elegíveis pelo motor de assunto.
- Teoria por baixo desempenho exige amostra superior a 40 questões.
- XAI de custo de oportunidade passou a usar apenas resultados estruturados reais.
- Lista fixa de vetos foi substituída pelos `checksPerformed` executados.
- Ordenação deixou de utilizar um custo individual fictício como desempate.

## Arquivos modificados

- `src/core/sde/config/sdeConfig.ts`
- `src/core/sde/prioritization/types.ts`
- `src/core/sde/prioritization/constraints.ts`
- `src/core/sde/prioritization/opportunityCost.ts`
- `src/core/sde/prioritization/priorityScore.ts`
- `src/core/sde/prioritization/priorityEngine.ts`
- `src/core/sde/prioritization/recommendation.ts`
- `src/core/sde/validation/validator.ts`
- `src/core/sde/tests/sde.test.ts`

## Arquivo criado

- `src/core/sde/tests/sde.b11.test.ts`

## Validações executadas

- `npm run lint`: aprovado.
- `npm run test:run`: 88/88 testes aprovados.
- `npm run build`: aprovado.

O build mantém um aviso não bloqueador de bundle JavaScript superior a 500 kB.

## Varredura de padrões proibidos

Nenhuma ocorrência em produção de:

- fórmula fixa de 12 horas de domínio;
- threshold oculto de 40%;
- thresholds fictícios de pontos;
- `custoOportunidadeDetox`;
- textos sobre “proficiência confortável”, “peso irrisório” ou “congelar evolução”;
- lista fixa de vetos;
- `new Date()` sem argumento;
- `Date.now()`;
- política opcional com fallback interno;
- simulado sempre elegível;
- alavancagem usada como pontos líquidos por hora.

## Limitações preservadas honestamente

- O sistema ainda não calcula retorno marginal real em pontos por hora porque não possui episódios causais de aprendizagem antes/depois.
- Sem duração estimada externa, o custo de oportunidade operacional retorna `INSUFFICIENT_DATA`.
- O campo legado `tempoEstimadoMinutos` permanece como `0` quando a duração externa não é fornecida; `estimatedDurationMinutes` é o campo canônico e permanece `null`.
- A política global de simulados será tratada no sprint do planner.
- O planner ainda não foi alterado nesta etapa.
