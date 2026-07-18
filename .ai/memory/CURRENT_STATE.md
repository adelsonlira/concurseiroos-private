# Estado Atual

Data: 2026-07-18
Versão: 3.33.0

## Projeto

ConcurseiroOS — alvo ativo: DATAPREV 2026, Analista de Tecnologia da Informação, Perfil 3 — Desenvolvimento de Software.

O produto é um sistema de apoio à decisão orientado à aprovação. Deve reduzir fadiga decisória, entregar uma sessão executável e recalcular a próxima ação apenas quando houver contrato decisório autorizado. Nenhum módulo promete aprovação, inventa incidência ou converte ausência de dados em certeza.

## Fase atual

A versão 3.33.0 introduz o **Ledger de Evidências Externas** reutilizando o recurso anteriormente chamado `Registrar questões`, agora apresentado como `Registrar resultado`.

O ledger coleta resultados agregados ou individuais obtidos fora do ConcurseiroOS, sobretudo no QConcursos, e os mantém em shadow mode para futura integração ao SDE v2. A versão não altera o algoritmo decisório atual, mastery, prioridades, roadmap ou prescrição diária.

## Implementado

- `externalEvidenceLedger` append-only, versionado e inicializado de forma aditiva.
- Um lote agregado gera exatamente um evento, sem tentativas sintéticas.
- Correções criam evento com `supersedesEvidenceId`; anulações criam evento com `voidsEvidenceId`.
- Estados derivados distinguem evidências ativas, substituídas e anuladas.
- Formulário rápido com QConcursos, FGV, sem consulta e confiança não informada como padrões.
- Validação de taxonomia, total, acertos, erros, brancos, duração e quantidades planejada/realizada.
- Cálculo automático revisável de brancos quando total, acertos e erros determinam um único valor.
- Campos adicionais recolhidos em `Mais detalhes`.
- Vínculo opcional com `prescriptionId` e `sessionId`, incluindo quantidade planejada e realizada.
- Qualidade de evidência derivada de forma determinística e explicável.
- Histórico filtrável, detalhes, correção, anulação e resumo descritivo recente.
- Rota canônica `#/registrar-resultado` e aliases compatíveis com links antigos.
- Backup, restauração, persistência local e sincronização existentes incluem o ledger.

## Validado

- Evidências novas têm `decisionStatus = shadow` e `affectsSde = false`.
- SDE, mastery, prioridades, estatísticas legadas e tentativas anteriores não são modificados ao salvar no ledger.
- Correção e anulação preservam o evento original e mantêm IDs estáveis em backup/restauração.
- O resumo ignora eventos anulados e usa a versão substituta sem duplicar contagens.
- Filtros por período, fonte, disciplina, assunto e situação são não decisórios.
- Dados sensíveis externos, tokens, cookies, credenciais e HTML completo são rejeitados.
- Prescrição e sessão só recebem progresso quando uma evidência válida vinculada é salva.
- Treino FGV e Diagnóstico Piloto permanecem sob seus contratos isolados.

## Problemas conhecidos

- O ledger ainda não é consumido pelo SDE; isso é intencional nesta versão.
- O histórico não possui dashboards estatísticos avançados nem recomendações.
- Não há integração automática com QConcursos ou NotebookLM.
- O formulário depende da taxonomia ativa existente no dispositivo.
- Dados locais gerais ainda não são namespaceados para múltiplos usuários no mesmo perfil de navegador.
- O runtime-alvo é Node.js 24.x; a validação automatizada disponível executa Node 22.x.
- Nenhum software ou plano garante aprovação.

## Próxima tarefa

Projetar, sob nova ordem da Control Tower, o contrato do SDE v2 para consumir somente evidências elegíveis do ledger, sem criar tentativas sintéticas, sem reescrever o histórico e com portões explícitos de autoridade, força de medição e amostra efetiva.
