# Sprint P1.8–P1.9 — Fundação on-line e cofre privado

Data: 2026-07-13

## Objetivo

Preparar o ConcurseiroOS para uso individual on-line sem enfraquecer o funcionamento local, a privacidade dos materiais licenciados ou a rastreabilidade do SDE.

## Implementado

### 1. Autenticação individual

- Cliente Supabase opcional, ativado somente quando as variáveis de ambiente estão configuradas.
- Cadastro e entrada por e-mail e senha.
- Sessão persistida e renovada pelo SDK.
- Tela **Conta & Nuvem** com estado de conexão, erros e saída da conta.
- O aplicativo continua funcional em modo local quando a nuvem não está configurada.

### 2. Sincronização local-first

- Snapshot remoto baseado no backup seguro já existente.
- Saídas efêmeras do SDE continuam fora da persistência.
- Identidade de dispositivo local.
- Revisão remota monotônica.
- Escrita atômica no PostgreSQL por função `save_user_snapshot`.
- Detecção de conflito entre dispositivos.
- Nenhuma cópia é sobrescrita silenciosamente quando existe divergência.
- A interface oferece duas decisões explícitas em conflito: restaurar a nuvem ou substituir a nuvem pelo estado local.
- Sincronização automática com debounce, sem ciclo infinito após um sync bem-sucedido.

### 3. Cofre privado de PDFs

- Upload múltiplo de PDFs autenticados.
- Aceitação restrita a arquivos PDF não vazios.
- Sanitização do caminho do arquivo.
- Armazenamento sob a pasta do `user_id` autenticado.
- Bucket privado com políticas RLS para leitura, inserção, atualização e remoção.
- Abertura por URL assinada com validade de dez minutos.
- Remoção do arquivo e atualização do localizador na Biblioteca.
- Associação automática ao catálogo pré-indexado quando o nome do arquivo coincide.
- Material sem correspondência é cadastrado como item privado não classificado, sem conteúdo textual.

### 4. Proteção dos materiais licenciados

- PDFs não entram no repositório, no ZIP do aplicativo ou no snapshot JSON.
- Upload do cofre vai diretamente ao Storage; o conteúdo não passa pelo Coach ou pela Gemini.
- A Biblioteca deixou de ler PDF como texto e de enviar excertos ao organizador de IA.
- Busca de materiais privados é feita localmente; metadados privados não são enviados à busca semântica de IA.
- Rotas do servidor recusam explicitamente documentos classificados como `PRIVATE_LICENSED_USER_COPY`.
- O backup conserva metadados e localizadores, mas remove texto extraído e conteúdo incorporado.

### 5. Proteção da API Gemini

- Todas as rotas `/api/*`, exceto o health check registrado antes do middleware, passam por autenticação quando o Supabase está configurado.
- Em produção, o padrão é `AUTH_MODE=required`.
- O frontend envia o access token Supabase no cabeçalho Bearer.
- O backend valida o token no serviço de autenticação antes de consumir Gemini.
- Ausência, expiração ou invalidez da sessão retorna 401.
- Produção sem configuração de autenticação retorna 503 em vez de expor a chave Gemini.

### 6. Infraestrutura de implantação

- `.env.example` com separação entre variáveis de servidor e navegador.
- SQL idempotente em `supabase/001_online_foundation.sql`.
- `Dockerfile` multi-stage.
- `.dockerignore` excluindo chaves, PDFs, arquivos compactados e dependências locais.
- Servidor compatível com a variável `PORT` do host.
- Guia de implantação e checklist de produção.

### 7. Desempenho do frontend

- Telas carregadas sob demanda com `React.lazy`.
- Dependências principais divididas em chunks separados.
- Maior chunk final: aproximadamente 466 kB minificado.
- O aviso anterior de chunk acima de 500 kB foi eliminado.

## Validação técnica

- 16 arquivos de teste aprovados.
- 190/190 testes aprovados.
- TypeScript/lint aprovado.
- Build de produção aprovado.
- `npm audit --omit=dev`: 0 vulnerabilidades conhecidas no momento da execução.
- Nenhum PDF, ZIP, RAR ou DOCX privado no diretório distribuível.
- Nenhuma chave real encontrada no pacote.

## Limites da validação

Ainda não foi possível validar contra um projeto Supabase real porque não foram fornecidos URL e chave publishable/anon. Portanto, estão validados por testes e build:

- política de conflito;
- sanitização;
- composição do snapshot;
- estados da interface;
- integração TypeScript;
- segurança estrutural do servidor.

Permanecem para o smoke test real:

- execução do SQL no Supabase;
- cadastro e login reais;
- RLS entre dois usuários de teste;
- upload, listagem, URL assinada e exclusão reais;
- sincronização entre celular e computador;
- deploy no host escolhido.

## Próximo bloqueio legítimo

A próxima etapa exige um recurso externo pertencente ao usuário:

1. criar um projeto Supabase gratuito;
2. executar `supabase/001_online_foundation.sql`;
3. disponibilizar ou cadastrar no ambiente a Project URL e a chave publishable/anon;
4. selecionar o caminho de primeira implantação:
   - Google AI Studio/Cloud Run; ou
   - implantação Docker em outro host compatível.

A recomendação técnica permanece Google AI Studio/Cloud Run como primeira tentativa, mantendo o Dockerfile como rota de saída.
