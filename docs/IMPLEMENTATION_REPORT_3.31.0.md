# Relatório de implementação — ConcurseiroOS 3.31.0

Data: 2026-07-17

## Resultado executivo

A Sprint 3.31.0 substituiu o simulador legado aleatório por um fluxo determinístico, auditável e derivado do edital DATAPREV 2026. O produto agora monta simulados parciais e completos, registra fonte, tempo, brancos e resultados por disciplina, aplica a pontuação oficial e organiza a correção sem inventar conteúdo ou criar um cronograma concorrente ao SDE.

## Linha de base confirmada

Antes da alteração foram executados `npm ci` e `npm run validate` sobre a versão 3.30.0. O resultado reproduziu 398 testes aprovados em 67 arquivos, TypeScript, corpus, taxonomia, roteamento, recuperação de erros, SDE e prontidão aprovados.

## Implementação

### Núcleo puro

- `src/core/simulations/types.ts`: contratos versionados.
- `src/core/simulations/simulationEngine.ts`: blueprint, composição, análise, correção e comparação.
- derivação direta do pacote oficial, sem fórmula estratégica na UI ou store.

### Composição

- completo: 70 questões, 240 minutos, 115 pontos;
- parcial: cota oficial inteira das disciplinas escolhidas;
- duração parcial proporcional à razão oficial 240/70, arredondada para cima;
- fonte externa identificada ou banco local com portões documentais.

### Segurança de fonte

Questão local só pode entrar quando:

- possui `fonteDocumentoId`;
- possui gabarito oficial não vazio;
- não é questão customizada;
- existe quantidade suficiente para cumprir a cota oficial da disciplina.

A seleção local é determinística. Fontes externas geram instruções de filtro e não criam enunciados, alternativas, gabaritos ou IDs fictícios.

### Registro e análise

- resultados por disciplina: acertos, erros, brancos e tempo;
- pontuação calculada pelos pontos oficiais por questão;
- alerta de zero por disciplina;
- corte global avaliado somente no simulado completo;
- correção ordenada por risco de zero, brancos e pontos perdidos;
- comparação apenas entre mesmo concurso, tipo e composição.

### Integração e UX

- nova tela `Simulados` no fluxo diário;
- criação parcial/completa, seleção de fonte, cronômetro e histórico;
- persistência e backup retrocompatíveis;
- resultado agregado não gera tentativas por subassunto e não invalida a decisão do SDE.

## Arquivos principais

- `src/core/simulations/types.ts`;
- `src/core/simulations/simulationEngine.ts`;
- `src/core/simulations/tests/*`;
- `src/components/SimulationsView.tsx`;
- `src/store.ts`;
- `src/types.ts`;
- `src/navigation/navigationModel.ts`;
- `scripts/auditSimulationContract.ts`;
- `data/quality/simulation-contract.json`;
- `.ai/decisions/ADR-028-evidence-gated-simulations.md`.

## Riscos conhecidos

- fontes externas dependem do usuário manter os filtros prescritos; o app não copia nem inspeciona o conteúdo da plataforma;
- resultado agregado por disciplina não identifica automaticamente subassuntos;
- duração parcial é proporcional e precisa de validação prospectiva;
- o ambiente de entrega usa Node 22.16.0, enquanto produção deve permanecer em Node 24.x.
