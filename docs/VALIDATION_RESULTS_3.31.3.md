# Resultados de Validação — ConcurseiroOS 3.31.3

**Data:** 18/07/2026  
**Status:** PASS com limitação conhecida de runtime local Node 22 versus alvo Node 24

## Integridade das entradas

| Entrada | SHA-256 | Resultado |
|---|---|---:|
| Baseline 3.31.2 | `161854a02c252649cf0a7e2a8270a4512d873212ab427ae385a4eb58ee43e881` | PASS |
| Pacote diagnóstico v1 | `cb61902f3df95337132ddc44fdfbaf52b5bef6871d7bb16ac577fbb6d19e5ff8` | PASS |
| Banco operacional v2 | `f0a031ebd7331a1634ab8c2844bf0a18f0fe4391c46322caf5ba39c60f9973b7` | coincide com o manifesto |

## Validação do diagnóstico

- 24 questões carregadas.
- Ordem fixa 1–24 preservada.
- Cinco alternativas por questão.
- Seis assets presentes e íntegros.
- Controles 14 e 53 presentes.
- 20 aderentes diretas e 4 aderentes parciais.
- Zero caminhos absolutos no import aceito.
- Catálogo público sem gabarito ou metadados internos.
- Gabarito disponível somente após POST de finalização.
- Agregação por `selection_area`.
- Nota total calculada sobre 24 questões, sem penalização ou ajuste por aderência parcial.

## Testes automatizados

- Arquivos de teste: **74**.
- Testes aprovados: **436/436**.
- Novos testes focados no diagnóstico: **17**.

Cobertura nova:

1. 24 questões carregadas;
2. ordem fixa;
3. seis assets;
4. sigilo pré-finalização;
5. cancelamento sem resultado;
6. brancos separados;
7. agregação por `selection_area`;
8. neutralidade do SDE;
9. neutralidade do mastery;
10. neutralidade da prioridade e dos simulados;
11. controles 14 e 53;
12. retomada após recarregamento;
13. imutabilidade do resultado;
14. rejeição de caminho absoluto;
15. bloqueio de segunda tentativa ativa;
16. nota sem ajuste por aderência parcial;
17. endpoint de correção somente após finalização.

## TypeScript e builds

| Etapa | Resultado |
|---|---:|
| `npm run typecheck` | PASS |
| `npm run build:web` | PASS |
| auditoria dos assets emitidos | PASS |
| `npm run build:server` | PASS |
| `npm run build:serverless` | PASS |

Os seis assets foram emitidos como arquivos PNG reais em `public/assets/` e responderam HTTP 200 no smoke local de produção.

## Pipeline institucional

- Memória 3.31.3: PASS.
- Corpus oficial: 95 provas, 6.462 questões, PASS.
- Knowledge Engine: shadow mode preservado.
- Taxonomia: 123 nós, PASS.
- Curadoria: 646 grupos, PASS.
- Classificação: 656 propostas, zero aprovações humanas, zero incidência elegível.
- Roteamento: zero rotas inseguras entre irmãos.
- Recuperação de erros: PASS.
- Simulados: PASS.
- Auditoria SDE: 117 ações, 50 parâmetros, PASS.
- Prontidão: `READY_WITH_LIMITATIONS`, confiança média.

## Dependências

- `npm ci`: PASS.
- `npm audit --omit=dev`: 0 vulnerabilidades.
- `npm audit`: 0 vulnerabilidades.

## Smoke HTTP

- `/api/health`: HTTP 200.
- `/`: HTTP 200.
- seis assets: HTTP 200.
- GET `/api/diagnostic-finalize`: HTTP 405, sem gabarito.
- POST `/api/diagnostic-finalize`: HTTP 200.
- Resultado smoke: 24 brancos, 11 áreas, 24 correções, 24 registros de rastreabilidade e `affectsSde: false`.

## Limitações

- Ambiente de validação: Node 22.16.0; alvo declarado: Node 24.x.
- A finalização depende do endpoint autenticado e precisa de smoke real na Vercel.
- Tentativas diagnósticas são locais nesta versão e não sincronizam entre dispositivos.
