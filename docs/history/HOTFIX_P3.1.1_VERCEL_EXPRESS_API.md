# Hotfix P3.1.1 — Vercel Express API

## Sintoma

A raiz estática carregava na Vercel, mas `/api/health` retornava `404 NOT_FOUND`.

## Causa

O deployment foi tratado como estático após o override de Output Directory. O entrypoint Express também não exportava explicitamente `app`, reduzindo a robustez da descoberta automática da função.

## Correções

- `server.ts` agora exporta `app` como default.
- `app.listen` é executado apenas fora da Vercel.
- `public/**` continua sendo usado para assets estáticos.
- `vercel.json` não define `outputDirectory`.
- teste de regressão para o entrypoint da Vercel.
- versão 3.1.1.

## Configuração necessária no painel

Desativar o override de **Output Directory**. O campo deve ficar vazio/padrão.
