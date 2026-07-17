# Protocolo de revisão do corpus oficial FGV

## Princípio

A revisão confirma o que está no documento oficial; ela não completa lacunas por conhecimento prévio, semelhança ou expectativa sobre a banca.

## Ordem de trabalho

1. **Extração bloqueante:** abrir a página indicada e confirmar número, início, fim e alternativas da questão.
2. **Vínculo de gabarito:** confirmar concurso, cargo/área, turno, tipo de caderno, quantidade, status e página da tabela.
3. **Alterações e anulações:** comparar preliminar, definitivo e comunicados; registrar a fonte de cada mudança.
4. **Deduplicação:** verificar se o núcleo semântico e as alternativas são realmente iguais; não unir apenas por tema.
5. **Classificação:** classificar primeiro no edital de origem e só depois propor equivalência com DATAPREV 2026.

## Decisões permitidas

- `REVIEWED`: fonte aberta e relação confirmada;
- `REJECTED`: candidato automático incorreto;
- `PENDING`: evidência insuficiente ou documento ausente.

Nenhuma revisão isolada altera incidência. A ativação exigirá uma decisão arquitetural separada, métricas de cobertura, análise de sensibilidade e comparação shadow.

## Critérios mínimos de aceite

### Questão

- número e página corretos;
- enunciado delimitado sem invadir a questão seguinte;
- alternativas presentes ou ausência justificada;
- hash da fonte correspondente ao catálogo.

### Gabarito

- prova/cargo e caderno inequívocos;
- status preliminar ou definitivo registrado;
- anulação e alteração preservadas;
- quantidade e numeração compatíveis.

### Duplicata

- conteúdo substancialmente idêntico;
- diferenças apenas de caderno, ordem ou formatação;
- questão canônica escolhida com fonte e ano preservados;
- reutilização legítima entre cargos não apagada do histórico documental.

## Saída da curadoria

Cada decisão deve registrar revisor, data, estado anterior, estado novo, justificativa curta e documento/página consultados. Alterações devem ser append-only ou manter trilha de auditoria equivalente.
