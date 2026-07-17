# Notas da versão 3.25.0

## Destaques

- tela privada de login antes do aplicativo;
- acesso por convite e cadastro público desligado por padrão;
- produção protegida mesmo quando `AUTH_MODE=optional` foi deixado por engano;
- saída segura com limpeza do dispositivo público;
- bateria diagnóstica antes da teoria;
- teoria adiada somente com amostra e confiança suficientes;
- interface DATAPREV mais enxuta.

## Compatibilidade

- snapshots e backups anteriores permanecem compatíveis;
- novas propriedades de tentativa são opcionais;
- nenhum dado histórico é convertido automaticamente em diagnóstico;
- a migração Supabase existente continua sendo a base; ela deve estar aplicada no projeto remoto.

## Configuração nova

```env
AUTH_ALLOW_SELF_SIGNUP=false
```

Em produção, mantenha `AUTH_MODE=required`.
