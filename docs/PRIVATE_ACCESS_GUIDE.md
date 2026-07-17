# Guia de acesso privado — ConcurseiroOS 3.25.0

## Política recomendada para o projeto atual

O ConcurseiroOS está sendo usado como aplicativo privado de um único estudante. A configuração recomendada é:

```env
AUTH_MODE=required
AUTH_ALLOW_SELF_SIGNUP=false
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_ANON_KEY=SUA_CHAVE_ANON_OU_PUBLISHABLE
```

Nunca use `service_role` no navegador ou no bundle.

## Supabase

1. Confirme que `supabase/001_online_foundation.sql` foi executado.
2. Em Authentication, desative novos cadastros públicos.
3. Crie ou convide apenas a conta autorizada pelo painel administrativo.
4. Confirme que o usuário consegue entrar e que visitante anônimo não obtém snapshot nem objetos do bucket.
5. Para revogar acesso, remova ou desabilite a conta no painel Supabase e encerre as sessões conforme a política administrativa disponível.

O aplicativo não implementa uma fila própria de aprovação por e-mail. Essa escolha evita armazenar credenciais administrativas e duplicar funções de identidade já fornecidas pelo Supabase.

## Vercel ou outro host

- configure as variáveis no ambiente de produção;
- faça novo deploy;
- abra `/api/runtime-config` e confirme `auth.mode = required` e `allowSelfSignup = false`;
- uma configuração `optional` em produção é promovida para `required`; somente `disabled` explícito libera o modo sem login.

## Computador público

Login não protege uma sessão que ficou aberta. Ao terminar:

1. aguarde a sincronização;
2. use **Sair e limpar este dispositivo**;
3. confirme que voltou à tela de login;
4. feche todas as abas e o navegador;
5. não permita que o navegador salve a senha.

O encerramento seguro preserva a nuvem e os PDFs originais, mas remove o estado de estudo daquele navegador.

## Limite atual

O armazenamento local não é namespaceado para vários usuários no mesmo perfil de navegador. Não convide outras pessoas para usar o mesmo deploy antes de uma decisão explícita de transformar o produto em multiusuário.
