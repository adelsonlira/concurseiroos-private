# Sprint 3.35.1 — Integridade do Estudo Opcional e Shadow Real

## Objetivo

Corrigir a proveniência do shadow opcional e a integridade probatória e contábil dos resultados, sem ampliar o produto.

## Escopo concluído

- adaptador real para execução SDE v2 opcional;
- fallback explícito quando não houver saída válida;
- erros estabilizados e revisões fora da janela removidos das recomendações;
- vínculo temático de material com confiança explícita;
- pré-requisito avaliado sem permitir que o shadow altere o v1;
- origem e banca sem FGV fixo;
- formulários e resultados estruturados por método;
- remoção da conclusão automática por teoria opcional;
- histórico tipado e interrupção contabilizada sem dupla contagem;
- regressões de disponibilidade, backup, SDE, Treino FGV, Diagnóstico e corpus;
- paralelismo da regressão estabilizado em dois workers, sem redução de cobertura;
- pipeline `validate` executado por runner sequencial para encerrar corretamente no Node.js 24.

## Guardrails

- 120 minutos e domingo livre permanecem;
- backup permanece 2.5.0;
- SDE v1 efetivo;
- SDE v2 shadow, `affectsPrescription = false`;
- nenhuma alteração no corpus, catálogos ou gabaritos.
