# Causa-raiz — encerramento não determinístico

## Sintoma

A suíte alcançava o resumo completo, mas o processo pai permanecia ativo. O smoke serverless também imprimia `PASS` antes de haver garantia de que servidor, clientes HTTP e sockets estivessem encerrados.

## Causas identificadas

### 1. Serviço filho do esbuild

O teste `src/deployment/tests/serverlessEsmResolution.test.ts` utilizava a API JavaScript do esbuild sem executar `stop()` no teardown. A inspeção do grupo de processos após a saída do comando mostrou um processo `[esbuild] <defunct>` no mesmo grupo:

- imediatamente após a saída: processo ainda presente;
- após 250 ms: ainda presente;
- após aproximadamente 1 segundo: finalmente recolhido pelo ambiente.

Isso tornava o encerramento dependente de timing e impedia uma garantia determinística do grupo de processos.

### 2. Recursos HTTP transitórios

Testes e smoke utilizavam servidores locais e `fetch`. Após a impressão do resultado, ainda podiam existir `TCPServerWrap`, `TCPSocketWrap`, conexões keep-alive, callbacks imediatos e listeners temporários em processo de liberação.

### 3. `server.close()` sem domínio completo dos sockets

Aguardar apenas `server.close()` não garante encerramento imediato quando existem conexões ociosas ou persistentes. O relatório de sucesso era emitido sem um gate explícito para `server.listening === false` e zero sockets ativos.

## Correção

- `await stop()` no `afterEach` do teste que usa esbuild.
- Cliente HTTP nativo sem agente persistente.
- `Connection: close` em cliente e servidor de smoke.
- rastreamento de sockets no evento `connection`;
- consumo integral de respostas;
- `server.close()`, `closeIdleConnections()`, `closeAllConnections()` e destruição restrita aos sockets remanescentes do servidor de teste;
- espera pelo callback de fechamento e remoção dos listeners temporários;
- sucesso impresso somente depois de `server.listening === false` e zero sockets ativos.

## Resultado

`npm run test:run`, `npm run validate`, `npm run training:smoke-serverless` e `npm run build` retornaram naturalmente ao shell, todos com código zero e nenhum processo filho remanescente.
