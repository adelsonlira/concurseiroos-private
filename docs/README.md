# Documentação do ConcurseiroOS

A raiz do repositório mantém apenas os arquivos necessários para instalação, build e execução.

- `governance/`: constituição e regras permanentes do produto.
- `audits/`: auditorias de segurança, privacidade, evidências e prontidão.
- `history/`: relatórios históricos de sprints e hotfixes.
- Demais arquivos desta pasta: arquitetura, implantação, produção e UX.
- `ENV_SETUP.md`: criação e preenchimento do arquivo `.env` no modo local ou com Supabase.

Relatórios históricos não são carregados pela aplicação em produção e não contêm PDFs privados, credenciais ou materiais licenciados.

## Continuidade por IAs

A memória institucional e o protocolo de retomada ficam em [`../.ai/README.md`](../.ai/README.md). O pipeline exige sincronização entre versão, estado atual, histórico e relatório de sprint.
## Knowledge Engine FGV

- `FGV_OFFICIAL_CORPUS_QUALITY_3.12.0.md`: cobertura, exceções, deduplicação e bloqueios.
- `OFFICIAL_CORPUS_REVIEW_PROTOCOL.md`: ordem e critérios da curadoria humana.
- `IMPLEMENTATION_REPORT_3.12.0.md`: implementação das Sprints 3.11 e 3.12.

## Super Coach 3.21.0

- `IMPLEMENTATION_REPORT_3.21.0.md`: consolidação das Sprints 3.13 a 3.21.
- `GUIDED_LEARNING_PROTOCOL.md`: fechamento pedagógico e próxima ação.
- `CURATION_AND_SHADOW_GOVERNANCE.md`: revisão humana e isolamento histórico.
- `PRODUCT_READINESS_3.21.0.md`: interpretação da prontidão operacional.
- `VALIDATION_RESULTS_3.21.0.md`: testes, builds, segurança e smoke HTTP.
- `RELEASE_NOTES_3.21.0.md`: mudanças e compatibilidade da versão.

## Acesso privado e diagnóstico 3.25.0

- `IMPLEMENTATION_REPORT_3.25.0.md`: análise crítica e alterações adotadas.
- `PRIVATE_ACCESS_GUIDE.md`: configuração por convite, RLS e computador público.
- `VALIDATION_RESULTS_3.25.0.md`: testes, builds, segurança e smoke HTTP.
- `RELEASE_NOTES_3.25.0.md`: mudanças e compatibilidade.


## Compatibilidade de nuvem e rotina clara 3.26.0

- `IMPLEMENTATION_REPORT_3.26.0.md`: migração de snapshots, fonte diagnóstica e organização visual.
- `VALIDATION_RESULTS_3.26.0.md`: pipeline, builds, segurança e smoke HTTP.
- `RELEASE_NOTES_3.26.0.md`: compatibilidade e comportamento após atualização.

## Simulados com fontes identificadas 3.31.0

- `IMPLEMENTATION_REPORT_3.31.0.md`: arquitetura, integração e guardrails.
- `VALIDATION_RESULTS_3.31.0.md`: pipeline, builds, segurança e smoke HTTP.
- `RELEASE_NOTES_3.31.0.md`: mudanças e compatibilidade.
- `../.ai/decisions/ADR-028-evidence-gated-simulations.md`: decisão arquitetural.

## SDE v2 em calibração — 3.34.1

- `SDE_V2_SHADOW_CALIBRATION_3.34.1.md`: contrato do modo shadow, ledger e critérios futuros.
- `SDE_V1_V2_SHADOW_COMPARISON_EXAMPLE_3.34.1.md`: fotografia controlada da comparação.
- `../.ai/decisions/ADR-037-sde-v2-prospective-shadow-calibration.md`: decisão arquitetural.


## Disponibilidade e estudo opcional — 3.35.0

- `AVAILABILITY_AND_MIGRATION_3.35.0.md`: configuração canônica e migração conservadora.
- `OPTIONAL_STUDY_3.35.0.md`: contrato funcional do estudo voluntário.
- `OPTIONAL_STUDY_LEDGER_3.35.0.md`: eventos append-only e sincronização.
- `OPTIONAL_STUDY_UI_STATE_MATRIX_3.35.0.md`: estados da interface.
- `OPTIONAL_STUDY_EFFECT_MATRIX_3.35.0.md`: efeitos obrigatórios e opcionais.
- `OPTIONAL_STUDY_EXAMPLES_3.35.0.md`: exemplos auditáveis.

## Integridade do Estudo Opcional — 3.35.1

- `RELEASE_STATUS_3.35.0.md`: bloqueio de produção identificado na versão anterior.
- `OPTIONAL_STUDY_REAL_SHADOW_3.35.1.md`: proveniência real do SDE v2 e fallback.
- `OPTIONAL_STUDY_STRUCTURED_RESULTS_3.35.1.md`: contratos por método e contabilização de interrupções.
- `OPTIONAL_STUDY_SOURCE_BOARD_MATRIX_3.35.1.md`: derivação segura de origem e banca.
- `OPTIONAL_STUDY_EFFECT_MATRIX_3.35.1.md`: efeitos sobre tempo, progresso, mastery e evidências.
- `OPTIONAL_STUDY_EXAMPLES_3.35.1.md`: exemplos auditáveis.
- `../.ai/decisions/ADR-039-optional-study-real-shadow-and-result-integrity.md`: decisão arquitetural.


## Pipeline — 3.35.2

- `DETERMINISTIC_VALIDATION_TERMINATION_3.35.2.md`: causa-raiz, teardown HTTP e auditoria de encerramento natural.

## Prescrição executável — 3.35.3

- `RELEASE_STATUS_3.35.2.md`: limitação operacional da versão anterior.
- `STUDY_EXECUTION_REGISTRY_3.35.3.md`: capacidades de notebook, fontes, ambientes e captura.
- `EXECUTION_READINESS_GATE_3.35.3.md`: gate pós-ranking e fallback operacional.
- `STUDY_EXECUTION_PACKET_3.35.3.md`: contrato apresentado ao usuário.
- `STUDY_EXECUTION_PRODUCTION_SMOKE_3.35.3.md`: roteiro de domingo, segunda-feira e ambientes.
- `../.ai/decisions/ADR-041-execution-readiness-gate.md`: decisão arquitetural.
