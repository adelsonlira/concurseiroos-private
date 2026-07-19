# ConcurseiroOS 3.35.2 — Relatório de implementação

## Escopo

Correção estritamente técnica do encerramento da suíte Vitest, dos testes HTTP, do build serverless e do smoke `training:smoke-serverless`. Nenhum comportamento funcional do produto foi alterado.

## Baseline e identidade

- Baseline: `ConcurseiroOS v3.35.1`.
- Versão produzida: `3.35.2`.
- Commit validado: `230765c65619f4c521b09714ba551191c6240290`.
- Ambiente limpo: Node.js `v24.18.0`, npm `10.9.2`.

## Alterações técnicas

1. Criação de um harness HTTP gerenciado para os testes, com consumo integral das respostas e teardown explícito de servidor, sockets e listeners.
2. Substituição do `fetch` global no smoke serverless por `node:http.request`, com `agent: false` e `Connection: close`.
3. Encerramento explícito do serviço da API JavaScript do esbuild através de `await stop()`.
4. Auditor de subprocessos com gates de falha e verificação de saída natural, sinal, código de saída e grupo de processos remanescente.
5. Auditoria específica para `npm run test:run` e `npm run training:smoke-serverless`.
6. Manutenção de `exec` na etapa final do pipeline apenas para retirar o shell intermediário, sem utilizá-lo como substituto do teardown.

## Proibição de mascaramento atendida

Não foram usados `process.exit(0)`, `process.exitCode = 0` para mascarar recursos, `kill` como encerramento normal do produto, `|| true`, timeout tratado como sucesso, redução de testes ou supressão de falhas. O watchdog somente falha e encerra o grupo quando o limite é excedido.

## Mudanças frente à v3.35.1

- Arquivos adicionados: **8**.
- Arquivos modificados: **20**.
- Arquivos removidos: **0**.
- Arquivos de produto/corpus protegidos alterados: **0**.
