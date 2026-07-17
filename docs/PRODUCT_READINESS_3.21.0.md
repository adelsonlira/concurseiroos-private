# Prontidão do produto — 3.21.0

A avaliação automática fica em `data/quality/product-readiness-report.json` e também é exposta em `/api/readiness` sem credenciais ou conteúdo privado.

## Interpretação

- `READY_FOR_LOCAL_DAILY_USE`: nenhum bloqueio necessário para o modo local determinístico.
- `READY_WITH_LIMITATIONS`: uso local possível, mas existem validações externas ou warnings.
- `NOT_READY`: ao menos um requisito obrigatório para uso diário falhou.

Node.js 24, Supabase autenticado e Gemini real devem ser testados no ambiente de produção. A ausência desses serviços não autoriza inventar resultados nem alterar o SDE.
