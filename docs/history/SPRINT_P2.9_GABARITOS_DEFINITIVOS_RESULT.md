# Sprint P2.9 — Importação dos gabaritos definitivos oficiais

Data da validação: 13/07/2026
Versão: 2.9.0

## Objetivo

Substituir, no corpus curado do ConcurseiroOS, os gabaritos provisórios/espelhados das seis provas prioritárias pelos arquivos definitivos fornecidos pelo usuário, preservando rastreabilidade por cargo, caderno, página, hash e procedência.

## Arquivos processados

O ZIP recebido continha seis PDFs oficiais, todos com múltiplos cargos ou cadernos. Para cada prova-alvo, a extração foi vinculada ao cargo exato e ao Caderno Tipo 1 (Branca) correspondente à prova já catalogada.

| Prova-alvo | Página do PDF do gabarito | Questões extraídas | Anuladas | Alterações contra o registro anterior |
|---|---:|---:|---|---:|
| DATAPREV — ATI — Desenvolvimento de Software | 5 | 70 | 13 | 1 |
| TCE-PA — Auditor de Controle Externo — Informática — Analista de Sistemas | 16 | 100 | 10, 50, 52, 58, 87, 97 | 10 |
| ALEP — Analista Legislativo — Desenvolvedor de Sistemas | 7 | 70 | 10 | 2 |
| TRF1 — Analista Judiciário — Análise de Sistemas de Informação | 4 | 80 | 9 | 28 |
| TJAP — Analista Judiciário — TI — Desenvolvimento de Sistemas | 10 | 80 | nenhuma | 0 |
| MPU — Analista do MPU — Desenvolvimento de Sistemas | 6 | 80 | 21 | 1 |

Total: **42 respostas alteradas** em relação ao registro anterior e **10 novas anulações** nas seis provas substituídas.

## DATAPREV — bloco específico

Gabarito definitivo das questões 41 a 70, Caderno Tipo 1:

`41 A, 42 C, 43 D, 44 E, 45 A, 46 B, 47 A, 48 B, 49 C, 50 B, 51 B, 52 D, 53 A, 54 B, 55 B, 56 C, 57 E, 58 B, 59 D, 60 D, 61 C, 62 B, 63 A, 64 C, 65 C, 66 C, 67 D, 68 B, 69 B, 70 B.`

A questão 13, de conhecimentos gerais, foi anulada no definitivo.

## Anomalia documental registrada

No caso da ALEP, a página oficial da FGV classifica o link como gabarito definitivo, enquanto o cabeçalho interno do PDF ainda contém a palavra “preliminar”. O arquivo possui conteúdo diferente do gabarito preliminar anterior. O sistema aceitou o status definitivo com uma nota de proveniência explícita e manteve o status detectado no cabeçalho para auditoria.

## Estado do registro consolidado

- 12 provas com associação exata entre cargo e caderno;
- 8 gabaritos definitivos;
- 3 gabaritos ainda preliminares;
- 1 publicação sem qualificação explícita;
- 6 fontes oficiais fornecidas pelo usuário;
- 12 questões anuladas no conjunto consolidado;
- 890 registros do corpus com gabarito associado;
- 88 questões únicas, manualmente revisadas e analiticamente elegíveis, agora com gabarito definitivo;
- 0 questões liberadas para prática interna, porque o corpus derivado ainda não contém, de forma garantida, enunciado completo e todas as alternativas.

## Alterações de implementação

- parser ampliado para tabelas linha-a-linha e pares número/resposta;
- suporte a variações de cabeçalho de gabarito definitivo;
- separação entre status detectado no PDF e status documental aceito;
- procedência `OFFICIAL_FGV_PUBLICATION_USER_SUPPLIED`;
- notas de proveniência para inconsistências editoriais;
- atualização automática do corpus e do gate do banco de questões;
- Dashboard atualizado para exibir substituição por fonte oficial e alertas de procedência;
- relatório CSV de diferenças incluído em `data/evidence/.../official-definitive-import-audit.csv`.

## Validação

- 236/236 testes aprovados;
- 23 arquivos de testes aprovados;
- TypeScript/lint aprovado;
- build de produção aprovado;
- `npm audit --omit=dev`: 0 vulnerabilidades;
- inicialização em modo produção validada;
- resposta HTTP 200 validada;
- nenhum PDF bruto de prova ou gabarito incluído no pacote distribuível;
- somente metadados derivados e respostas oficiais estruturadas foram incorporados.

## Limite atual

Os gabaritos definitivos permitem análise confiável de correções, alterações e anulações. Ainda não autorizam reproduzir as questões no aplicativo: para isso, o enunciado completo, as alternativas e a licença de uso precisam estar disponíveis de forma segura.
