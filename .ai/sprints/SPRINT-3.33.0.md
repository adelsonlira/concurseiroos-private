# Sprint 3.33.0 — Ledger de Evidências Externas

**Data:** 2026-07-18  
**Linha de base:** 3.32.1  
**Tipo:** evolução funcional aditiva, sem alteração do SDE

## Objetivo

Transformar a tela existente de registro manual em uma entrada rápida, append-only e sincronizável para resultados obtidos fora do ConcurseiroOS, especialmente em baterias do QConcursos, sem criar tentativas sintéticas e sem alterar decisões nesta versão.

## Escopo entregue

- Tela e componentes existentes de `Registrar questões` reutilizados e renomeados para `Registrar resultado`.
- Rota canônica `#/registrar-resultado`, com aliases para as rotas anteriores.
- Ledger versionado `externalEvidenceLedger`, inicializado de forma aditiva em stores e backups antigos.
- Eventos agregados e individuais com origem, taxonomia, contagens, duração, consulta, confiança, causas e vínculos opcionais com prescrição e sessão.
- Correções por novo evento com `supersedesEvidenceId` e anulações por novo evento com `voidsEvidenceId`.
- Qualidade derivada determinística e explicável, sem conversão em mastery.
- Formulário rápido com padrões QConcursos, FGV, sem consulta e confiança não informada.
- Preenchimento de escopo e quantidade a partir de prescrição ou sessão externa ativa.
- Histórico com situação ativa, substituída ou anulada, filtros básicos e visualização de detalhes.
- Resumo descritivo recente que ignora eventos anulados e utiliza a versão substituta.
- Inclusão do ledger no backup, restauração, persistência local e snapshot sincronizado existentes.

## Guardrails preservados

- `decisionStatus = shadow`.
- `affectsSde = false`.
- Nenhuma alteração em score, ranking, mastery, prioridade, roadmap ou prescrição diária.
- Nenhuma tentativa individual sintética para baterias agregadas.
- Tentativas legadas, revisões e casos de recuperação permanecem intactos.
- Treino FGV, Diagnóstico Piloto, simulados, sessões, autenticação e sincronização continuam usando seus contratos existentes.
- Nenhuma credencial, cookie, token, HTML completo ou conteúdo integral de questão externa é coletado.

## Fora do escopo

- Consumo decisório pelo SDE v2.
- Integração automática, scraping ou login no QConcursos.
- Recomendações, dashboards avançados ou incidência histórica decisória.
- Alteração do Treino FGV, novos diagnósticos ou simulados configuráveis.
