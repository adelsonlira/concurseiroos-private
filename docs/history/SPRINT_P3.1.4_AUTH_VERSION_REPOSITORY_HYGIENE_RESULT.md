# Sprint P3.1.4 — autenticação, versão e higiene do repositório

## Objetivo

Corrigir a versão exibida na interface, melhorar o diagnóstico de login em navegadores sem sessão persistida e organizar a documentação histórica fora da raiz do repositório.

## Implementado

- Fonte única de versão em `package.json` por meio de `src/config/appMetadata.ts`.
- Versão exibida dinamicamente na sidebar e no Dashboard.
- Normalização de e-mail antes de cadastro e login.
- Tradução segura de erros comuns de autenticação, sem indicar qual credencial falhou.
- Botão para mostrar/ocultar senha e aviso de Caps Lock.
- Fluxo completo de recuperação de senha pelo Supabase:
  - solicitação de e-mail;
  - detecção do evento `PASSWORD_RECOVERY`;
  - definição e confirmação da nova senha;
  - atualização da conta autenticada.
- Relatórios `SPRINT_*` e `HOTFIX_*` movidos para `docs/history/`.
- Auditorias movidas para `docs/audits/`.
- Constituição movida para `docs/governance/`.
- Índice documental criado em `docs/README.md`.
- README corrigido para usar `.env`, que é o arquivo efetivamente carregado pelo backend.

## Diagnóstico da aba anônima

Uma sessão ativa no navegador normal pode ocultar a necessidade de digitar novamente a senha. A mensagem `Invalid login credentials` na aba anônima indica que o par digitado não foi aceito. O fluxo de redefinição permite recuperar o acesso sem alterar dados ou criar outra conta.

## Validação

- 254/254 testes aprovados em 29 arquivos.
- TypeScript/lint aprovado.
- Build web, servidor e serverless aprovado.
- `npm audit --omit=dev`: 0 vulnerabilidades.
- Servidor de produção: `/api/health` HTTP 200 e página principal HTTP 200.
- Nenhum `.env`, PDF privado ou arquivo compactado privado no pacote.

## Limitação

O envio e recebimento reais do e-mail de recuperação dependem da configuração de URL do projeto Supabase e devem ser validados após o deployment P3.1.4.
