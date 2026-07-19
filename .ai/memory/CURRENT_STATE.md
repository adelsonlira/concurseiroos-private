# Estado Atual

Data: 2026-07-19
Versão: 3.34.1

## Projeto

ConcurseiroOS — alvo ativo: DATAPREV 2026, Analista de Tecnologia da Informação, Perfil 3 — Desenvolvimento de Software.

## Fase atual

A versão 3.34.1 mantém o SDE v1 como única decisão efetiva e executa o SDE v2 em paralelo para calibração prospectiva. O produto continua usando Hoje — Seu Coach, Sessão guiada e Registrar resultado; nenhuma tela, prescrição ou plano paralelo foi criado.

## Implementado

- `activeSdeVersion = v1` como configuração segura e fallback para snapshots antigos;
- SDE v2 executado sobre a mesma fotografia de dados com `executionMode = shadow`;
- `affectsPrescription = false` em toda comparação shadow;
- comparação de disciplina, assunto, subassunto, método, duração, critério de avanço, pré-requisito e score;
- `sdeCalibrationLedger` append-only com fingerprints objetivos;
- deduplicação de reload sem mudança de inputs;
- registro de igualdade, divergência, fallback, evidências e incidência histórica shadow;
- backup, restauração e sincronização aditivamente compatíveis;
- interface com uma única prescrição e auditoria secundária recolhida.

## Validado

- regressão completa, TypeScript e auditorias institucionais;
- builds web, Express e serverless;
- smoke HTTP compilado e smoke serverless funcional;
- SDE v1 confirmado como prescrição efetiva;
- SDE v2 confirmado em paralelo sem efeito prescritivo;
- incidência histórica mantida com peso zero;
- `npm audit` sem vulnerabilidades.

## Preservado

Adaptador de evidências, pesos, grafo, score do SDE v2, SDE v1, dados do usuário, ledger externo, corpus FGV, Treino FGV, Diagnóstico Piloto, simulados, autenticação, backup e sincronização. Nenhuma evidência foi duplicada ou convertida em tentativa sintética.

## Problemas conhecidos

- a calibração ainda não possui série prospectiva suficiente com resultados reais de sessão;
- não há promoção automática do SDE v2;
- participações internas neutras e 20 relações aprovadas permanecem como na 3.34.0;
- incidência histórica permanece sem peso decisório;
- merge multi-dispositivo dos ledgers ainda usa reconciliação integral;
- nenhum sistema garante aprovação.

## Próxima tarefa

Publicar a v3.34.1 e observar comparações v1 × v2, fallbacks e resultados reais de sessão sem alterar pesos, grafo ou prescrição efetiva.
