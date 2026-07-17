# Arquitetura do ConcurseiroOS

## Fluxo principal

UI → Zustand/adaptadores → Core determinístico → persistência/backend → IA contextual

## Fronteiras

- `src/core`: regras puras, determinísticas e testáveis, incluindo composição e análise de simulados.
- `src/integrations`: tradução entre domínio da aplicação e o core.
- `src/store.ts`: estado e efeitos locais; não deve conter fórmulas estratégicas.
- `src/components`: apresentação e coleta explícita de evidência.
- `src/server`: autenticação, persistência remota e integração de IA.
- `src/config/concursos`: pacotes versionados e registro de concursos instalados.
- `.ai`: memória institucional validada pelo pipeline.

## Entidade central de produto

`DailyStudyPrescription` une ação SDE, sessão do planner, protocolo, material, páginas, meta de questões e evidência de conclusão.

## Restrições

- LLM não altera prioridade nem inventa evidência.
- Material privado não altera score.
- Toda prescrição executada deve guardar o identificador de origem.
- O build de produção deve bloquear erro TypeScript e teste quebrado.
- A versão não pode ser fechada com memória de sprint desatualizada.
- Plataformas externas executam baterias, mas não definem conteúdo, quantidade ou prioridade.

## Diagnósticos serverless

Endpoints públicos de configuração e probes operacionais devem falhar de forma controlada e permanecer independentes do boot completo da aplicação. SDKs externos e verificadores de autenticação são inicializados sob demanda. Configuração inválida não pode impedir o próprio endpoint de explicar o estado do runtime.

