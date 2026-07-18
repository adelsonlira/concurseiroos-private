# Relatório de importação — Treino FGV Essencial 3.32.0

## Fonte exclusiva

`CUR-BD-BANCO-OPERACIONAL-FGV-DATAPREV-v2`

## Resultado

| Indicador | Quantidade |
|---|---:|
| Registros JSONL preservados | 797 |
| Questões elegíveis calculadas | 664 |
| Registros únicos excluídos | 133 |
| Assets preservados e validados | 301 |
| Questões elegíveis com asset de enunciado | 76 |
| Questões elegíveis com alternativa em imagem | 34 |
| Referências de assets usadas no catálogo elegível | 246 |
| Áreas de seleção | 11 |
| Itens primários do edital | 20 |
| Aderência direta | 578 |
| Aderência parcial | 86 |

## Regras aplicadas

Entraram somente registros simultaneamente aptos para estudo, principais em eventual grupo de duplicação, com enunciado utilizável, alternativas A–E operacionais, sem anulação oficial, conflito de gabarito ou impedimento operacional.

Foram excluídas referências duplicadas, questões irrecuperáveis, registros sem alternativa E e registros operacionalmente inaptos. As categorias de exclusão se sobrepõem e não devem ser somadas como registros únicos.

## Integridade

- JSONL, manifesto e arquivos operacionais copiados sem modificação.
- Hash e tamanho conferidos contra o manifesto de origem.
- 301 assets conferidos por SHA-256 e tamanho.
- Todos os caminhos referenciados existem e são relativos.
- Identificadores públicos são únicos.
- Nenhuma referência duplicada permanece no catálogo.
- Todas as 664 questões possuem cinco alternativas A–E em texto ou imagem.

## Inspeção visual otimizada

Foi realizada somente a amostragem exigida, sem nova curadoria ou OCR:

- enunciado em imagem: Q0002;
- alternativas em imagem A–E: Q0002;
- tabela: Q0245;
- diagrama: Q0185.

As quatro amostras estavam legíveis e coerentes com os caminhos manifestados.

## Reprodutibilidade

O gerador produz, para a mesma fonte:

- `trainingPublicCatalog.json` — 664 questões, SHA-256 `c4b311a8bae1bbf39548efe96d393298efedc0397cb30b263d4b9fe4d643b6ab`;
- `trainingPrivateCatalog.json` — 664 registros privados, SHA-256 `edcc6318ab9f0227da5739ad451393e3763b0b56ecfa55a7b2b76bca9b889991`;
- `training-import-report.json` — SHA-256 `ee66d633b97b6f25426f1b9937239663ae51b4d7067fc787a70bc4fa91358e61`.
