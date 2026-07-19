# Encerramento determinístico da validação — v3.35.2

## Causa

Foram identificadas duas classes de recursos. O teste de resolução ESM iniciava o serviço subprocesso do esbuild por meio da API JavaScript e não chamava `stop()`, deixando um processo `esbuild` transitório após o worker. Além disso, testes HTTP e o smoke usavam `fetch` contra servidores locais e aguardavam apenas `server.close()`, sem controlar explicitamente o pool keep-alive do cliente, sockets aceitos, conexões ociosas/ativas ou listeners temporários. Em determinados agendamentos do Node.js 24, esses recursos impediam a devolução imediata do controle ao shell.

## Correção

### Serviço do esbuild

`serverlessEsmResolution.test.ts` chama `await stop()` no teardown. O subprocesso deixa de sobreviver ao worker do Vitest e não aparece como zombie órfão depois da suíte.

### Testes HTTP

`src/server/testing/httpTestHarness.ts`:

1. usa `node:http.request` com `agent: false` e `Connection: close`;
2. consome a resposta até `end`;
3. rastreia todo socket recebido no evento `connection`;
4. chama `server.close()` para impedir novas conexões;
5. chama `closeIdleConnections()` e `closeAllConnections()` quando disponíveis;
6. destrói somente sockets remanescentes do servidor de teste;
7. aguarda o callback real de `server.close`;
8. remove o listener temporário e rejeita teardown incompleto.

### Smoke serverless

O smoke adota o mesmo ciclo, não usa o dispatcher global de `fetch` e só publica `status: PASS` após a confirmação de servidor não escutando e zero sockets ativos.

### Auditoria de subprocessos

`scripts/auditNaturalTermination.mjs` executa `npm run test:run` e `npm run training:smoke-serverless` como subprocessos isolados. Timeout, sinal, código diferente de zero ou processo descendente remanescente são falhas. Os limites não encerram uma execução aprovada; servem somente como watchdog de falha.
