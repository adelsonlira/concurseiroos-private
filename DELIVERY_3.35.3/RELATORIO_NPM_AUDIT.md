# Relatório npm audit

Status: `AUDIT_EXPLICIT_INCONCLUSIVE_EXTERNAL_502`.

Tentativa 1:
- `npm audit`: HTTP 502;
- `npm audit --omit=dev`: HTTP 502.

Tentativa 2, após 10 segundos:
- `npm audit`: HTTP 502;
- `npm audit --omit=dev`: HTTP 502.

Tentativa 3, após 30 segundos:
- `npm audit`: HTTP 502;
- `npm audit --omit=dev`: requisição iniciada, sem resposta útil antes da indisponibilidade externa encerrar a execução.

O audit explícito não foi marcado como aprovado. O `npm ci` da validação anterior havia reportado zero vulnerabilidades.
