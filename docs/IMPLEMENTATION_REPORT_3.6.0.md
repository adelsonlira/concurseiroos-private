# Relatório de implementação — ConcurseiroOS 3.6.0

## Objetivo da sprint

Tornar a teoria realmente guiada pelo coach, diagnosticar Gemini/Supabase em ambiente remoto e revisar a experiência completa com foco em aprovação.

## Implementado

- `StudyFocusGuide`: perguntas de ativação, atenção e critérios de conclusão definidos pelo coach.
- Modo de primeiro contato, remediação e reativação.
- Uso conservador de sinais de uma prova oficial de referência, sem alegar frequência histórica ampla.
- Integração do guia no Dashboard, Sessão Guiada e contexto do Tutor.
- Roteiro de teoria reescrito para responder perguntas antes e depois da leitura.
- Endpoint público `/api/runtime-config` para configuração Supabase de servidor.
- Endpoint autenticável `/api/ai-health` para teste real do Gemini.
- Tela de conta com diagnóstico de Supabase, Gemini, origem da configuração e `AUTH_MODE`.
- Login restaurado quando o Supabase é detectado em runtime.
- Importador de edital impedido de estimar prioridade e incidência.
- Biblioteca impedida de alterar o edital a partir de sugestão automática de material.
- Guias operacionais adicionados às telas administrativas ou secundárias.
- Navegação renomeada em linguagem orientada à tarefa.
- Auditoria detalhada das treze telas principais.

## Governança

- Sinais observados em prova de referência orientam atenção, mas não alteram ranking.
- O Gemini não decide prioridade, duração ou material.
- A API nunca expõe `GEMINI_API_KEY` ao frontend.
- A chave anon do Supabase pode ser pública; segurança exige RLS.
- Materiais privados não são enviados ao Gemini.

## Validação final

- 283 testes aprovados em 37 arquivos.
- TypeScript aprovado.
- build web, Express e serverless aprovados.
- aplicação compilada retornando HTTP 200.
- `/api/health` retornando HTTP 200.
- `/api/runtime-config` retornando configuração ausente e presente de forma coerente.
- `/api/ai-health` retornando HTTP 503 quando a chave não existe.
- com `AUTH_MODE=required`, `/api/ai-health` retornando HTTP 401 sem sessão.
- nenhuma chave do Gemini exposta pelo endpoint público.
- zero vulnerabilidades conhecidas nas dependências de produção.

## Limitação de validação externa

Uma chamada bem-sucedida à infraestrutura do Google não foi executada porque nenhuma chave real foi colocada no ambiente de auditoria. O fluxo, o modelo configurado, a ausência de segredo, o comportamento sem chave e a proteção por autenticação foram validados. A tela **Conta e sincronização** possui o comando **Testar conexão real** para verificar chave, cota, modelo e conectividade no ambiente do usuário.
