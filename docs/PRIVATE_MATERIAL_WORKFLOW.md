# Fluxo de materiais privados

## Adicionar uma aula nova

1. Entre em **Biblioteca Inteligente**.
2. Clique em **Adicionar material**.
3. Selecione o PDF.
4. Aguarde a indexação local do sumário.
5. Revise disciplina e assunto.
6. Escolha **Cofre Supabase** para acesso em outros dispositivos ou **Somente local**.
7. Salve.

O índice passa a fazer parte do snapshot sincronizado. O arquivo, quando enviado ao cofre, permanece no bucket privado do usuário.

## Abertir durante a sessão

- Se houver cópia no Supabase e login ativo, o botão abre a nuvem na página prescrita.
- Caso contrário, usa ou vincula a cópia local.
- O botão **Enviar ao cofre** fica disponível na própria prescrição para usuários autenticados.

## Privacidade

O sistema não armazena texto integral do PDF no snapshot. Somente metadados derivados são sincronizados: hash, total de páginas, títulos e intervalos do índice, disciplina, assunto e localizador de armazenamento.
