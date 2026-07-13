# Implantação da beta privada — GitHub + Vercel + Supabase

## Premissas

- Repositório GitHub **privado**.
- O arquivo `.env` nunca é versionado.
- Os PDFs privados não entram no repositório.
- O Supabase permanece com RLS e bucket privado.

## Variáveis necessárias na Vercel

- `AUTH_MODE=required`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_SNAPSHOT_TABLE=user_snapshots`
- `VITE_SUPABASE_PRIVATE_BUCKET=private-study-materials`
- `GEMINI_API_KEY` pode permanecer ausente na primeira publicação.

Cadastre as variáveis para **Production**, **Preview** e **Development**. Toda alteração exige novo deploy.

## Segurança

Nunca cadastre `service_role`, `sb_secret_...`, senha do banco ou JWT secret no frontend.
