# ADR-014 — Contrato de segurança matemática do SDE

Data: 2026-07-16
Status: aceito

## Contexto

O SDE é determinístico e explicável, mas parâmetros heurísticos estavam dispersos e duas transições violavam as proteções do produto: incidência indisponível podia influenciar a camada constitucional por meio do prior neutro, e baixo desempenho com amostra intermediária podia bloquear teoria e questões simultaneamente.

## Decisão

- toda proveniência de peso e incidência por assunto é obrigatória;
- incidência `UNAVAILABLE` contribui zero tanto no score quanto na camada constitucional;
- cada ajuste do score é exposto no breakdown e deve ser recomponível;
- parâmetros numéricos centrais ficam em catálogo formal com classificação, justificativa e estado de validação;
- baixo desempenho sem teoria concluída abre rota de recuperação teórica;
- teoria já concluída só é reaberta com amostra forte, preservando a prática como rota de coleta de evidência;
- auditorias de score e ordenação passam a integrar a validação automatizada.

## Consequências

A decisão reduz risco de vazamento de evidência não validada, evita deadlocks cognitivos e torna a lógica auditável. Os parâmetros continuam heurísticos e não devem ser interpretados como probabilidade de aprovação ou ganho causal de pontos.
