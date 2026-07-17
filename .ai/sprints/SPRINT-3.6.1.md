# Sprint 3.6.1 — Abertura direta de PDF privado

## Objetivo

Eliminar a procura manual do PDF e da página prescrita sem enviar material licenciado para o servidor.

## Implementado

- Botão de abertura no Dashboard e na Sessão Guiada.
- Primeiro uso vincula a cópia local ao `materialId` catalogado.
- Vínculo persistente local por `FileSystemFileHandle` em IndexedDB quando suportado.
- Abertura em nova aba na primeira página prescrita.
- Validação do nome do arquivo para evitar associação incorreta.
- Troca explícita do arquivo vinculado.
- Recuperação de arquivo movido, permissão revogada, seleção cancelada e pop-up bloqueado.
- Fallback por seleção temporária em navegadores sem acesso persistente.
- Nenhum byte do PDF entra no estado, nuvem, backup ou pacote.

## Validado

- 286 testes em 38 arquivos.
- TypeScript e builds web, Express e serverless aprovados.
- Regras puras de nome e URL de página cobertas por testes.
- Memória institucional sincronizada com a versão 3.6.1.

## Limitações mantidas

- O vínculo não sincroniza entre dispositivos.
- O navegador pode solicitar permissão novamente.
- Abertura exata da página depende do visualizador PDF do navegador.
