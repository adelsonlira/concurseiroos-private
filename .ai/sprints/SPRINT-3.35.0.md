# Sprint 3.35.0 — Disponibilidade Real e Estudo Opcional Inteligente

**Data:** 2026-07-19  
**Linha de base:** 3.34.1

## Escopo entregue

- disponibilidade canônica alterada de 180 para 120 minutos, segunda a sábado;
- domingo preservado como descanso e total normal semanal de 720 minutos;
- migração conservadora e idempotente somente do perfil legado exato;
- backup 2.5.0 com aviso explícito de migração;
- `optionalStudyLedger` append-only, persistido, restaurado e sincronizado;
- recomendação opcional em descanso ou após conclusão do plano obrigatório;
- escolha de duração, alternativas e seleção manual validada;
- sessão opcional com início, pausa, retomada, conclusão e interrupção sem penalidade;
- registro de tempo real e evidência objetiva sem tentativa sintética;
- SDE v1 efetivo e SDE v2 exclusivamente shadow.

## Guardrails

- ignorar, ocultar ou manter descanso não altera aderência, mastery, streak ou plano;
- duração acima de 120 é permitida apenas com aviso não bloqueante;
- atividade opcional não altera a disponibilidade padrão nem a carga prevista;
- materiais inexistentes não são inventados;
- corpus, Treino FGV, Diagnóstico Piloto, pesos, grafo e score permanecem preservados.
