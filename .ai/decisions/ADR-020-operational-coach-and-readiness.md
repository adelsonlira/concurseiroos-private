# ADR-020 — Coach operacional único e prontidão explícita

Status: aceito em 2026-07-16

## Contexto

O estudante não deve escolher entre recomendações concorrentes nem interpretar diagnósticos técnicos antes de estudar.

## Decisão

A interface recebe um único comando operacional do núcleo: iniciar, retomar, recuperar interrupção, usar fallback ou aguardar prescrição. A prontidão do produto é avaliada separadamente, distinguindo bloqueios de uso diário de limitações externas. Falhas de Supabase ou Gemini não bloqueiam o modo local determinístico quando a prescrição e a persistência local estão disponíveis.

## Consequências

- reduz escolhas operacionais;
- mantém limitações visíveis;
- permite fallback seguro;
- proíbe mensagens de garantia de aprovação.
