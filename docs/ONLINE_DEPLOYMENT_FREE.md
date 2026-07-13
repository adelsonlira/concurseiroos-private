# Implantação on-line gratuita — ConcurseiroOS

## Arquitetura adotada

- Aplicação React + Express publicada no Google AI Studio/Cloud Run ou em outro host compatível.
- Supabase para autenticação, snapshot sincronizado e cofre privado de PDFs.
- Funcionamento local-first: o navegador continua sendo a fonte operacional durante quedas de conexão.
- O SDE e o Planner são recalculados; suas saídas não são gravadas como verdade persistente.

## Preparação do Supabase

1. Crie um projeto Supabase.
2. No SQL Editor, execute `supabase/001_online_foundation.sql`.
3. Em Authentication, mantenha login por e-mail e senha.
4. Copie a Project URL e a chave `anon`/publishable para as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
5. Nunca use `service_role` no navegador.

O script cria:

- tabela `user_snapshots` com Row Level Security;
- função atômica de sincronização com controle de revisão;
- bucket privado `private-study-materials`;
- políticas que limitam cada arquivo ao diretório do usuário autenticado.

## Variáveis de ambiente

Copie `.env.example` para `.env` no desenvolvimento local, pois o servidor usa `dotenv.config()` sem caminho alternativo. Em produção, cadastre as mesmas variáveis no painel do publicador.

A chave Gemini deve existir somente no backend. As variáveis iniciadas por `VITE_` entram no bundle do navegador e não podem conter segredo. Configure também `AUTH_MODE=required`, `SUPABASE_URL` e `SUPABASE_ANON_KEY` no processo Node para que todas as rotas de IA validem o token do usuário antes de consumir a API.

## Primeiro acesso

1. Abra **Conta & Nuvem**.
2. Crie a conta individual.
3. Entre com e-mail e senha.
4. A primeira sincronização cria o snapshot remoto a partir do estado local.
5. Em outro dispositivo, ao entrar, o aplicativo exige escolha explícita caso existam dados locais e remotos diferentes.

## Materiais privados

- O upload aceita somente PDF.
- As rotas de IA exigem um token Supabase válido em produção; a URL pública do app não libera o consumo anônimo da chave Gemini.
- O arquivo é enviado diretamente ao bucket privado, não ao Coach ou à Gemini.
- A abertura usa URL assinada com validade de dez minutos.
- O pacote do aplicativo contém apenas metadados derivados; os PDFs permanecem fora do repositório e do ZIP distribuível.
- Antes de uma futura versão pública, remova os objetos do bucket individual e gere o build sem o catálogo privado.

## Hosts compatíveis

O projeto pode ser publicado no Google AI Studio quando o ambiente full-stack estiver disponível para a conta. O mesmo pacote também é compatível com um serviço Node gratuito ou de cota gratuita que execute `npm run build` e `npm start`.

A camada Supabase é independente do host. Isso reduz o custo de migração caso a cota ou política do publicador mude.
