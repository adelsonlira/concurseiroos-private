# Sprint 3.22.0 — Resiliência de dados e prontidão de produção

## Objetivo

Impedir perda silenciosa ou importação destrutiva de dados do estudante antes da validação autenticada das integrações externas.

## Implementado

- Backup 2.0 com checksum determinístico sobre JSON canônico.
- Validação transacional antes de substituir o estado: origem, coleções obrigatórias, IDs duplicados, referências e checksum.
- Compatibilidade controlada com backups legados sem checksum, mantendo aviso explícito.
- Persistência local atômica com snapshot anterior de recuperação.
- Hidratação com fallback automático quando o JSON principal estiver corrompido.
- Limpeza explícita dos artefatos de recuperação ao redefinir todos os dados.

## Segurança

O checksum detecta corrupção acidental; não é assinatura criptográfica nem prova de autoria. Nenhuma integração externa foi declarada validada sem credenciais.

## Validação

- TypeScript.
- Testes unitários de integridade do backup e recuperação local.
- Suíte integrada, builds e smoke HTTP.
