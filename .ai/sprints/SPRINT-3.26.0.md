# Sprint 3.26.0 — Compatibilidade de nuvem e rotina diagnóstica clara

## Objetivo

Restaurar snapshots antigos sem perda, eliminar ambiguidade sobre a origem e o uso das questões diagnósticas, tornar a sequência entre diagnóstico, teoria, prática e revisão autoexplicativa e corrigir a prontidão reportada pelo servidor conforme o ambiente efetivo.

## Implementado

- preparação transacional de backups com migração aditiva segura;
- compatibilidade para snapshots anteriores a `evidenciasAprendizagemGuiada`;
- verificação do checksum original antes da migração;
- recálculo do checksum após atualização de schema;
- sincronização baseada no fingerprint do estado efetivamente importado;
- mensagem explícita de restauração e migração segura;
- roteamento diagnóstico priorizando lista de questões sem comentários;
- fallback para Qconcursos ou Estratégia Questões quando a fonte local expõe solução prematuramente;
- plano pós-diagnóstico com consequência de aprovação e teoria exata em caso de insuficiência;
- instruções operacionais sem jargão para seleção, tentativa, correção e nova tentativa;
- distinção visual entre fonte das questões, material de correção e teoria;
- explicação de que o diagnóstico não representa toda a rotina do assunto;
- disciplinas do cofre recolhidas por padrão;
- prontidão de runtime ajustada à configuração efetiva do servidor;
- testes de migração, integridade, roteamento de material, banco externo, prescrição, runtime e governança visual.

## Não implementado

- geração de questões objetivas pela IA;
- abertura do corpus FGV não curado como banco operacional;
- ativação de incidência histórica;
- mesclagem automática de conflitos verdadeiros entre snapshots concorrentes;
- declaração de domínio pelo diagnóstico;
- exclusão automática de duplicatas antigas no cofre.

## Segurança decisória

A migração somente cria uma lista vazia para uma funcionalidade inexistente no snapshot antigo. Nenhuma evidência de aprendizagem é inferida. O diagnóstico continua exigindo amostra mínima, desempenho, ausência de consulta, ausência de branco e acertos seguros. Questões comentadas não são tratadas como fonte primária quando podem revelar a resposta antes da tentativa.

## Validação prevista

- memória, corpus, catálogos, taxonomia, curadoria, classificação e auditoria SDE;
- TypeScript e suíte integral;
- snapshot antigo sem evidência guiada;
- rejeição de snapshot corrompido mesmo quando seria migrável;
- seleção de `QUESTION_LIST` para diagnóstico;
- fallback externo diante de conteúdo comentado;
- prontidão coerente com variáveis carregadas;
- builds web, Express e serverless;
- segurança de dependências e smoke HTTP.
