# Encerramento natural do smoke serverless

- Comando: `npm run training:smoke-serverless`.
- Execução direta do pipeline: **0.878 s**.
- Execução interna do auditor: **0.910 s**.
- Código de saída: `0`.
- Sinal: `None`.
- Saída natural: `true`.
- Processos filhos remanescentes: `0`.
- HTTP da conferência: `200`.
- HTTP da finalização: `200`.
- `server.listening` após teardown: `false`.
- sockets ativos após teardown: `0`.

O script não possui `process.exit(0)` nem converte watchdog em sucesso. O JSON `PASS` é emitido somente após o teardown.
