# SDE v2 — Adaptador unificado de evidências

## Contrato

`normalizeUnifiedEvidence` transforma fontes heterogêneas em `NormalizedEvidence`, sem criar tentativas sintéticas. Cada registro conserva seu identificador e granularidade.

## Fontes

- tentativas individuais legadas;
- eventos ativos do `externalEvidenceLedger`;
- questões identificadas de simulados concluídos;
- sessões concluídas, cobertura teórica e revisões vencidas;
- Treino FGV isolado;
- Diagnóstico Piloto isolado.

## Elegibilidade

Eventos do ledger entram no cálculo somente quando:

- estão ativos na cadeia append-only;
- `decisionStatus = eligible_for_future_sde`;
- `affectsSde = true`;
- total é positivo;
- acertos + erros + brancos = total;
- a fonte não é autoavaliação NotebookLM;
- o tipo não é recuperação guiada sem resultado objetivo.

Anulados, substituídos, inválidos e eventos shadow permanecem rastreáveis, mas têm amostra efetiva zero.

## Pesos

A amostra efetiva é:

```text
quantidade objetiva
× autoridade da fonte
× força de medição/consulta
× recência
```

A consulta reduz força de medição. Ela não apaga o valor pedagógico da atividade. Confiança percebida e notas livres não são tratadas como acerto objetivo.

## Privacidade

O adaptador usa somente campos estruturados necessários à decisão. `notes`, `difficultPoints`, conteúdo integral de questões, credenciais e dados externos sensíveis não são enviados ao motor.

## Compatibilidade

Registros criados na v3.33.0 permanecem shadow e não são regravados. Novos eventos objetivos validados podem receber elegibilidade. A migração é aditiva e preserva IDs.
