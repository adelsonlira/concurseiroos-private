# Sprint P1.2 - Corpus de 37 provas FGV

## Objetivo

Inventariar o arquivo `Provas FGV.zip`, ordenar a curadoria por proximidade com a DATAPREV 2026 Perfil 3 e registrar as fontes sem ativar incidência histórica no SDE.

## Inventário confirmado

- 37 provas PDF.
- 703 páginas.
- 35.422.254 bytes descompactados.
- SHA-256 do ZIP: `312fec3c3cf7a21b49ab05e04b9a9049e42f6190826c19647fa7d800c2e64872`.
- Nenhuma duplicata binária exata.
- Todos os PDFs possuem camada de texto extraível; OCR não foi necessário.
- Gabaritos não fornecidos.

## Classificação preliminar

O ranking é somente uma fila de curadoria. Ele combina título/cargo, mesmo órgão/especialidade, ano detectável e cobertura lexical do conteúdo oficial. Não representa incidência e não altera o SDE.

- A1 - referência primária: 1 prova.
- A2 - muito alta: 14 provas.
- B - alta: 13 provas.
- C - complementar: 6 provas.
- D - baixa/controle negativo: 3 provas.

## Fonte primária identificada

`analista_de_tecnologia_da_informacao_desenvolvimento_de_software.pdf`

- Mesmo órgão: DATAPREV.
- Mesma especialidade: Desenvolvimento de Software.
- 70 questões totais.
- Questões específicas: 41 a 70.
- SHA-256: `962a9c53f78ef3ce4760dbe1e3bf69077755ef966ef2199c3a5b79630738a78d`.

As 30 questões específicas foram extraídas e classificadas manualmente no conteúdo programático atual. O gabarito não é necessário para medir tema e formato, mas será necessário para estudar alternativas corretas, distratores e anulações.

## Distribuição temática observada na prova DATAPREV de referência

A distribuição abaixo descreve uma prova anterior, não uma previsão automática para 2026:

- Metodologias ágeis: 3 questões.
- Design/arquitetura: 2 questões.
- Demais subassuntos identificados: 1 questão cada, incluindo Java/Spring, XML/JSON, SOA/REST, HTTPS/TLS, métricas, mobile, SOLID, servidores web/aplicação, SPA/PWA, testes, requisitos, DevOps, blockchain, IA, BI, segurança, banco de dados e projetos híbridos.

Formatos observados:

- conhecimento direto: 9;
- comparação conceitual: 8;
- situação-problema: 8;
- conjunto de assertivas: 2;
- cenário comparativo: 2;
- cenário com código: 1.

## Alterações no projeto

- Adicionado o corpus de 37 provas ao registro de evidências estratégicas como `RAW_UNCURATED`.
- Adicionada a prova DATAPREV como fonte explícita e separada.
- Adicionados inventários JSON e CSV.
- Adicionado mapeamento manual das 30 questões específicas da prova de referência.
- Adicionados scripts reproduzíveis de inventário e extração.
- Mantida proibição de uso no SDE para incidência histórica.
- Nenhum peso, prioridade ou recomendação foi alterado.

## Validação

- `npm run test:run`: 161/161 testes aprovados.
- `npm run lint`: aprovado.
- `npm run build`: aprovado.
- Aviso não bloqueador: bundle principal acima de 500 kB.

## Próxima onda técnica

1. Segmentar questões das provas A1 e A2.
2. Classificar cada questão nos subassuntos oficiais.
3. Detectar duplicações entre provas e exportações anuais.
4. Revisar manualmente amostras por tópico.
5. Solicitar gabaritos prioritariamente das provas efetivamente úteis.
6. Calcular incidência somente após atingir a política mínima de revisão.
