# ConcurseiroOS v3.35.1 — Relatório das correções

**Versão:** 3.35.1  
**Baseline exclusiva:** 3.35.0  
**Commit final:** `a6d91f248c6913d85e400357ab56e60d7da28779`  
**Status da baseline registrado:** `BLOQUEADA_PARA_PRODUCAO — COMPARACAO_SHADOW_FICTICIA_E_INTEGRIDADE_INCOMPLETA_DOS_RESULTADOS`  
**Status desta entrega:** `VALIDADA_EM_CHECKOUT_LIMPO — APTA_PARA_DEPLOY_CONTROLADO`

## 1. Comparação fictícia eliminada

A v3.35.0 reaproveitava uma alternativa do motor opcional efetivo e a rotulava como versão 2.0. Esse caminho foi removido. O novo `optionalStudySdeV2ShadowAdapter` recebe uma entrada construída a partir da mesma fotografia objetiva usada pelo Coach, chama o núcleo real `runSdeV2Decision` e só produz uma opção `sde_v2_real` quando existe uma saída real, válida, finita e executável do SDE v2.

Nenhuma alternativa do v1 é promovida, clonada ou renomeada como v2.

Quando o contexto não pode ser representado com segurança, o ledger registra:

```text
v2Decision = null
fallbackUsed = true
fallbackReason = OPTIONAL_STUDY_CONTEXT_NOT_SUPPORTED_BY_SDE_V2
```

O v1 permanece efetivo; o v2 continua com `executionMode = shadow` e `affectsPrescription = false`.

## 2. Recomendações fundamentadas

- casos de erro usam o estado canônico e excluem `STABILIZED`;
- revisões são oferecidas apenas quando vencidas, previstas para a data ou dentro da janela explícita de três dias;
- materiais são vinculados por subassunto, assunto ou disciplina ampla, com confiança declarada;
- pré-requisitos obrigatórios são avaliados antes de questões, prática técnica, conteúdo avançado ou mini-simulado;
- alternativas sem sinal objetivo deixaram de ser apresentadas;
- é permitido apresentar menos de quatro alternativas.

## 3. Escolha manual

A interface passou a consumir a função canônica de validação. São avaliados pré-requisito, material, carga semanal, duração, método, ambiente, origem e banca. Avisos são não bloqueantes, salvo impossibilidade de registrar um resultado válido.

## 4. Origem e banca

O valor fixo `examiningBoard: FGV` foi removido da interface genérica.

- QConcursos é registrado como origem, nunca como banca;
- `fgv_questions` pode derivar FGV quando origem e método são compatíveis;
- `treino_fgv` deriva origem `treino_fgv` e banca FGV;
- lotes manuais preservam outra banca ou banca não informada;
- cada lote agregado continua gerando exatamente uma evidência.

## 5. Resultados estruturados

- questões e simulações: origem, banca, totais, duração, consulta, condições e causa de erro;
- teoria: material, páginas/seção, recuperação ativa, critério e dúvidas;
- revisão: desempenho, conteúdo lembrado, erros persistentes e necessidade de nova revisão;
- prática técnica: tarefa, resultado observável, conclusão, dificuldade e ajuda;
- organização: atividade operacional, sem evidência cognitiva.

## 6. Progresso e mastery

Foi removida a promoção automática de `subassunto.completado = true` por checkbox de teoria. Tempo, autopercepção e caráter opcional não concedem mastery por si mesmos. O domingo não aumenta o peso da evidência.

## 7. Histórico e sessões interrompidas

O histórico usa classes canônicas distintas para teoria, questões, revisão, simulação, prática técnica e organização. Uma sessão interrompida:

- termina com `concluidaComSucesso = false`;
- contabiliza o tempo real uma única vez no total global, disciplina e assunto;
- registra histórico coerente;
- não cria penalidade, evidência negativa ou resultado não informado;
- não pode ser finalizada novamente sem novo aceite.

## 8. Preservações

Mantidos sem alteração funcional:

- 120 minutos de segunda a sábado, domingo indisponível e total semanal de 720 minutos;
- migração conservadora 180 → 120 e backup 2.5.0;
- `optionalStudyLedger` append-only;
- SDE v1 efetivo e SDE v2 shadow;
- Treino FGV, Diagnóstico Piloto e simulados;
- 797 registros, 664 questões elegíveis e 301 assets;
- 311 arquivos protegidos do corpus e catálogos, sem diferenças frente à v3.35.0.

## 9. Alterações de arquivos

- adicionados: **13**;
- modificados: **27**;
- removidos: **0**.

## 10. Limitações remanescentes

- a comparação opcional depende de o contexto poder ser adaptado honestamente ao contrato atual do SDE v2; caso contrário, ocorre fallback explícito;
- não houve publicação na Vercel nesta execução; os smokes foram feitos no build local equivalente em Node.js 24;
- o build web mantém aviso não bloqueante de chunk `study-engine` acima de 500 kB.
