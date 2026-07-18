# ConcurseiroOS v3.32.1 — Validação de rolagem

## Método

O build web foi servido pelo runtime Express compilado em modo de produção e aberto no Chromium Headless 144. Cada cenário usou perfil isolado e tentativa ativa válida injetada antes da hidratação.

Foram medidos diretamente:

- `clientHeight` e `scrollHeight` do contêiner do treino;
- `overflow-y` e `overflow-x` computados;
- alcance da alternativa E por rolagem;
- alcance dos controles inferiores;
- overflow horizontal;
- largura das imagens em relação ao contêiner;
- altura do `body` e do workspace para detectar segunda barra concorrente.

O caso de zoom de 150% foi reproduzido pela equivalência de viewport: uma área física de 840 × 550 a 150% corresponde a aproximadamente 560 × 367 pixels CSS, forçando o mesmo reflow.

## Resultados

| Cenário | Viewport CSS | Conteúdo/contêiner | Alternativa E | Controles inferiores | Imagem contida | Resultado |
|---|---:|---:|---|---|---|---|
| Texto muito longo | 840 × 550 | 1808 / 494 px | acessível | acessíveis | n/a | PASS |
| Imagem de página completa + cinco alternativas em imagem | 840 × 550 | 1574 / 494 px | acessível | acessíveis | sim, 6 imagens | PASS |
| Cinco alternativas em imagem, mobile | 390 × 700 | 1217 / 644 px | acessível | acessíveis | sim, 6 imagens | PASS |
| Questão com código, mobile | 390 × 700 | 1322 / 644 px | acessível | acessíveis | n/a | PASS |
| Texto longo, equivalente a zoom 150% | 560 × 367 | 2196 / 311 px | acessível | acessíveis | n/a | PASS |

Em todos os cenários:

- `overflow-y` do contêiner foi `auto`;
- `overflow-x` foi `hidden`;
- overflow horizontal medido foi zero;
- o `body` permaneceu limitado ao viewport;
- não surgiu segunda barra vertical concorrente;
- a rota ativa permaneceu `#/treino-fgv/tentativa`.

As capturas e métricas JSON integram os logs de validação da entrega.
