# Estado Atual

Data: 2026-07-19
Versão: 3.35.2

## Projeto

ConcurseiroOS — alvo ativo: DATAPREV 2026, Analista de Tecnologia da Informação, Perfil 3 — Desenvolvimento de Software.

## Fase atual

A versão 3.35.2 corrige exclusivamente o encerramento do pipeline. O comportamento funcional da 3.35.1 permanece integralmente preservado.

## Implementado

- encerramento explícito do serviço do esbuild usado no teste ESM;
- harness HTTP de teste com cliente sem keep-alive, consumo integral de respostas e rastreamento de sockets;
- teardown explícito de servidores, conexões ociosas, conexões ativas e listeners temporários;
- smoke serverless sem `fetch` global e com `PASS` somente depois do fechamento confirmado;
- auditoria de subprocessos para saída natural, código zero, ausência de sinal e ausência de descendentes;
- comando `test:hanging-process` para diagnóstico reproduzível;
- watchdog tratado exclusivamente como gate de falha.

## Validado

- teardown direcionado dos testes HTTP e do smoke serverless;
- cliente sem keep-alive e consumo integral das respostas;
- fechamento de conexões ociosas e ativas;
- auditoria de timeout, sinal e processos descendentes;
- preservação dos contratos funcionais existentes.

## Problemas conhecidos

- o aviso não bloqueante de tamanho do chunk web permanece;
- a confirmação final em runners remotos depende da publicação do commit;
- nenhum sistema garante aprovação.

## Preservado

Disponibilidade de 120 minutos, migração 180 → 120, domingo livre, estudo opcional, resultados estruturados, `optionalStudyLedger`, backup 2.5.0, SDE v1 efetivo, SDE v2 shadow real, Treino FGV, Diagnóstico Piloto, simulados, corpus, taxonomia e dados canônicos.

## Próxima tarefa

Publicar a v3.35.2 e confirmar no GitHub Actions/Vercel que `validate`, `build` e o smoke devolvem o controle ao shell sem intervenção externa.
