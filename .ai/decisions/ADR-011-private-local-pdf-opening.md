# ADR-011 — Abertura local de PDFs privados

## Contexto

A prescrição informa arquivo e páginas, mas o aplicativo mantinha somente metadados. Exigir que o candidato localizasse e navegasse manualmente até a página aumentava a carga operacional. Ao mesmo tempo, os PDFs licenciados não podem ser incorporados ao pacote, enviados ao Coach ou incluídos em backups.

## Decisão

- O usuário vincula a sua cópia local ao material catalogado na primeira abertura.
- Em navegadores compatíveis, somente um `FileSystemFileHandle` é guardado no IndexedDB local do navegador.
- O conteúdo binário do PDF não entra no Zustand, Supabase, snapshots, logs ou pacotes do projeto.
- A abertura ocorre em nova aba, preservando a Sessão Guiada, com fragmento `#page=N` apontando para a primeira página prescrita.
- O nome do arquivo é validado antes da abertura para reduzir risco de executar o material errado.
- Navegadores sem vínculo persistente recebem fallback por seletor de arquivo a cada abertura.
- Arquivo movido, renomeado ou com permissão revogada exige novo vínculo.

## Consequências positivas

- Menos cliques e procura manual durante o estudo.
- Continuidade do timer e do roteiro em uma aba separada.
- Privacidade e direitos do material preservados.
- Nenhuma dependência de caminho absoluto do Windows ou de upload para nuvem.

## Limitações

- A persistência do vínculo depende do suporte do navegador à File System Access API.
- O visualizador nativo do navegador precisa interpretar o fragmento de página.
- O vínculo é específico daquele navegador/dispositivo e não sincroniza entre máquinas.
