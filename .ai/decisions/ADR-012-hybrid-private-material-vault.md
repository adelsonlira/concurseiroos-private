# ADR-012 — Cofre híbrido de materiais privados

## Contexto

O ConcurseiroOS precisa abrir o PDF prescrito na página correta, inclusive fora do dispositivo principal. A versão 3.6.1 introduziu vínculo local seguro, mas o projeto já possuía um bucket privado Supabase. Manter os dois fluxos separados aumentava confusão e impedia mobilidade.

## Decisão

Adotar acesso híbrido:

1. cópia local opcional, vinculada somente ao navegador;
2. cópia em bucket privado Supabase, acessível por usuário autenticado;
3. abertura remota somente por URL assinada temporária;
4. conteúdo do PDF não é enviado ao Coach nem ao Gemini;
5. indexação ocorre localmente no navegador e persiste somente metadados derivados;
6. materiais adicionados pelo usuário podem compor o catálogo pedagógico após classificação em disciplina e assunto.

## Consequências positivas

- acesso em múltiplos dispositivos;
- continuidade offline quando houver cópia local;
- menor fricção entre prescrição e material;
- novos PDFs podem entrar no roteamento sem alterar o edital;
- conteúdo licenciado não entra em backups nem prompts de IA.

## Consequências negativas

- armazenamento em nuvem depende de login e configuração correta de RLS;
- indexação automática por sumário pode exigir revisão humana;
- PDFs sem sumário útil podem produzir apenas um localizador amplo;
- o worker do PDF aumenta o tamanho do bundle sob demanda.
