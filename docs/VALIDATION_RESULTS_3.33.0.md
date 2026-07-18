# ConcurseiroOS v3.33.0 — Resultados de validação

**Data:** 18/07/2026  
**Runtime local:** Node.js 22.16.0, npm 10.9.2  
**Runtime declarado:** Node.js 24.x

## Resultado geral

A implementação do Ledger de Evidências Externas foi validada sem falhas bloqueantes.

| Verificação | Resultado |
|---|---:|
| Regressão completa | 525/525 testes aprovados |
| Arquivos de teste | 82/82 aprovados |
| Novos testes do ledger | 29 |
| TypeScript | PASS |
| Memória institucional | PASS |
| Auditoria SDE | PASS — 117 ações, 50 parâmetros |
| Prontidão | READY_WITH_LIMITATIONS / MEDIUM |
| Build web | PASS — 2.261 módulos |
| Build Express | PASS |
| Build serverless | PASS |
| Smoke HTTP | PASS |
| Smoke serverless do Treino FGV | PASS |
| npm audit produção | 0 vulnerabilidades |
| npm audit completo | 0 vulnerabilidades |

## Cobertura específica do ledger

Foram confirmados:

1. criação de evidência agregada;
2. criação de evidência individual;
3. soma obrigatória de acertos, erros e brancos;
4. rejeição de valores negativos, total zero e taxonomia inválida;
5. ausência de tentativas sintéticas;
6. um lote gera exatamente um evento;
7. append-only para registro, correção e anulação;
8. preservação do evento original e dos IDs;
9. inclusão no backup, restauração e fingerprint de sincronização;
10. migração aditiva de snapshots legados;
11. padrões QConcursos, FGV, sem consulta e confiança não informada;
12. preenchimento e vínculo de prescrição/sessão;
13. resumo que ignora anulação e usa a versão substituta;
14. filtros por fonte, disciplina e assunto;
15. `decisionStatus = shadow` e `affectsSde = false`;
16. neutralidade de SDE, mastery, prioridades e tentativas legadas;
17. rejeição de credenciais, cookies, tokens, chaves, HTML e URLs com autenticação;
18. aliases de navegação da tela antiga;
19. preservação do Treino FGV e de seus entrypoints serverless;
20. preservação do Diagnóstico Piloto e de seus 32 testes.

## Builds

O build web foi executado diretamente pelo Vite para cumprir a ordem de não reimportar o banco FGV e não repetir a auditoria dos 301 assets durante esta versão. O build preservou os assets existentes e transformou 2.261 módulos.

O aviso não bloqueante do chunk `FgvTrainingView`, com aproximadamente 857 kB minificado, já existia no escopo do Treino FGV e não foi alterado nesta versão.

## Limitações de ambiente

A validação local disponível utiliza Node.js 22.16.0, enquanto o produto declara Node.js 24.x. O smoke deve ser repetido após publicação no runtime real da Vercel e com sessão autenticada para confirmar a sincronização multi-dispositivo do ledger.
