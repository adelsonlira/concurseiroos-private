# Notas de versão — 3.32.0

## Adicionado

- Treino FGV manual e isolado para Banco de Dados.
- 664 questões elegíveis derivadas de 797 registros do banco operacional.
- 301 assets operacionais.
- Filtros por área, item primário e aderência.
- Treinos de 5, 10, 15 ou 20 questões.
- Conferência segura por questão, retomada após F5, finalização e histórico básico.
- Resultado por área, item primário e aderência.

## Segurança e isolamento

- Gabarito e metadados privados permanecem no backend.
- `affectsSde = false`.
- `countsAsOfficialSimulation = false`.
- Nenhuma alteração em SDE, mastery, prioridades, sessões, simulados oficiais ou diagnóstico piloto.

## Preservado

A navegação corrigida do Diagnóstico Piloto na v3.31.4 continua funcionando com estados e rotas separados.

## Reservado para 3.32.1

Filtros de não vistas e erradas anteriormente, estatísticas acumuladas e recomendações baseadas no histórico.
