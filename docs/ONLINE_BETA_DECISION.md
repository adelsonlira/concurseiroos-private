# Decisão de implantação da beta on-line

## Decisão técnica

A próxima validação deve ocorrer em uma beta privada on-line, e não apenas em uma execução local prolongada. Isso permite testar cedo autenticação, persistência, sincronização, celular, instalação PWA e comportamento do backend.

## Restrição do Google AI Studio

O projeto foi desenvolvido e auditado localmente. O fluxo oficial do Google AI Studio Build Mode não oferece, de forma geral, importação de um aplicativo local completo para dentro de um projeto Build existente. Portanto, não se deve presumir que o ZIP do ConcurseiroOS possa ser simplesmente enviado ao AI Studio e publicado sem adaptação.

## Caminho principal recomendado

- repositório GitHub privado;
- Vercel Hobby para a beta pessoal e não comercial;
- Supabase Free para autenticação, sincronização e arquivos privados;
- Gemini somente pelo backend;
- PDFs privados fora do repositório e do bundle.

## Caminho condicionado

O Google AI Studio poderá ser usado como publicador somente se a interface da conta do usuário mostrar um mecanismo funcional de importação do projeto completo ou se o projeto original ainda estiver suficientemente alinhado para receber as alterações. A disponibilidade do Starter Tier também precisa ser conferida na conta.
