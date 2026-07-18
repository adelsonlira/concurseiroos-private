# ADR-031 — Diagnóstico piloto isolado do SDE e do mastery

**Status:** aceito  
**Data:** 2026-07-18  
**Versão:** 3.31.3

## Contexto

A Control Tower autorizou integrar o `DIAGNÓSTICO PILOTO FGV–DATAPREV — BANCO DE DADOS — v1`, com 24 questões fixas, sem permitir que o resultado altere domínio, mastery, prioridade, incidência histórica, sessões planejadas ou simulados oficiais.

O arquivo importável contém gabarito e metadados internos que não podem ser enviados ao catálogo público antes da finalização.

## Decisão

- Criar um recurso independente em `src/features/pilotDiagnostic/`.
- Manter tentativa ativa e resultados em chaves locais exclusivas do diagnóstico, fora do store principal e do backup que alimenta o produto.
- Fixar `affectsSde: false` em tentativas ativas e finalizadas.
- Distribuir ao cliente apenas catálogo sanitizado com posição, enunciado, alternativas e referências relativas de assets.
- Manter gabarito e rastreabilidade fonte em `data/diagnostics/.../diagnostic-v1.internal.json`, importado apenas pelo backend.
- Corrigir exclusivamente após POST explícito de finalização.
- Agregar resultados por `question.traceability.selection_area`, nunca por `subject` ou `subsubject`.
- Registrar rastreabilidade por fingerprint SHA-256 dos 24 registros, sem apresentar ordinal, ID de plataforma ou classificação histórica na interface.
- Rejeitar segunda tentativa enquanto existir tentativa ativa; cancelamento remove somente o estado ativo e não cria resultado.
- Tratar tentativa finalizada como append-only e rejeitar sobrescrita pelo mesmo `attemptId`.

## Consequências

- O diagnóstico não participa de SDE, mastery, roadmap, prescrição diária, histórico de simulados ou incidência histórica.
- A correção depende do endpoint autenticado em produção.
- A persistência é local e isolada nesta versão; sincronização em nuvem não foi ampliada.
- PDF e HTML do candidato permanecem apenas como referências documentais e não são publicados pela aplicação.
