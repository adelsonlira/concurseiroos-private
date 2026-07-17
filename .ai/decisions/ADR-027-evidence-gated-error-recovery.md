# ADR-027 — Recuperação de erros condicionada a evidência

Status: aceito  
Data: 2026-07-17

## Contexto

O sistema registrava causa e nota do erro, criava revisão e contava acertos posteriores. Porém, ainda era possível declarar recuperação sem registrar o que foi corrigido, e um novo erro não possuía uma trilha explícita de reabertura.

## Decisão

Cada subassunto com erro passa a possuir um caso append-only de recuperação. A causa continua sendo declarada pelo estudante e nunca inferida. Antes de validar recuperação, o usuário registra:

- o que foi corrigido;
- a regra operacional para evitar repetição;
- uma nova tentativa sem consulta.

Um acerto só conta como verificação independente quando não houve consulta e a confiança declarada é média ou alta. Duas verificações independentes estabilizam provisoriamente o caso; um erro posterior o reabre. Esse número reutiliza a política já existente de dois acertos posteriores e não significa domínio permanente.

## Consequências

- Revisões oriundas de erro não podem ser encerradas como recuperadas antes da correção explícita.
- Baterias agregadas contam como um episódio, não como várias confirmações artificiais.
- Snapshots anteriores são migrados conservadoramente: erros legados abrem casos pendentes, mas acertos antigos não são promovidos a recuperação.
- O contrato não altera score, peso, elegibilidade ou incidência do SDE.
- O Coach recebe apenas estado e contagem de verificações; textos privados de correção não são enviados automaticamente.
