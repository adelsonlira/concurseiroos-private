# Inventário de handles e recursos abertos

| Origem | Recurso observado ou potencial | Causa | Teardown aplicado |
|---|---|---|---|
| `serverlessEsmResolution.test.ts` | subprocesso/serviço `esbuild` | API JavaScript do esbuild não era finalizada explicitamente | `await stop()` em `afterEach` |
| testes de endpoints FGV | servidor HTTP, sockets, listeners | servidor e clientes locais sem harness comum | `startManagedHttpTestServer`, rastreamento de sockets e `close()` verificável |
| testes do Diagnóstico Piloto | servidor HTTP, sockets, listeners | teardown dependente do fechamento implícito do cliente | mesmo harness HTTP gerenciado |
| testes de runtime configuration | servidor HTTP, sockets, listeners | uso de cliente com ciclo de conexão não explicitamente controlado | `node:http.request`, `agent: false`, `Connection: close` |
| smoke serverless | `TCPServerWrap` | servidor local criado pelo script | `server.close()` aguardado antes do relatório |
| smoke serverless | `TCPSocketWrap`/keep-alive | `fetch`/Undici e conexão persistente | cliente nativo sem agente, cabeçalho `Connection: close` e consumo integral |
| smoke serverless | sockets aceitos | `server.close()` isolado pode aguardar conexões | `closeIdleConnections`, `closeAllConnections` e destruição de remanescentes rastreados |
| smoke e testes | listeners temporários | listeners de `connection`, `error` e `listening` | remoção após encerramento |
| auditor de saída | timers de watchdog | limite operacional necessário | timer cancelado na saída; timeout é falha, nunca sucesso |

## Evidência diagnóstica

A execução instrumentada anterior à correção registrou o processo `esbuild` residual no grupo do runner por cerca de um segundo após a saída do filho. O arquivo `validation-logs/baseline-esbuild-process-group-debug.txt` preserva essa observação.
