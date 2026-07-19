# Encerramento natural do Vitest

## Execução principal auditada

- Comando: `npm run test:run`.
- Duração: **28.665 s**.
- Código de saída: `0`.
- Sinal: `None`.
- Saída natural: `true`.
- Processos filhos remanescentes: `0`.
- Saída posterior ao resumo: `[]`.
- Resultado: **96/96 arquivos e 716/716 testes**.

## Diagnóstico com reporter de handles

- Comando: `vitest run --maxWorkers=2 --reporter=hanging-process`.
- Duração: **27.675 s**.
- Código: `0`.
- Sinal: `None`.
- Processo/grupo remanescente: `false`.
- Timeout: `false`.

O reporter não identificou handle pendente após as correções e o processo retornou naturalmente ao shell.
