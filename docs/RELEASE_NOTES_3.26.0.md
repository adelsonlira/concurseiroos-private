# Notas da versão 3.26.0

## Destaques

- restauração de snapshots antigos sem perda de histórico;
- migração protegida por checksum e validação transacional;
- diagnóstico usa lista de questões sem solução ou banco externo;
- teoria e páginas de recuperação aparecem antes do início como consequência possível;
- instruções de correção sem jargão;
- cofre recolhível por disciplina;
- `/api/readiness` coerente com as variáveis realmente carregadas.

## Compatibilidade

- snapshots anteriores sem `evidenciasAprendizagemGuiada` são migrados para lista vazia;
- snapshots corrompidos continuam recusados;
- nenhum registro de aprendizagem é criado pela migração;
- backups 2.0 permanecem compatíveis;
- não há alteração de schema Supabase nesta versão.

## Comportamento esperado após atualização

Ao escolher “Usar dados da nuvem neste dispositivo”, uma cópia antiga válida deve ser importada e atualizada localmente. A nuvem não é sobrescrita por essa ação. Depois da confirmação do histórico, a sincronização futura poderá gravar o formato atual normalmente.
