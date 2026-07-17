# ConcurseiroOS 3.2.0 — Relatório de Implementação

Data: 15 de julho de 2026  
Responsabilidade: Chief Product Architect + Desenvolvimento

## Resultado executivo

O projeto foi transformado de um conjunto de dashboards e ferramentas em uma primeira versão de **coach operacional com ciclo fechado**.

O fluxo principal agora é:

1. observar edital, disponibilidade e evidências reais;
2. calcular a prioridade no SDE;
3. gerar uma Prescrição Diária Executável;
4. informar atividade, conteúdo, duração, material, seção, páginas e meta de questões;
5. conduzir a sessão;
6. registrar resultados no mesmo fluxo;
7. invalidar a decisão anterior e recalcular a próxima orientação.

## IMPLEMENTADO

### Estabilização técnica

- Corrigido o teste não determinístico que misturava o relógio real com uma data histórica simulada.
- Preservado o veto do SDE a evidência futura; o guardrail não foi enfraquecido para fazer o teste passar.
- Removido o campo obsoleto `candidateTopicMatchCounts` do adaptador de cobertura FGV.
- `npm run build` e `vercel-build` agora executam TypeScript e testes antes de produzir artefatos.
- Tipos do Node alinhados ao alvo declarado de Node 24.
- Cancelar uma sessão agora zera o cronômetro corretamente.

### Prescrição Diária Executável

Criado o núcleo `src/core/prescription/`, responsável por transformar a decisão e o planner em uma ordem de estudo operacional.

A prescrição contém:

- atividade;
- disciplina, assunto e subassunto;
- duração;
- justificativa e confiança;
- roteiro de execução por fases;
- material, seção e páginas;
- banco de questões, quando identificado;
- meta mínima e extensão opcional de questões;
- evidências que devem ser registradas ao concluir.

A meta de questões usa a mediana observada do próprio candidato quando há amostra mínima. Sem histórico suficiente, usa apenas a cadência bruta da prova oficial configurada, explicitamente marcada como baixa confiança.

### Dashboard e Sessão Guiada

- O Dashboard passou a destacar uma única ação: **Faça agora**.
- Informações técnicas e explicações foram retiradas do primeiro plano.
- A Sessão Guiada aplica automaticamente a prescrição.
- Seleção manual permanece disponível, mas como exceção recolhida.
- Sessões registram o identificador da prescrição, material, páginas, metas e contexto decisório.
- Após uma sessão ou questão, a decisão antiga é invalidada para impedir orientação obsoleta.

### Questões

- A prescrição calcula meta mínima e extensão opcional.
- O sistema acompanha progresso da bateria prescrita.
- Disciplina, assunto e subassunto ficam bloqueados durante o registro contextualizado.
- Cada tentativa é vinculada à prescrição de origem.
- O registro de questões foi incorporado à própria Sessão Guiada.
- Quando não existe questão publicável no banco interno, o sistema orienta o uso da fonte privada indicada e registra somente resultado e metadados, sem copiar o enunciado protegido.

### Revisões e erros

A tela foi reorganizada como fila de coaching:

- uma única revisão aparece como **Faça agora**;
- protocolo de recuperação em três passos;
- cronômetro;
- registro direto de “não recuperei”, “recuperei com esforço” ou “recuperei com fluência”;
- próximas revisões aparecem em sequência compacta;
- métricas, política, comparação de métodos, caderno de erros e agenda futura permanecem auditáveis, mas recolhidos.

### Navegação

O fluxo principal foi reduzido para destacar:

- Hoje — Seu Coach;
- Sessão Guiada;
- Revisões;
- Registrar Questões;
- Rota Estratégica e base documental.

Recursos avançados continuam disponíveis pela busca, sem ocupar o caminho diário.

### Coach IA

Os doze personagens foram substituídos por três papéis compatíveis com capacidades reais:

1. **Coach Estratégico** — explica a decisão do SDE.
2. **Tutor do Tópico Atual** — ensina o conteúdo prescrito sem alterar o plano.
3. **Analista de Erros** — organiza erros e recuperação sem inventar diagnóstico.

A IA recebe contexto granular e a decisão estruturada. Ela não possui permissão para:

- alterar prioridade;
- criar cronograma paralelo;
- registrar evidência;
- iniciar sessão autonomamente;
- afirmar tendências FGV sem corpus validado;
- alegar leitura do material privado.

Ações de navegação e execução continuam explícitas e controladas pela aplicação.

### Memória institucional

Atualizados ou criados:

- Constituição;
- visão de produto;
- arquitetura;
- documento do SDE;
- estado atual;
- próximos passos;
- questões abertas;
- ADR da Prescrição Diária;
- ADR de navegação coach-first;
- ADR dos três papéis de IA;
- documento de dados externos necessários;
- README e release 3.2.0.

## VALIDADO

- TypeScript: aprovado.
- Testes: **262 de 262**, em 31 arquivos.
- Frontend Vite: build aprovado.
- Servidor Express: build aprovado.
- Função serverless: build aprovado.
- Auditoria de dependências de produção: **0 vulnerabilidades conhecidas**.
- Smoke test HTTP:
  - `/`: HTTP 200;
  - `/api/health`: HTTP 200.
- Varredura de pacote:
  - nenhuma chave de API detectada;
  - nenhum `.env` real;
  - nenhuma chave privada;
  - nenhuma referência ao registro interno usado no ambiente de desenvolvimento.

### Observação de ambiente

A validação foi executada no ambiente disponível com Node 22.16.0, enquanto o projeto declara Node 24.x. O código e os testes passaram, mas implantação e desenvolvimento devem usar Node 24 para respeitar o contrato oficial do projeto.

Não foi possível concluir uma inspeção visual automatizada completa em navegador headless neste ambiente. A validação realizada cobre TypeScript, testes, builds, artefatos e respostas HTTP; a inspeção visual final em navegador real continua recomendada.

## DADOS EXTERNOS NECESSÁRIOS

A versão entregue não depende de novos documentos para funcionar como coach operacional. Os documentos abaixo são necessários para a próxima etapa: **ativar tendências históricas da FGV com segurança**.

### Prioridade máxima

1. Caderno completo e oficial de cada prova FGV comparável a cargos de desenvolvimento, análise de sistemas, engenharia de software, dados, segurança, governança e infraestrutura de TI.
2. Gabarito definitivo correspondente exatamente ao tipo/caderno da prova.
3. Comunicados oficiais de anulação ou alteração de gabarito.
4. Edital e todas as retificações de cada concurso usado como referência.
5. Edital oficial e retificações do concurso-alvo atualmente configurado.

### Material ainda ausente

- PDF preferencial de Raciocínio Lógico-Matemático usado pelo candidato.

### Formato ideal de entrega

- PDFs originais, sem renomear de forma ambígua;
- nome contendo banca, órgão, cargo, ano e tipo de caderno;
- prova e gabarito entregues juntos;
- informar a origem quando o arquivo não vier diretamente do site oficial.

### Dados que não devem alimentar o ranking

- resumos sem fonte;
- “tendências da banca” produzidas apenas por IA;
- listas de questões sem prova de origem;
- gabaritos preliminares tratados como definitivos;
- contagens de incidência sem deduplicação e classificação revisada.

## PONTO IMPORTANTE DE DECISÃO

O próximo recurso estratégico é a incidência histórica FGV. A decisão arquitetural já tomada é conservadora:

> Nenhuma tendência da banca influenciará o ranking antes de prova, gabarito, classificação temática, deduplicação e limitações estarem versionados e auditáveis.

Portanto, o desenvolvimento técnico pode continuar em calibração e modularização, mas a ativação da inteligência histórica depende do conjunto oficial de documentos listado acima.

## PENDENTE

- validação e versionamento do corpus FGV;
- análise de sensibilidade dos pesos heurísticos do SDE;
- testes constitucionais adicionais;
- retorno marginal em pontos/hora, somente quando houver modelo defensável;
- contratos futuros de ações da IA com confirmação explícita;
- decomposição de componentes e store ainda grandes;
- extração completa da configuração DATAPREV para arquitetura multi-concurso;
- inspeção visual manual em navegador real.

## Como executar

Requisitos recomendados:

- Node.js 24;
- npm compatível com o lockfile.

Comandos:

```bash
npm ci
npm run dev
```

Validação completa:

```bash
npm run build
npm audit --omit=dev
```

## Artefatos

O ZIP entregue contém código-fonte, documentação, dados do projeto, lockfile e builds atualizados. Não contém `node_modules`, `.env`, caches ou credenciais.
