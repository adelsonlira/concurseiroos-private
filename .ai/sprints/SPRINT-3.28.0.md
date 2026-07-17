# Sprint 3.28.0 — Capacidade viável até a prova

## Objetivo

Expor a pressão real do calendário até a DATAPREV sem criar promessa, cronograma rígido ou incidência histórica não validada.

## Implementado

- Novo núcleo puro `examHorizon` para calcular capacidade restante até o dia anterior à prova.
- Projeção baseada exclusivamente na disponibilidade configurada, exceções de calendário e sessões já registradas.
- Contagem de dias ativos, horas restantes, subassuntos sem evidência e minutos disponíveis por item ainda não medido.
- Participação oficial em pontos por disciplina apresentada de forma descritiva.
- Estado de segurança por disciplina conforme presença ou ausência de evidência objetiva.
- Painel integrado a `Plano e Progresso`, preservando o SDE diário como decisão soberana.
- Alertas explícitos quando não há disponibilidade ou disciplinas continuam sem evidência mínima.

## Guardrails

- Ausência de evidência não é tratada como baixo desempenho.
- Minutos por subassunto não são apresentados como tempo para dominar conteúdo.
- A projeção não distribui horas por assunto, não prevê aprovação e não ativa incidência histórica.
- Material privado e IA permanecem fora do cálculo estratégico.

## Validação

- Testes para capacidade, desconto de sessão registrada, segurança por disciplina e ausência de disponibilidade.
- Pipeline completo, TypeScript, builds e auditorias executados no fechamento.
