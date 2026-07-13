# Checklist de produção

## Obrigatório antes da publicação

- Executar `supabase/001_online_foundation.sql`.
- Configurar `AUTH_MODE=required`.
- Configurar `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- Configurar `GEMINI_API_KEY` somente no backend.
- Manter o bucket `private-study-materials` como privado.
- Criar a conta individual pelo menu **Conta & Nuvem**.
- Testar login, sincronização, conflito e abertura de PDF com URL temporária.

## Validação técnica

```bash
npm ci
npm run test:run
npm run lint
npm run build
```

## Teste de isolamento

1. Criar dois usuários de teste.
2. Enviar um PDF com o usuário A.
3. Confirmar que o usuário B não lista nem abre o objeto do usuário A.
4. Confirmar que uma requisição sem token recebe HTTP 401 nas rotas de IA.
5. Confirmar que o ZIP/repositório não contém PDF privado nem chave de ambiente.

## Publicação futura para terceiros

Antes de tornar o produto público:

- remover o catálogo individual de materiais;
- apagar os objetos privados da conta de desenvolvimento;
- criar onboarding para cada usuário conectar os próprios materiais;
- revisar licença, termos, privacidade e limites de cota;
- manter o SDE independente do conteúdo licenciado.
