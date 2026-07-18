# ConcurseiroOS v3.33.0 — Relatório de implementação

**Recurso:** Ledger de Evidências Externas  
**Baseline:** ConcurseiroOS v3.32.1  
**Data:** 18/07/2026

## Objetivo entregue

O recurso existente `Registrar questões` foi reutilizado e renomeado para `Registrar resultado`. A versão cria uma base append-only para resultados obtidos fora do ConcurseiroOS, sobretudo baterias do QConcursos, sem converter lotes em tentativas individuais sintéticas e sem alterar o SDE atual.

## Arquitetura

O novo domínio está concentrado em `src/core/externalEvidence/`:

- `types.ts`: contratos do evento, qualidade, visualização e resumo;
- `ledger.ts`: validação, sanitização, criação, correção, anulação, estados derivados, filtros e resumo;
- `quality.ts`: metadados determinísticos de autoridade, força e amostra efetiva;
- `defaults.ts`: padrões do formulário e prefill;
- `linkage.ts`: vínculo descritivo com prescrição e sessão;
- `index.ts`: superfície pública do módulo.

O `externalEvidenceLedger` foi adicionado ao store principal somente como nova coleção. As ações de gravação alteram exclusivamente essa coleção e persistem pelo mecanismo local já existente.

## Reaproveitamento da tela antiga

Foram reutilizados:

- componente `ExternalAttemptRecorder`;
- tela `ExerciseDeskView`;
- entrada contextual em `FocusModeDesk`;
- taxonomia de disciplinas, assuntos e subassuntos;
- store, persistência local, backup e sincronização;
- navegação lateral existente.

A rota canônica passou a ser `#/registrar-resultado`. Permanecem aliases para `#/registrar-questoes`, `#/questoes` e `#/exercises`.

## Fluxo de gravação

### Bateria agregada

Uma bateria com total, acertos, erros e brancos gera exatamente um `ExternalEvidenceRecord`. Não são criados IDs de questões, ordem, tempos ou causas individuais.

### Evidência individual

O formulário também permite um evento individual, sem modificar ou migrar tentativas individuais legadas.

### Correção e anulação

- Correção: novo evento com `supersedesEvidenceId`.
- Anulação: novo evento de ledger com `voidsEvidenceId`.
- O original permanece armazenado e não existe exclusão física no fluxo comum.

## Integração com Coach e Sessão Guiada

Quando há prescrição ou sessão de questões ativa, a tela recebe disciplina, assunto, subassunto, referência de fonte, quantidade planejada, `prescriptionId` e `sessionId`. O progresso descritivo só é reconhecido após o salvamento de uma evidência válida vinculada ao contexto correto.

Nenhuma nova prescrição é gerada e nenhuma decisão é recalculada pelo ledger nesta versão.

## Segurança e privacidade

O formulário rejeita padrões de:

- credenciais e senhas;
- cabeçalhos de autorização e bearer tokens;
- cookies;
- tokens em URL;
- chaves de API;
- credenciais embutidas em URL;
- HTML completo de páginas externas.

A interface orienta o usuário a guardar somente link, nome de caderno, identificador ou descrição curta, sem copiar conteúdo integral de questão.

## Neutralidade decisória

Todo evento novo possui:

```text
decisionStatus = shadow
affectsSde = false
```

O código de gravação não altera `ultimaDecisaoSDE`, estatísticas de mastery, disciplinas, assuntos, tentativas legadas, revisões, prioridades ou sessões.

## Compatibilidade

A migração é aditiva. Stores ou backups sem o novo campo recebem:

```text
externalEvidenceLedger = []
```

Registros anteriores não são regravados. Treino FGV, Diagnóstico Piloto, simulados, autenticação e sincronização mantêm os contratos anteriores.

## Campos reutilizados da tela antiga

- disciplina;
- assunto;
- subassunto;
- fonte externa;
- total de questões;
- acertos;
- brancos;
- duração;
- consulta a material;
- confiança;
- resultado individual;
- causa principal do erro;
- nota contextual;
- vínculo contextual com a prescrição.

## Campos e metadados novos

- tipo e enumeração de fonte;
- erros informados explicitamente;
- banca;
- referência curta da fonte;
- causas secundárias;
- pontos difíceis;
- observações separadas;
- `evidenceId`, versão e timestamps;
- `prescriptionId` e `sessionId` explícitos;
- item do edital;
- quantidade planejada e efetivamente realizada;
- `decisionStatus`, `affectsSde` e ação do ledger;
- `supersedesEvidenceId` e `voidsEvidenceId`;
- autoridade, força de medição e amostra efetiva;
- situação derivada ativa, substituída ou anulada.

## Inventário de mudanças

Comparação da árvore-fonte com a v3.32.1, excluindo artefatos transitórios:

- 20 arquivos adicionados;
- 22 arquivos modificados;
- 0 arquivos removidos;
- 890 arquivos inalterados.

## Limitações remanescentes

- O SDE v2 ainda não consome o ledger.
- Não existe merge append-only especializado para edições simultâneas em vários dispositivos; a versão reutiliza a reconciliação integral existente.
- Não há importação automática, scraping ou autenticação com plataformas externas.
- O resumo é descritivo e não substitui análise estatística futura.
- A validação local usa Node.js 22.16.0, enquanto o alvo declarado é Node.js 24.x.
