# ADR-028 — Simulados com composição oficial e fonte identificada

Status: aceito  
Data: 2026-07-17

## Contexto

O simulador legado selecionava questões com `Math.random()`, aceitava fallback para qualquer item disponível e não exigia documento de origem ou gabarito identificado. Isso contrariava a rastreabilidade, podia incluir questão customizada e não reproduzia necessariamente a composição oficial da DATAPREV.

## Decisão

- todo novo simulado usa blueprint derivado do pacote oficial do concurso;
- o simulado completo reproduz 70 questões, 240 minutos e 115 pontos;
- o parcial preserva a cota oficial inteira das disciplinas selecionadas e calcula tempo proporcional, arredondado para cima;
- cada simulado registra fonte identificada, versão do blueprint e política aplicada;
- fonte local só é elegível quando cada questão possui documento de origem, gabarito oficial e não é customizada;
- fontes externas produzem plano de filtros e quantidade, sem copiar conteúdo nem fabricar IDs de questões;
- acertos, erros, brancos e tempo são registrados por disciplina;
- a análise aplica pontuação oficial, risco de zero e corte global apenas no simulado completo;
- o plano automático de correção organiza este episódio, mas não cria cronograma paralelo nem altera diretamente o SDE;
- resultado agregado por disciplina não cria evidência temática. O SDE só recebe tentativas quando o subassunto real é identificado.

## Consequências

- o fluxo deixa de gerar seleção aleatória e fallback inseguro;
- simulados externos podem ser executados imediatamente com Qconcursos ou Estratégia Questões;
- comparação entre simulados exige mesmo tipo e mesma composição;
- a análise é descritiva e não estima aprovação, causalidade ou incidência histórica;
- backups antigos permanecem legíveis por campos opcionais retrocompatíveis.
