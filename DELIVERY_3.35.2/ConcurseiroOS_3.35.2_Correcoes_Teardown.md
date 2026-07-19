# Correções de teardown

## Harness de testes HTTP

O arquivo `src/server/testing/httpTestHarness.ts` centraliza:

- abertura em porta efêmera local;
- cliente `node:http.request` com `agent: false`;
- `Connection: close`;
- leitura completa do corpo;
- rastreamento dos sockets aceitos;
- fechamento de conexões ociosas e ativas;
- espera pelo callback de `server.close`;
- remoção de listeners;
- falha caso algum socket continue ativo.

## Smoke serverless

O script `scripts/smokeFgvTrainingServerless.mjs` foi refeito para que o relatório `PASS` seja impresso somente após:

1. conferência real por POST com HTTP 200;
2. finalização real por POST com HTTP 200;
3. consumo integral de todas as respostas;
4. fechamento do servidor;
5. fechamento das conexões ociosas e ativas;
6. zero sockets ativos;
7. remoção do listener temporário.

## esbuild

O teste serverless chama `await stop()` no teardown, eliminando o serviço filho residual da API JavaScript.

## Auditor de saída

`scripts/lib/processExitAudit.mjs` verifica código, sinal, timeout, padrões de saída e sobrevivência do grupo de processos. A janela de quiescência observa a coleta natural; se o grupo não desaparecer, a auditoria falha. O encerramento coercitivo só é usado após a falha para limpar o ambiente, nunca para declarar sucesso.
