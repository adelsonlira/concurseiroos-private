# Estado Atual

Data: 2026-07-18
Versão: 3.32.1

## Projeto

ConcurseiroOS — alvo ativo: DATAPREV 2026, Analista de Tecnologia da Informação, Perfil 3 — Desenvolvimento de Software.

O produto é um sistema de apoio à decisão orientado à aprovação. Deve reduzir fadiga decisória, entregar uma sessão executável e recalcular a próxima ação com evidências reais. Nenhum módulo promete aprovação, inventa incidência ou converte ausência de dados em certeza.

## Fase atual

A versão 3.32.1 é um hotfix do **Treino FGV Essencial**. Ela corrige a publicação serverless da conferência individual, isola mensagens transitórias por tela, garante rolagem integral de questões extensas e define aderência direta como padrão.

A fonte, os 797 registros, as 664 questões elegíveis, os 301 assets e as respostas operacionais permanecem byte a byte inalterados. A correção de navegação do Diagnóstico Piloto da 3.31.4 e os estados separados do Treino FGV permanecem preservados.

## Implementado

- Entry points explícitos para `/api/training-fgv/check` e `/api/training-fgv/finalize` no diretório serverless da Vercel.
- Inclusão estática do catálogo privado somente no bundle serverless, com validação de integridade no cold start.
- Conferência valida tentativa, ordem única, pertencimento da questão e alternativa A–E.
- Cliente apresenta mensagens específicas por status HTTP e mantém a alternativa selecionada para nova tentativa.
- Estado transitório separado entre `attemptError` e `landingError`; nenhum erro é salvo no storage da tentativa.
- Erros da tentativa são limpos ao conferir novamente, obter sucesso, trocar questão, cancelar, finalizar, abrir landing ou resultado.
- Landing e resultado não exibem erros pertencentes à tentativa ativa.
- Todas as telas do Treino FGV usam um contêiner vertical único, restrito pelo shell, com imagens responsivas.
- Aderência inicial e fallback definidos como `DIRECT`.
- Build serverless passa a emitir e validar os dois handlers específicos do treino.

## Validado

- Catálogo público sem resposta operacional ou metadados privados.
- Entry point serverless compilado retorna HTTP 200 para uma tentativa real mínima de cinco questões.
- GET de correção permanece HTTP 405.
- Tentativa ausente, questão fora da tentativa e alternativa inválida são rejeitadas.
- Falha de conferência preserva a seleção e permite repetição; sucesso bloqueia a questão, incrementa o contador e persiste após F5.
- Landing, resultado, cancelamento e troca de questão não exibem erro residual.
- Cenários de rolagem cobrem texto longo, imagem extensa, cinco alternativas em imagem, código, 840×550, mobile e zoom de 150%.
- Store principal, SDE, mastery, prioridades, sessões, simulados oficiais e Diagnóstico Piloto permanecem inalterados.

## Problemas conhecidos

- Treinos continuam armazenados localmente e não sincronizam entre dispositivos.
- A conferência e a finalização requerem rede e sessão válida; uma falha mantém a tentativa para repetição.
- Não há filtros históricos, recomendações, explicações por IA ou estatísticas acumuladas complexas.
- Dados locais gerais ainda não são namespaceados para múltiplos usuários no mesmo perfil de navegador.
- O runtime-alvo é Node.js 24.x; a validação automatizada disponível executa Node 22.x.
- O smoke deve ser repetido no domínio real da Vercel após a publicação.
- Nenhum software ou plano garante aprovação.

## Próxima tarefa

Publicar a 3.32.1 e repetir o smoke autenticado no domínio real: abrir landing, iniciar cinco questões, conferir, recarregar, finalizar/cancelar e validar rolagem nos viewports-alvo. Não iniciar funcionalidades históricas ou recomendações sem nova ordem da Control Tower.
