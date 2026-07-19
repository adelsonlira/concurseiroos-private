# ADR-040 — Encerramento determinístico da validação

**Status:** Aceito  
**Data:** 2026-07-19  
**Versão:** 3.35.2

## Contexto

A suíte e o smoke serverless podiam concluir funcionalmente e ainda conservar, por uma janela não determinística, servidores HTTP, sockets keep-alive e recursos do cliente `fetch`. Em alguns checkouts Node.js 24.18.0, o resumo era impresso sem devolução do controle ao shell.

## Decisão

- o teste ESM encerra explicitamente o serviço subprocesso do esbuild com `stop()`;
- testes HTTP usam um harness que consome respostas integralmente, desativa pooling do cliente e rastreia sockets do servidor;
- teardowns impedem novas conexões, fecham conexões ociosas e ativas, destroem apenas sockets remanescentes do servidor de teste, aguardam `server.close` e removem listeners temporários;
- o smoke serverless usa `node:http` com `agent: false` e `Connection: close`, e só imprime `PASS` depois do teardown;
- um auditor de subprocessos usa watchdog apenas como gate de falha, exige saída natural, código zero, ausência de sinal e ausência de processos descendentes;
- nenhuma chamada a `process.exit(0)`, timeout aceito como sucesso ou redução de cobertura é permitida.

## Consequências

O pipeline retorna naturalmente ao shell. Falha de teardown, timeout ou processo descendente residual passa a bloquear a entrega em vez de ser mascarada.
