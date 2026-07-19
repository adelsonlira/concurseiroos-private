# Strategic Decision Engine — SDE

## Estado

O SDE é um priorizador constitucional heurístico, conservador, puro, determinístico e auditável. Não é um modelo calibrado de probabilidade de aprovação.

## Responsabilidades

- gerar ações estratégicas elegíveis;
- aplicar restrições constitucionais e cognitivas;
- considerar risco eliminatório por disciplina e custo de oportunidade quando calculável;
- ordenar ações de forma determinística;
- produzir breakdown recomponível, explicação e dados ausentes;
- alimentar planner e prescrição sem depender da interface.

## Contratos de segurança

- toda entrada por assunto declara origem do peso e da incidência;
- incidência `UNAVAILABLE` vale zero no score e na camada constitucional;
- nenhuma rota cognitiva pode bloquear simultaneamente teoria e prática sem alternativa de recuperação;
- score final deve ser finito, não negativo e recomponível;
- empates usam ID determinístico e são informados como empate operacional;
- parâmetros numéricos possuem catálogo, natureza e estado de validação;
- mudanças no ranking exigem testes de propriedades e cenários de regressão.

## Não responsabilidades

- escolher arquivo ou página de material privado;
- conversar com o usuário;
- fabricar incidência histórica;
- inferir domínio sem evidência;
- prometer ganho de pontos ou aprovação;
- ativar risco global sem política validada.

## Validação pendente

- calibração prospectiva dos pesos heurísticos;
- matriz histórica FGV validada no nível da questão;
- retorno marginal em pontos/hora;
- pré-requisitos completos;
- risco eliminatório global;
- revisão de cenários dourados por especialista.


## Limite da recuperação de erros

O contrato de correção de erros é pedagógico e operacional. Ele não adiciona peso, bônus, incidência ou probabilidade ao ranking do SDE. Duas verificações independentes indicam estabilização provisória, não domínio permanente.

## SDE v2 — versão 3.34.0

O SDE v2 adiciona adaptador unificado de evidências, estados de conhecimento, pesos hierárquicos, grafo versionado, regras duras, score configurado, seleção explícita do método e ledger append-only de decisões. `activeSdeVersion = v2` só é respeitado quando configuração, grafo, score, tempo, material e prescrição passam nos portões; caso contrário, o SDE v1 é usado e o motivo é registrado.

Novos eventos objetivos validados do `externalEvidenceLedger` podem ser consumidos sem expansão sintética. Observações livres, eventos anulados/substituídos, Treino FGV e Diagnóstico Piloto não alteram o score. Incidência histórica permanece com `decisionWeight = 0`.
