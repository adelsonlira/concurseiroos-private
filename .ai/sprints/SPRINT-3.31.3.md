# Sprint 3.31.3 — Diagnóstico piloto FGV-DATAPREV isolado

**Data:** 2026-07-18  
**Linha de base:** 3.31.2  
**Tipo:** incremento experimental controlado

## Ordem da Control Tower

Integrar `diag-fgv-dataprev-bd-v1`, versão 1, com 24 questões fixas e duração sugerida de 50 minutos, sem alterar banco operacional, SDE, mastery, prioridades, sessões planejadas, simulados oficiais ou incidência histórica.

## Implementado

- Tela própria `Diagnóstico piloto` no menu diário.
- Catálogo público sanitizado com 24 questões e seis assets relativos.
- Gabarito e rastreabilidade fonte mantidos somente no backend.
- Fluxo de início, resposta, marcação para revisão, navegação, retomada, cancelamento e finalização explícita.
- Bloqueio de segunda tentativa enquanto outra estiver ativa.
- Persistência local exclusiva e append-only para resultados finalizados.
- Resultado total, tempo, brancos, correção operacional e agregação por `selection_area`.
- Seção secundária `Cobertura principal e complementar`, sem ajuste da nota pelas quatro aderências parciais.
- Marcador obrigatório `affectsSde: false`.
- Auditorias do catálogo e dos seis assets emitidos no build.

## Guardrails preservados

- Nenhuma coleção do store principal recebeu tentativas diagnósticas.
- Nenhum resultado cria tentativa de questão, evidência guiada, domínio, revisão, sessão ou simulado.
- O banco operacional não foi alterado.
- O SDE e seus parâmetros não foram modificados.
- Materiais privados, Gemini e incidência histórica permanecem sem poder estratégico.
- Não foram implementados explicações por IA, plano automático ou segundo diagnóstico.

## Validação

- 436 testes em 74 arquivos.
- 17 testes novos focados no diagnóstico.
- TypeScript aprovado.
- Auditoria do pacote piloto aprovada: 24 questões, 6 assets, controles 14 e 53 e zero caminhos absolutos.
- Builds web, Express e serverless devem ser aprovados no pacote final.
