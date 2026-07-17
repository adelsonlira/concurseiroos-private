# ConcurseiroOS 3.7.0 — Cofre híbrido e materiais incrementais

## Supabase

O Supabase possui três responsabilidades:

1. autenticação e recuperação de conta;
2. snapshot privado do estado do usuário;
3. bucket privado de PDFs, com acesso por URL temporária.

A prescrição agora consulta o catálogo sincronizado. Quando o PDF correspondente existe no bucket do usuário, ele é aberto diretamente na página indicada. A cópia local permanece disponível como alternativa.

## Inclusão de novos materiais

Na Biblioteca Inteligente, o usuário seleciona um PDF e escolhe:

- Cofre Supabase: acesso em todos os dispositivos autenticados;
- Somente local: sem upload.

O navegador extrai localmente total de páginas e entradas do sumário. O sistema guarda hash, títulos, faixas de páginas e classificação pedagógica. O PDF integral não é enviado ao Gemini. Opcionalmente, apenas o sumário derivado pode ser usado para sugerir disciplina e assunto.

Materiais novos, depois de classificados, entram como fonte complementar do concurso ativo. Eles podem ser prescritos quando não houver opção oficial melhor mapeada.

## Questões-guia

Cada sessão de teoria ou revisão recebe de 5 a 8 perguntas objetivas, desenhadas para orientar leitura, comparação de conceitos, cenários, condições, exceções e armadilhas. Quando existe sinal oficial de referência, ele é incorporado com fonte e limitação explícitas.
