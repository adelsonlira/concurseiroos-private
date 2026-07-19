# Próximos Passos — após 3.34.0

1. Publicar a versão e confirmar SDE v2, fallback e ledger de decisões no runtime real.
2. Observar divergências v1 × v2 sem ajustar coeficientes durante a janela inicial.
3. Validar sincronização do `sdeDecisionLedger` em dois dispositivos.
4. Ampliar o grafo somente por relações documentadas e revisadas.
5. Calibrar participações internas e coeficientes apenas com série prospectiva suficiente.
6. Manter incidência histórica com peso zero até validação específica.

## Guardrails

- não remover o SDE v1;
- não promover registros antigos do ledger automaticamente;
- não usar observações livres como fato;
- não converter lotes em tentativas sintéticas;
- não permitir que IA altere a decisão determinística;
- não ativar incidência histórica no score sem nova ordem arquitetural.
