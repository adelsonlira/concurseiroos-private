# Sprint 3.23.0 — Clareza operacional, sincronização e recuperação guiada

## Objetivo

Eliminar ambiguidades observadas no uso real das telas Hoje, Plano e Progresso, Configurações e Backup e Conta e Sincronização, preservando o núcleo decisório e reduzindo escolhas desnecessárias.

## Implementado

- Política de sincronização em três vias baseada na última revisão e no fingerprint do conteúdo persistido.
- Recebimento automático da nuvem em dispositivo limpo e quando somente a nuvem mudou.
- Envio automático quando somente o dispositivo mudou.
- Conflito apresentado apenas quando ambos os lados mudaram desde a mesma base.
- Fingerprint sem timestamp e metadados voláteis de exportação.
- Reset local seguro com backup automático, logout, preservação da nuvem, limpeza de metadados de sync e remoção de vínculos locais com PDFs sem apagar arquivos.
- Cofre privado apresentado em grupos por disciplina, com assunto quando disponível.
- Perguntas-guia respondidas antes da sessão e novamente no fechamento, com texto persistido e opção `ainda não sei`.
- Recalculo do SDE suspenso durante o fechamento guiado para não substituir a prescrição antes da evidência final.
- Perguntas-guia explicitamente separadas de questões objetivas com gabarito validado.
- Botões renomeados e documentados: `Atualizar recomendação`, `Hoje` e `Verificar agora`.
- Limitações metodológicas classificadas e apresentadas como não bloqueantes.
- Cadastro de novo concurso mantido deliberadamente fora da interface até estabilização da DATAPREV.

## Não alterado

- pesos, parâmetros e ranking do SDE;
- incidência histórica, que permanece em shadow mode;
- pacote ativo DATAPREV 2026 — Perfil 3;
- hierarquia entre fonte oficial, material pedagógico e inferência.

## Validação

- memória institucional;
- catálogos e corpus oficiais;
- auditoria do SDE e prontidão;
- TypeScript;
- testes unitários e de integração;
- builds web, Express e serverless;
- smoke HTTP e auditoria de dependências.
