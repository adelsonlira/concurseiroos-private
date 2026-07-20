# Compatibilização dos testes legados com o executionReadinessGate

As sete falhas provinham de fixtures que copiavam uma recomendação e alteravam apenas o método, deixando ambiente, material e fonte implícitos. Na v3.35.3 isso não representa uma atividade executável.

Os testes de teoria passaram a usar Banco de Dados, único notebook inicialmente aprovado. O lote de outra banca passou a usar QConcursos como origem real e CESPE como banca explícita. Revisão e prática passaram a usar sessão guiada com objeto concreto e sem material herdado incompatível.

Nenhum bloqueio foi convertido em aviso genérico. Português permanece `NOT_CONFIGURED`; ortografia não é usada para interpretação; ambientes manuais genéricos continuam bloqueados.
