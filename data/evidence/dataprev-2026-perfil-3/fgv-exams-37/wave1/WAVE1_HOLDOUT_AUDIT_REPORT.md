# Auditoria holdout — Onda A1/A2 FGV

## Resultado

- Amostra independente e estratificada: **22 questões**.
- Classificações temáticas corretas na amostra: **22/22**.
- Precisão observada: **100%**.
- Intervalo de Wilson de 95%: **85.1% a 100.0%**.
- Alta confiança: **16**.
- Revisão requerida: **6**.

## Metodologia

A amostra foi selecionada por hash determinístico com salt, estratificada por estado de classificação e grande tópico. As questões usadas durante o ajuste das regras foram excluídas. Cada enunciado foi confrontado semanticamente com a taxonomia oficial do Perfil 3. Termos presentes apenas em alternativas não foram aceitos como evidência dominante.

## Correções realizadas antes do congelamento

- `redis` deixou de reconhecer “redistribuição”.
- ISO 38500 deixou de ser classificada como ISO 27001/27002.
- seções discursivas e redações deixaram de contaminar a última questão objetiva.
- alternativas passaram a ter peso reduzido para evitar que distratores definam o tópico.
- URLs HTTPS deixaram de ser tratadas automaticamente como questão de TLS.
- “entrevista”, “herança”, “ameaça”, “autorização”, “solid” de CSS e “trigger” de GitLab receberam gates contextuais.
- um vazamento entre colunas nas questões 69/70 da prova DPERS foi reparado por assinatura estrutural conservadora.

## Limites

Este resultado **não valida o corpus completo** e **não ativa incidência histórica no SDE**. O limite inferior do intervalo de 95% é 85.1%; portanto, mesmo sem erro observado, ainda há incerteza relevante. Gabaritos continuam ausentes, e 186 itens de revisão requerida permanecem fora da matriz experimental.
