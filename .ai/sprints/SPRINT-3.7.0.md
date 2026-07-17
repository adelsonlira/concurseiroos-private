# Sprint 3.7.0 — Cofre híbrido, indexação incremental e questões-guia objetivas

Data: 2026-07-16

## Objetivo

Unificar acesso local e Supabase para materiais privados, permitir inclusão incremental de novas aulas e tornar o guia pré-estudo mais próximo da forma de cobrança da FGV.

## Implementado

- Prescrição abre primeiro a cópia no cofre Supabase quando disponível e autenticada.
- URL assinada recebe a página prescrita; cópia local permanece como fallback.
- Botão contextual envia o PDF indicado ao cofre sem sair da sessão.
- Biblioteca indexa PDFs localmente, detectando total de páginas e entradas de sumário.
- Somente títulos e intervalos de páginas derivados podem ser enviados ao organizador para classificação; o PDF integral não é enviado ao Gemini.
- Usuário escolhe armazenamento no cofre ou somente local.
- Índice, hash, disciplina e assunto são sincronizados como metadados no snapshot.
- Materiais novos classificados passam a compor o catálogo pedagógico complementar do concurso ativo.
- Guias de teoria e revisão agora geram entre 5 e 8 questões objetivas em estilo de prova, com foco e limites de evidência explícitos.
- Tela de conta explica exatamente o que o Supabase armazena.

## Governança

- Material do usuário não cria nem altera item de edital.
- Material privado não altera a prioridade estratégica do SDE.
- Sinais de uma prova de referência não são apresentados como frequência histórica.
- Conteúdo integral, texto por página e marca d'água não entram no snapshot.

## Validado

- Testes de indexação, catálogo dinâmico, privacidade e guia objetivo.
- TypeScript, suíte completa e builds web/Express/serverless.
- Bundle do indexador carregado sob demanda com worker próprio.
