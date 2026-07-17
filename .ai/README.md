# ConcurseiroOS — Entrada Obrigatória para IAs

Este diretório é a memória institucional do projeto. Antes de analisar, planejar ou modificar código, leia nesta ordem:

1. `context/CONSTITUICAO.md`
2. `context/PRODUCT.md`
3. `context/UX.md`
4. `context/ARCHITECT.md`
5. `context/DOMAIN.md`
6. `context/KNOWLEDGE_GRAPH.md`
7. `context/SDE.md`
8. `memory/CURRENT_STATE.md`
9. `memory/NEXT_STEPS.md`
10. `memory/OPEN_QUESTIONS.md`
11. `memory/DEVELOPMENT_HISTORY.md`
12. `decisions/` e o último arquivo de `sprints/`

## Regra de atuação

O ConcurseiroOS é um coach decisório. A interface deve reduzir a fadiga de decisão e indicar o que estudar, por quanto tempo, com qual material, páginas, quantidade de questões e evidências a registrar.

Não crie funcionalidades apenas porque são tecnicamente interessantes. Toda mudança deve demonstrar impacto plausível em uma destas capacidades:

- qualidade da decisão;
- execução da sessão;
- coleta de evidência real;
- retenção e recuperação;
- compreensão da banca e do edital;
- redução de carga cognitiva operacional.

## Fechamento obrigatório de sprint

Antes de considerar uma sprint concluída:

1. atualizar a versão em `package.json`;
2. atualizar `memory/CURRENT_STATE.md`;
3. atualizar `memory/NEXT_STEPS.md`;
4. adicionar uma entrada em `memory/DEVELOPMENT_HISTORY.md`;
5. criar ou atualizar o relatório em `sprints/`;
6. registrar ADR quando houver decisão arquitetural relevante;
7. executar `npm run build`;
8. não incluir credenciais, PDFs privados, vídeos ou conteúdo licenciado no pacote de entrega.

O script `npm run validate:memory` impede o fechamento da versão quando a memória não acompanha o código.
