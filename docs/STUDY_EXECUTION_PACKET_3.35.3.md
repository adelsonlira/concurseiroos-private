# Contrato do studyExecutionPacket — v3.35.3

Toda atividade apresentada como executável contém:

- identificadores de execução, disciplina, assunto e subassunto;
- método e ambiente;
- duração;
- objetivo e conteúdo exato;
- material, trecho e páginas ou declaração de ausência;
- instruções sequenciais;
- fontes selecionadas e fontes a desmarcar;
- prompt operacional;
- critério de conclusão;
- formulário e campos de retorno;
- confiança e limitações.

## NotebookLM

O pacote informa nome do notebook, modo, tamanho, pesquisa web, análise de dados, fontes ativas, fontes desativadas, prompt completo, critério e retorno esperado. Sem URL cadastrada, o sistema não inventa link.

## QConcursos

O pacote separa origem e banca, informa disciplina, assunto, subassunto, quantidade e exclusão de anuladas/desatualizadas. Anos permanecem ausentes quando não autorizados. QConcursos nunca é gravado como banca.

## Retorno

- teoria: duração, material, páginas/seção, recuperação ativa, dúvidas e critério;
- questões: origem, banca, total, acertos, erros, brancos, consulta, duração e assunto;
- revisão: desempenho, itens lembrados, erros e nova revisão;
- prática: tarefa, resultado, conclusão, dificuldade e evidência observável.

A conclusão do pacote não concede mastery por si só.
