# Sprint P0.1-C - Planner seguro e determinístico

## Status

IMPLEMENTADO e verificado por testes automatizados.

## Correções realizadas

- A ordem estratégica global é preservada entre tipos de atividade diferentes.
- Ratios de estratégia passaram a ser metas operacionais flexíveis e não podem ocultar a ação de prioridade 1.
- Simulados não são criados pelo planner; somente ações de simulado já validadas podem ser agendadas.
- Simulados incompatíveis com a estratégia são adiados com motivo estruturado.
- O plano contendo somente simulado não é convertido em descanso.
- As pausas são reservadas dentro da janela diária total e inseridas somente entre sessões.
- A carga cognitiva considera simultaneamente tipo e duração da sessão.
- Pausas não utilizadas não são anexadas ao fim do plano.
- Minutos que não podem ser usados com segurança são expostos como tempo não alocado.
- O planner não cria atividades de fallback.
- A banca e o ritmo por questão são recebidos explicitamente pelo contexto.
- A banca não é mais inferida por parsing da justificativa XAI.
- As funções de alocação, salvaguarda, construção e otimização não modificam as entradas.
- IDs e resultados permanecem determinísticos para entradas idênticas.
- Entradas inválidas retornam resultado estruturado INVALID_INPUT.

## Disponibilidade de estudo

O planner recebe `tempoDisponivelMinutos` a cada execução. Assim, a duração diária pode variar sem alteração no núcleo.

A preferência inicial do usuário (180 minutos por dia, 6 dias por semana) deverá ser configurada na futura integração com o Zustand/UI, e não codificada no motor.

## Arquivos alterados

- src/core/sde/planner/plannerTypes.ts
- src/core/sde/planner/strategyTemplates.ts
- src/core/sde/planner/timeAllocator.ts
- src/core/sde/planner/reviewAllocator.ts
- src/core/sde/planner/blockBuilder.ts
- src/core/sde/planner/sessionOptimizer.ts
- src/core/sde/planner/studyPlanner.ts
- src/core/sde/planner/plannerEngine.ts

## Arquivo criado

- src/core/sde/tests/planner.test.ts

## Testes

- Testes anteriores: 88
- Testes adicionados: 23
- Total: 111

Resultado:

- `npm run test:run`: 111/111 aprovados
- `npm run lint`: aprovado
- `npm run build`: aprovado

O build mantém um aviso não bloqueador sobre o tamanho do bundle JavaScript.

## Limitações explícitas

- O planner atual produz uma janela diária; a montagem de calendário semanal será feita na integração.
- Os ratios das estratégias são políticas operacionais iniciais e ainda não foram calibrados empiricamente.
- A duração das ações deve ser fornecida pelo SDE. Duração inválida não é inventada.
- A elegibilidade global de simulados deve ser produzida por configuração e regras anteriores ao planner.
- Tempo não alocável é reportado em vez de preenchido artificialmente.
