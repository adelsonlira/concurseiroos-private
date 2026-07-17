# Implantação on-line — ConcurseiroOS

## Arquitetura

- React + Express em host compatível.
- Supabase para autenticação, snapshot e cofre privado.
- Funcionamento local-first durante quedas de rede.
- SDE e Planner recalculados; suas saídas não são persistidas como verdade.

## Preparação do Supabase

1. Crie ou reutilize o projeto Supabase.
2. Execute `supabase/001_online_foundation.sql` no SQL Editor.
3. Mantenha login por e-mail e senha.
4. Desative novos cadastros públicos para o deploy privado.
5. Crie ou convide somente a conta autorizada pelo painel administrativo.
6. Copie Project URL e chave anon/publishable para o host.
7. Nunca use `service_role` no navegador.

O script cria RLS na tabela `user_snapshots`, função de escrita com revisão otimista, bucket privado e políticas limitadas à pasta do usuário autenticado.

## Variáveis de produção

```env
AUTH_MODE=required
AUTH_ALLOW_SELF_SIGNUP=false
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_ANON_KEY=SUA_CHAVE_ANON_OU_PUBLISHABLE
VITE_SUPABASE_SNAPSHOT_TABLE=user_snapshots
VITE_SUPABASE_PRIVATE_BUCKET=private-study-materials
GEMINI_API_KEY=SUA_CHAVE_REAL
GEMINI_MODEL=gemini-3.5-flash
```

A aplicação bloqueia a interface antes do login. Rotas de IA também exigem token válido. `optional` é promovido a `required` em produção para evitar publicação acidental aberta.

## Primeiro acesso

1. Abra o domínio e confirme a tela privada de login.
2. Entre com a conta previamente criada ou convidada.
3. Um dispositivo limpo restaura o snapshot remoto automaticamente.
4. Conflito só deve aparecer quando local e nuvem mudaram a partir da mesma base.

## Computador público

Ao terminar, use **Sair e limpar este dispositivo**. O aplicativo sincroniza antes de sair, preserva a nuvem e apaga o estado local do navegador. Feche todas as abas e não salve a senha.

## Materiais privados

- somente PDF;
- SHA-256 evita novo upload de conteúdo idêntico;
- envio direto ao bucket privado;
- abertura por URL assinada temporária;
- metadados seguros no snapshot;
- nenhum conteúdo integral em prompt de IA ou pacote distribuível.

## Limite atual

O produto permanece de usuário único. O estado local não é separado por conta dentro do mesmo perfil de navegador. Não convide outros usuários antes de uma decisão explícita de multiusuário.
