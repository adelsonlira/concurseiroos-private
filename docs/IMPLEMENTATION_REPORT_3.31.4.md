# Relatório de implementação — ConcurseiroOS 3.31.4

## Escopo

Hotfix exclusivo da navegação do `Diagnóstico Piloto FGV-DATAPREV — Banco de Dados`, sem alteração de conteúdo, correção, persistência ou integração estratégica.

## Causa-raiz

A função `hydrate` de `src/features/pilotDiagnostic/store.ts` preenchia `selectedFinalizedAttemptId` com o último item de `finalizedAttempts` quando não havia tentativa ativa. `PilotDiagnosticView` interpretava essa seleção como tela prioritária e renderizava o resultado imediatamente. Como o app usa um tab interno, clicar novamente em `Diagnóstico piloto` não remontava o módulo nem limpava a seleção.

## Solução

1. A seleção de resultado foi removida do store persistente do módulo.
2. A navegação passou a possuir três estados explícitos e transitórios:
   - `landing`;
   - `active_attempt`;
   - `finalized_result` com `attemptId` obrigatório.
3. O shell existente passou a refletir esses estados em fragmentos de URL, evitando nova dependência de roteamento e permitindo F5:
   - `#/diagnostico`;
   - `#/diagnostico/tentativa`;
   - `#/diagnostico/resultado/:attemptId`.
4. O item lateral sempre resolve para `landing`.
5. A landing decide apenas entre iniciar e retomar com base na tentativa ativa; resultados finalizados não definem a tela principal.
6. Seleção de histórico e pós-finalização usam o identificador exato da tentativa.

## Preservações

- Mesmas chaves de localStorage e mesmo formato das tentativas.
- Histórico existente continua legível e append-only.
- Conteúdo das 24 questões, seis assets e gabarito inalterados.
- Resultado por `selection_area`, cobertura e correção operacional inalterados.
- Store principal, SDE, mastery, prioridades, sessões e simulados sem alteração.
