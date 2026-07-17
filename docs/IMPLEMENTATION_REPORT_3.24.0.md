# Relatório de implementação — ConcurseiroOS 3.24.0

Data: 2026-07-16

## Motivação

A revisão do uso real mostrou duas lacunas distintas:

1. o mesmo PDF podia ser reenviado ao cofre porque o caminho continha timestamp;
2. a regra oficial de eliminação ao zerar disciplina não garantia exposição diagnóstica preventiva a todas as disciplinas no início da preparação.

## Cofre privado

Novos uploads recebem hash SHA-256 calculado no navegador. O hash é comparado com documentos já conhecidos no bucket e na Biblioteca. Conteúdo idêntico não é reenviado, mesmo com nome diferente. Para objetos antigos sem hash, nome normalizado e tamanho exato são usados apenas como sinal conservador.

O sistema permite arquivos de mesmo nome quando seus hashes são diferentes. Duplicatas já existentes não são removidas automaticamente para evitar apagar uma cópia ainda vinculada a material, sessão ou dispositivo.

## Estratégia de pontuação

O SDE já utilizava o potencial oficial de pontos por disciplina e evidências individuais. A Sprint 3.24.0 acrescenta uma restrição anterior à concentração: quando o edital elimina por zero, cada disciplina sem evidência mínima recebe uma ação na frente de segurança.

A ordem estratégica passa a operar em duas etapas:

1. reduzir risco eliminatório categórico com exposição diagnóstica mínima por disciplina;
2. concentrar o tempo restante pelo score determinístico, que considera peso oficial, lacuna, esquecimento, pré-requisito, alavancagem e custo de oportunidade relativo.

Isso não equivale a calcular probabilidade de aprovação ou pontos esperados por hora. A incidência histórica por assunto permanece indisponível no ranking até revisão humana, amostra adequada e comparação em shadow mode.

## Limites explícitos

- não é seguro ignorar assunto apenas porque uma classificação automática sugere baixa frequência;
- o edital não informa distribuição interna das questões por assunto;
- a proteção mínima não garante acerto na prova, apenas impede negligência estrutural pelo planejador;
- o modelo causal de retorno por hora continua pendente de dados prospectivos.
