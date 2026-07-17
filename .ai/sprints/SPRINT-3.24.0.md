# Sprint 3.24.0 — Deduplicação do cofre e segurança estratégica contra zero

## Objetivo

Corrigir o reenvio de PDFs privados idênticos e tornar operacional a regra eliminatória de não zerar disciplina, sem inventar incidência histórica nem declarar otimização probabilística inexistente.

## Implementado

- SHA-256 calculado localmente antes do upload ao cofre.
- Rejeição de conteúdo idêntico mesmo com nome diferente.
- Caminho content-addressed para novos objetos privados.
- Fallback conservador por nome normalizado e tamanho para objetos legados sem hash.
- Resultado de upload distingue armazenados, duplicados, rejeitados e falhas.
- Biblioteca reaproveita o vínculo existente quando uma duplicata é detectada.
- Metadados do cofre expõem hash quando o objeto usa o novo formato.
- Estado de segurança por disciplina: sem avaliação, sem acerto, evidência mínima ou protegida.
- Frente constitucional de uma ação por disciplina insegura antes da concentração por score.
- XAI informa que a ação protege contra o risco de zero e expõe amostra e acertos.
- Auditoria decisória valida a frente de segurança e preserva a ordenação normal fora dela.

## Não implementado

- limpeza automática das duplicatas históricas;
- incidência histórica no ranking;
- estimativa causal de pontos por hora;
- probabilidade de aprovação;
- exclusão automática de assunto do edital por suposta baixa cobrança.

## Segurança decisória

A nova frente é uma restrição oficial de elegibilidade, não um sinal histórico. Depois da cobertura mínima, o score volta a concentrar esforço conforme pesos oficiais, diagnóstico individual, esquecimento, alavancagem e custo de oportunidade relativo. Toda matriz FGV continua em shadow mode.

## Validação

- testes de hash, caminho determinístico, conteúdo renomeado e fallback legado;
- teste de integração confirmando uma ação inicial para cada disciplina DATAPREV;
- teste matemático da camada `RISCO_ELIMINACAO` para disciplina sem evidência;
- memória, corpus, catálogos, auditoria do SDE, TypeScript, testes, builds, segurança e smoke HTTP.
