# ConcurseiroOS v3.32.1 — Resultados de validação

## Suíte e contratos

- regressão completa: **496 testes aprovados em 78 arquivos**;
- incremento líquido frente à v3.32.0: **16 testes**;
- TypeScript: PASS;
- auditoria de memória institucional: PASS;
- diagnóstico piloto: PASS;
- catálogo do Treino FGV: 664 questões e 301 assets, PASS;
- corpus oficial, taxonomia, curadoria, shadow mode, roteamento, recuperação, simulados, SDE e prontidão: PASS.

### Cobertura adicionada/expandida

- 7 testes de estado, aderência, retry, persistência e layout;
- 4 testes do cliente HTTP e mensagens por status;
- 4 testes líquidos adicionais de endpoint, incluindo pertencimento à tentativa e alternativa inválida;
- 1 teste líquido adicional de deployment para funções serverless aninhadas;
- smoke serverless funcional fora da suíte unitária.

## Builds

| Etapa | Resultado |
|---|---|
| Build web — 2.254 módulos | PASS |
| Auditoria dos 6 assets do diagnóstico | PASS |
| Auditoria dos 301 assets do treino | PASS |
| Build Express | PASS |
| Build serverless compartilhado | PASS |
| Função serverless `check` | PASS |
| Função serverless `finalize` | PASS |

O aviso não bloqueante de chunk do Treino FGV permanece: aproximadamente 857,45 kB minificado e 184,73 kB gzip. Divisão adicional de bundle está fora do escopo do hotfix.

## Smokes

### Serverless específico

- catálogo inicial sem gabarito: PASS;
- tentativa de cinco questões: PASS;
- POST de conferência: HTTP 200;
- payload de correção: PASS;
- finalização: HTTP 200;
- store principal/SDE: inalterados.

### Express compilado

- `GET /api/health`: HTTP 200;
- `GET /api/training-fgv/check`: HTTP 405;
- asset PNG representativo: HTTP 200, `Content-Type: image/png`;
- raiz da aplicação: HTTP 200.

### Layout

Cinco cenários reais no Chromium foram aprovados, incluindo 840 × 550, mobile, imagens, código e reflow equivalente a zoom 150%.

## Segurança de dependências

- `npm audit --omit=dev`: 0 vulnerabilidades;
- `npm audit`: 0 vulnerabilidades.

## Ambiente

- Node usado na validação: 22.16.0;
- runtime declarado do produto: Node 24.x.

O smoke precisa ser repetido após a publicação efetiva na Vercel, especialmente para confirmar o deployment e a sessão reais, embora o bundle serverless compilado e o roteamento físico estejam validados localmente.

### Observação sobre estabilidade do executor

Uma repetição sem limite explícito de workers registrou timeout de 5 segundos em um teste preexistente de configuração de runtime, sem falha de asserção. O arquivo foi repetido isoladamente com 9/9 testes aprovados, e a regressão final com quatro workers encerrou com 496/496 testes aprovados. O fato foi tratado como contenção do executor, não como defeito funcional.
