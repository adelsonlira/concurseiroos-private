# Sprint 3.29.0 — Roteamento pedagógico seguro

## Objetivo

Impedir que o Super Coach apresente páginas ou questões de um subassunto irmão como se fossem material do alvo prescrito, mantendo todo fallback explícito, auditável e incapaz de alterar a estratégia.

## Implementado

- Roteamento por subassunto exato como regra principal.
- Fallback de assunto condicionado ao marcador humano `AUDITED_TOPIC_WIDE`; `TOPIC_ONLY` isolado não autoriza páginas.
- Questões diagnósticas limitadas a listas sem solução ou simulados.
- Questões comentadas e teoria excluídas como fonte da primeira tentativa.
- Bancos externos continuam como fonte executável quando não existe bateria local segura.
- Relatório `pedagogical-routing-report.json` para todos os 94 subassuntos.
- Correção auditada do PDF da Lei de Acesso à Informação, antes associado ao tópico LGPD.
- Plano e Progresso diferencia teoria exata, fallback amplo aprovado e localizador manual pendente.
- Dashboard e Sessão Guiada exibem aviso quando um fallback amplo for usado.
- Confirmações reais de login obrigatório, sincronização entre dispositivos e Gemini registradas com proveniência `USER_CONFIRMED_REAL_ENVIRONMENT_SMOKE`.

## Resultado do corpus pedagógico

- 94 subassuntos auditados.
- 57 com teoria local exata para a atividade.
- 0 fallbacks amplos ativos sem aprovação explícita.
- 37 exigem localizador teórico manual ou nova classificação.
- 52 possuem bateria diagnóstica local exata.
- 42 usam Qconcursos ou Estratégia Questões como fallback diagnóstico.
- 0 subassuntos sem fonte diagnóstica executável.
- 0 fallbacks entre subassuntos irmãos.

## Guardrails

- Ausência de localizador não é preenchida por similaridade ampla.
- Material privado não altera prioridade estratégica.
- Incidência histórica permanece em shadow mode.
- O relatório de runtime registra confirmação do usuário, não monitoramento contínuo.

## Validação final

- 392 testes aprovados em 66 arquivos.
- TypeScript aprovado.
- Builds web, Express e serverless aprovados.
- Auditoria de dependências de produção sem vulnerabilidades conhecidas.
- Smoke HTTP do pacote: aplicação, health, runtime-config e readiness com HTTP 200.
- Auditoria do SDE: 117 ações e 50 parâmetros.
- Incidência histórica permaneceu fora do ranking.
