# ConcurseiroOS 3.2.0 — Coach Operacional

Data: 2026-07-15

## Objetivo

Transformar prioridade e planejamento em uma ordem de estudo executável, reduzindo a necessidade de o candidato interpretar vários dashboards antes de começar.

## Implementado

- correção do teste dependente do relógio real;
- preservação do veto a evidência futura;
- correção do contrato TypeScript de cobertura FGV;
- validação obrigatória antes do build e da Vercel;
- alinhamento dos tipos Node com o alvo de execução;
- `DailyStudyPrescription` no core;
- material, seção, páginas e banco de questões na prescrição;
- meta de questões baseada em ritmo observado, com fallback oficial declarado;
- protocolos de sessão com fases semânticas;
- rastreabilidade da prescrição em sessões e tentativas;
- recálculo após nova evidência;
- Dashboard orientado pela ação atual;
- Sessão Guiada orientada pela prescrição;
- cancelamento de sessão zerando o cronômetro;
- navegação principal reduzida;
- progresso de bateria prescrita e registro de questões contextualizado;
- registro de questões incorporado à Sessão Guiada;
- fila de revisões redesenhada com uma única ação em destaque;
- IA reduzida de doze personagens para Coach Estratégico, Tutor e Analista de Erros;
- prompts do backend alinhados aos três papéis e ao bloqueio de tendências FGV não validadas;
- memória de produto, Constituição e ADRs atualizados.

## Guardrails preservados

- nenhum dado histórico FGV não validado altera o ranking;
- nenhum material privado altera prioridade;
- nenhum conteúdo ou gabarito é fabricado;
- seleção manual permanece possível, mas é tratada como exceção;
- conclusão teórica exige confirmação explícita.

## Pendências

- contratos futuros para ações de IA com confirmação explícita;
- calibração dos parâmetros heurísticos;
- validação do corpus FGV;
- extração definitiva do pacote DATAPREV para arquitetura multi-concurso.
