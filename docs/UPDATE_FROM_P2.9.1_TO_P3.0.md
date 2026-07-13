# Atualização local — P2.9.1 para P3.0

1. Pare o servidor com `Ctrl+C`.
2. Faça uma cópia do arquivo `.env` atual fora da pasta do projeto.
3. Substitua os arquivos do projeto pelos arquivos da versão P3.0.
4. Recoloque o `.env` na raiz do projeto.
5. Execute `npm ci`.
6. Execute `npm run dev`.
7. Abra `http://localhost:3000` e use `Ctrl+K` para testar a busca.

A atualização não modifica o banco Supabase nem as políticas RLS. O snapshot remoto permanece associado ao usuário autenticado.
