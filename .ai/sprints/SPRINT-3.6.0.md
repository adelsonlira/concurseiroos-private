# Sprint 3.6.0 — Coach guiado e diagnóstico de serviços

## Objetivo

Eliminar a necessidade de o candidato inventar perguntas de estudo e tornar Gemini, Supabase e login diagnosticáveis em execução remota.

## Entregas

- perguntas-guia, pontos de atenção e critérios de conclusão;
- integração do guia ao Dashboard, Sessão Guiada e Tutor;
- configuração Supabase em runtime;
- teste real do Gemini;
- login condicionado à detecção correta do Supabase;
- governança do importador de edital e da biblioteca;
- auditoria das treze telas;
- documentação local/remota do `.env`.

## Validação

- 283 testes em 37 arquivos;
- TypeScript, frontend, Express e serverless aprovados;
- aplicação e endpoint de saúde retornando HTTP 200;
- configuração runtime validada nos estados configurado e não configurado;
- ausência de chave Gemini retornando HTTP 503;
- `AUTH_MODE=required` bloqueando chamada anônima com HTTP 401;
- endpoints públicos sem exposição da chave Gemini;
- zero vulnerabilidades conhecidas em dependências de produção;
- memória institucional atualizada.

## Limitações

- o corpus histórico FGV ainda não influencia o ranking;
- os sinais de prova usados no guia são descritivos;
- não existe integração direta com contas Qconcursos/Estratégia;
- componentes legados grandes continuam pendentes de decomposição.
