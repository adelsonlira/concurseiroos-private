# Resultados de validação — ConcurseiroOS v3.34.0

**Data:** 19/07/2026  
**Runtime de validação:** Node.js 24.11.1, npm 10.9.2

## Resultado final

- memória institucional: PASS;
- Diagnóstico Piloto: 24 questões, 6 assets, controles 14/53, PASS;
- Treino FGV: 797 registros preservados, 664 elegíveis, 301 assets, PASS;
- corpus oficial: 95 provas, 6.462 questões, integridade PASS;
- taxonomia: 123 nós e 94 subassuntos, PASS;
- grafo SDE v2: 26 nós conceituais, 20 relações e zero ciclos obrigatórios, PASS;
- auditoria SDE v2: PASS;
- auditoria SDE v1: 117 ações e 50 parâmetros, PASS;
- prontidão: `READY_FOR_LOCAL_DAILY_USE`, confiança alta;
- TypeScript: PASS;
- regressão: 584/584 testes em 87 arquivos;
- build web: PASS;
- build Express: PASS;
- build serverless: PASS;
- smoke Express compilado: PASS;
- smoke das funções serverless do Treino FGV: PASS;
- `npm audit --omit=dev`: 0 vulnerabilidades;
- `npm audit`: 0 vulnerabilidades.

## Auditoria decisória SDE v2

O cenário determinístico de auditoria registrou:

- 1 registro de evidência objetiva elegível;
- 1 evidência normalizada;
- nenhuma expansão de lote em tentativas sintéticas;
- score selecionado de 48,44;
- 8 regras duras registradas;
- 14 componentes explicáveis;
- incidência histórica com peso decisório 0;
- 1 fallback observado no cenário sem disponibilidade diária.

A quantidade `1` é própria da fotografia de teste do auditor. A quantidade real em produção será calculada a partir do store do usuário, considerando somente a cadeia ativa e válida do ledger.

## Comparação automática v1 × v2

Na fotografia controlada:

- SDE v1: `dp26-p3-esp-bd-avaliacao-modelos`, método operacional `questoes`;
- SDE v2: `dp26-p3-esp-arquitetura-software`, método `short_diagnostic`;
- mesmo tipo amplo de atividade: sim;
- mesmo nó: não;
- motivo registrado: o v2 distribuiu pesos hierarquicamente e aplicou grafo, qualidade/amostra das evidências e ledger agregado.

A incidência histórica foi registrada em shadow mode e não causou a divergência.

## Ocorrências durante o fechamento

A primeira passagem do validador institucional detectou que `CURRENT_STATE.md` não usava os títulos obrigatórios `Validado` e `Problemas conhecidos`. A memória foi corrigida.

A primeira regressão completa detectou que um teste legado do Coach, destinado a verificar o desempate do SDE v1, estava usando a nova configuração padrão v2. O fixture foi fixado explicitamente no v1 e foi adicionada uma verificação separada da auditoria v2. A regressão integral final passou sem falhas.
