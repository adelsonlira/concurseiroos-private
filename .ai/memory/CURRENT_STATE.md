# Estado Atual

Data: 2026-07-19
Versão: 3.34.0

## Projeto

ConcurseiroOS — alvo ativo: DATAPREV 2026, Analista de Tecnologia da Informação, Perfil 3 — Desenvolvimento de Software.

## Fase atual

A versão 3.34.0 ativa o SDE v2 como padrão quando seus portões são válidos e mantém o SDE v1 como fallback técnico. O produto continua usando Hoje — Seu Coach, Sessão guiada e Registrar resultado; nenhuma tela ou plano paralelo foi criado.

## Implementado

- adaptador unificado sem tentativas sintéticas;
- estados de conhecimento por subassunto;
- pesos hierárquicos com participação interna explícita;
- grafo versionado com 20 relações aprovadas;
- regras duras anteriores ao score;
- score 0–100 com coeficientes em arquivo;
- incidência histórica calculada em shadow mode com peso zero;
- escolha determinística do método e sequência executável;
- critério de avanço e plano reduzido;
- `sdeDecisionLedger` append-only;
- comparação automática v1 × v2 e fallback registrado;
- auditoria recolhida na tela do Coach;
- evidências objetivas novas do ledger elegíveis após validação determinística.

## Validado

- 584/584 testes em 87 arquivos;
- TypeScript e auditorias institucionais;
- builds web, Express e serverless;
- smoke HTTP compilado e smoke serverless funcional;
- grafo com 20 relações e zero ciclos obrigatórios;
- auditoria v2 com incidência histórica de peso zero e fallback seguro;
- `npm audit` com zero vulnerabilidades.

## Preservado

Dados do usuário, evidências antigas, corpus FGV, 301 assets, Treino FGV, Diagnóstico Piloto, simulados, autenticação, backup e sincronização. Registros antigos do ledger continuam shadow. Observações livres não são fatos decisórios.

## Problemas conhecidos

- apenas 20 relações de conhecimento estão aprovadas;
- participações internas ainda usam distribuição neutra quando não há estimativa validada;
- incidência histórica permanece sem peso decisório;
- merge multi-dispositivo do ledger ainda usa reconciliação integral;
- o SDE v2 ainda precisa de calibração prospectiva de coeficientes;
- nenhum sistema garante aprovação.

## Próxima tarefa

Publicar a v3.34.0, observar divergências v1 × v2 e fallbacks reais, sem alterar coeficientes até acumular evidência prospectiva suficiente.
