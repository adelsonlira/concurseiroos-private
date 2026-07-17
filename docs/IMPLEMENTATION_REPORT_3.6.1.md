# ConcurseiroOS 3.6.1 — Abertura direta de PDFs privados

## Resultado

A prescrição agora pode abrir a cópia local do PDF diretamente na primeira página indicada, sem upload e sem incorporar conteúdo licenciado ao aplicativo.

## Fluxo

1. O Coach informa arquivo e intervalo de páginas.
2. Na primeira abertura, o usuário seleciona a sua cópia local.
3. O sistema valida o nome e guarda somente o vínculo local quando o navegador permitir.
4. Nas próximas sessões, o botão abre o PDF em nova aba com `#page=N`.
5. Se o arquivo for movido ou a permissão expirar, o sistema solicita novo vínculo.

## Privacidade

- PDF não entra no Zustand.
- PDF não é enviado ao Gemini.
- PDF não é enviado ao Supabase.
- PDF não entra em snapshots, backups ou ZIPs públicos.
- O vínculo é local ao navegador e dispositivo.

## Compatibilidade

Navegadores com File System Access API mantêm o vínculo. Nos demais, o candidato seleciona o PDF a cada abertura. A Sessão Guiada permanece aberta na aba original.

## Validação

- 286 testes em 38 arquivos.
- TypeScript aprovado.
- Builds web, Express e serverless aprovados.
