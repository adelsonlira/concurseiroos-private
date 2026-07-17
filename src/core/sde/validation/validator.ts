/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  EditalConfig, 
  Concurso, 
  Disciplina, 
  Assunto, 
  Subassunto, 
  EvidenciasCandidato,
  SDEDiagnosis,
  KnowledgeGraph,
  TimeHorizon,
  EliminationRiskPolicy,
  OpportunityCostPolicy,
  LearningLeveragePolicy
} from "../prioritization/types";

/**
 * Validates a string to ensure it represents a valid ISO or parseable Date.
 */
export function validateStrictISODate(dateStr: string, fieldName: string): void {
  if (!dateStr || typeof dateStr !== "string") {
    throw new Error(`Data inválida para o campo '${fieldName}': não é uma string.`);
  }

  const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
  const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}(:?\d{2})?)$/;

  let isDateOnly = false;
  if (dateOnlyRegex.test(dateStr)) {
    isDateOnly = true;
  } else if (!dateTimeRegex.test(dateStr)) {
    throw new Error(`Formato de data inválido para o campo '${fieldName}': '${dateStr}'. Deve ser ISO (YYYY-MM-DD) ou datetime com timezone explícito.`);
  }

  const parts = dateStr.split("T");
  const datePart = parts[0];
  const dateSplit = datePart.split("-");
  const year = parseInt(dateSplit[0], 10);
  const month = parseInt(dateSplit[1], 10);
  const day = parseInt(dateSplit[2], 10);

  if (month < 1 || month > 12) {
    throw new Error(`Mês inválido para o campo '${fieldName}': '${dateStr}'`);
  }

  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  const daysInMonths = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maxDays = daysInMonths[month - 1];

  if (day < 1 || day > maxDays) {
    throw new Error(`Dia inválido para o campo '${fieldName}': '${dateStr}' (mês ${month} tem ${maxDays} dias)`);
  }

  if (!isDateOnly) {
    const timePartWithTz = parts[1];
    let tzIndex = timePartWithTz.indexOf("Z");
    if (tzIndex === -1) {
      tzIndex = timePartWithTz.indexOf("+");
    }
    if (tzIndex === -1) {
      tzIndex = timePartWithTz.indexOf("-");
    }

    if (tzIndex === -1) {
      throw new Error(`Data inválida para o campo '${fieldName}': '${dateStr}' não possui timezone explícito.`);
    }

    const timePart = timePartWithTz.substring(0, tzIndex);
    const tzPart = timePartWithTz.substring(tzIndex);

    const timeSplit = timePart.split(":");
    const hour = parseInt(timeSplit[0], 10);
    const minute = parseInt(timeSplit[1], 10);
    
    const secondsAndMs = timeSplit[2];
    const secondSplit = secondsAndMs.split(".");
    const second = parseInt(secondSplit[0], 10);
    
    if (hour < 0 || hour > 23) {
      throw new Error(`Hora inválida para o campo '${fieldName}': '${dateStr}' (hora deve ser entre 00 e 23)`);
    }
    if (minute < 0 || minute > 59) {
      throw new Error(`Minuto inválido para o campo '${fieldName}': '${dateStr}' (minuto deve ser entre 00 e 59)`);
    }
    if (second < 0 || second > 59) {
      throw new Error(`Segundo inválido para o campo '${fieldName}': '${dateStr}' (segundo deve ser entre 00 e 59)`);
    }

    if (secondSplit[1] !== undefined) {
      const ms = parseInt(secondSplit[1], 10);
      if (isNaN(ms) || ms < 0) {
        throw new Error(`Milissegundos inválidos para o campo '${fieldName}': '${dateStr}'`);
      }
    }

    if (tzPart !== "Z") {
      const sign = tzPart[0];
      const offsetPart = tzPart.substring(1);
      const offsetSplit = offsetPart.includes(":") ? offsetPart.split(":") : [offsetPart.substring(0, 2), offsetPart.substring(2)];
      const tzHour = parseInt(offsetSplit[0], 10);
      const tzMinute = offsetSplit[1] ? parseInt(offsetSplit[1], 10) : 0;

      if (isNaN(tzHour) || tzHour < 0 || tzHour > 14) {
        throw new Error(`Timezone offset de hora inválido para o campo '${fieldName}': '${dateStr}' (deve ser entre 00 e 14)`);
      }
      if (isNaN(tzMinute) || tzMinute < 0 || tzMinute > 59) {
        throw new Error(`Timezone offset de minuto inválido para o campo '${fieldName}': '${dateStr}' (deve ser entre 00 e 59)`);
      }
    }
  }
}

/**
 * Validates that a numeric value is not NaN, not negative, and optionally fits within a scale of [0, 1].
 */
export function validateNumeric(
  val: number,
  fieldName: string,
  options?: { min?: number; max?: number; isRate?: boolean; integer?: boolean; positive?: boolean }
): void {
  if (val === undefined || val === null || typeof val !== "number" || isNaN(val) || !isFinite(val)) {
    throw new Error(`Valor numérico inválido (NaN, não-finito ou tipo incorreto) para '${fieldName}'`);
  }
  
  if (options?.integer && !Number.isInteger(val)) {
    throw new Error(`Valor para '${fieldName}' (${val}) deve ser um número inteiro.`);
  }

  if (options?.positive && val <= 0) {
    throw new Error(`Valor para '${fieldName}' (${val}) deve ser estritamente positivo.`);
  }

  if (options?.min !== undefined && val < options.min) {
    throw new Error(`Valor para '${fieldName}' (${val}) é menor que o limite mínimo permitido (${options.min})`);
  }

  if (options?.max !== undefined && val > options.max) {
    throw new Error(`Valor para '${fieldName}' (${val}) é maior que o limite máximo permitido (${options.max})`);
  }

  if (options?.isRate && (val < 0 || val > 1)) {
    throw new Error(`Taxa para '${fieldName}' (${val}) está fora da escala permitida de 0 a 1`);
  }
}

/**
 * Performs strict validation on the generic EditalConfig.
 */
export function validateEditalConfig(edital: EditalConfig): void {
  if (!edital.concursoId) throw new Error("Configuração incompleta: 'concursoId' é obrigatório.");
  if (!edital.concursoNome) throw new Error("Configuração incompleta: 'concursoNome' é obrigatório.");
  if (!edital.banca) throw new Error("Configuração incompleta: 'banca' é obrigatória.");
  if (!edital.tipoQuestao) throw new Error("Configuração incompleta: 'tipoQuestao' é obrigatória.");
  
  validateNumeric(edital.duracaoEstimadaProvaMinutos, "duracaoEstimadaProvaMinutos", { positive: true });

  validateStrictISODate(edital.dataProva, "dataProva");

  // Weights and Minimums checking
  for (const [discId, weight] of Object.entries(edital.pesosDisciplinas)) {
    validateNumeric(weight, `peso da disciplina '${discId}'`, { positive: true });
  }

  for (const [discId, minVal] of Object.entries(edital.minimosDisciplinas)) {
    validateNumeric(minVal, `mínimo eliminatório da disciplina '${discId}'`, { isRate: true });
  }

  for (const [assuntoId, weight] of Object.entries(edital.pesosAssuntos)) {
    validateNumeric(weight, `peso do assunto '${assuntoId}'`, { positive: true });
  }

  for (const [assuntoId, incidence] of Object.entries(edital.incidenciaHistoricaAssuntos)) {
    validateNumeric(incidence, `incidência histórica do assunto '${assuntoId}'`, { isRate: true });
  }

  if (!edital.assuntoModelMetadata) {
    throw new Error("Configuração incompleta: 'assuntoModelMetadata' é obrigatório para separar dado oficial, prior neutro e incidência empírica.");
  }
  for (const assuntoId of Object.keys(edital.pesosAssuntos)) {
    const metadata = edital.assuntoModelMetadata[assuntoId];
    if (!metadata) {
      throw new Error(`Proveniência ausente para o assunto '${assuntoId}'.`);
    }
    if (!(["OFFICIAL", "NEUTRAL_PRIOR"] as const).includes(metadata.topicWeightSource)) {
      throw new Error(`topicWeightSource inválido para o assunto '${assuntoId}'.`);
    }
    if (!(["EMPIRICAL", "UNAVAILABLE"] as const).includes(metadata.historicalIncidenceSource)) {
      throw new Error(`historicalIncidenceSource inválido para o assunto '${assuntoId}'.`);
    }
  }
  for (const assuntoId of Object.keys(edital.assuntoModelMetadata)) {
    if (!(assuntoId in edital.pesosAssuntos)) {
      throw new Error(`Proveniência cadastrada para assunto inexistente '${assuntoId}'.`);
    }
  }

  for (const [discId, qCount] of Object.entries(edital.quantidadeQuestoesProva)) {
    validateNumeric(qCount, `quantidade de questões da disciplina '${discId}'`, { min: 0, integer: true });
  }

  for (const [discId, points] of Object.entries(edital.pontosPorQuestao)) {
    const qCount = edital.quantidadeQuestoesProva[discId] ?? 0;
    if (qCount > 0) {
      validateNumeric(points, `pontos por questão da disciplina '${discId}'`, { positive: true });
    } else {
      validateNumeric(points, `pontos por questão da disciplina '${discId}'`, { min: 0 });
    }
  }
}

/**
 * Validates structural integrity of the hierarchy relations.
 */
export function validateHierarchyRelations(inputs: {
  disciplinas: Disciplina[];
  assuntos: Assunto[];
  subassuntos: Subassunto[];
}): void {
  const discIds = new Set(inputs.disciplinas.map(d => d.id));
  const assuntoIds = new Set(inputs.assuntos.map(a => a.id));

  // Verify Assuntos map to a valid Disciplina
  for (const assunto of inputs.assuntos) {
    if (!assunto.disciplinaId) {
      throw new Error(`Relação inválida: Assunto '${assunto.nome}' (${assunto.id}) não possui 'disciplinaId'.`);
    }
    if (!discIds.has(assunto.disciplinaId)) {
      throw new Error(`Identificador sem relação: Assunto '${assunto.nome}' (${assunto.id}) refere-se a uma disciplina inexistente '${assunto.disciplinaId}'.`);
    }
  }

  // Verify Subassuntos map to a valid Assunto
  for (const sub of inputs.subassuntos) {
    if (!sub.assuntoId) {
      throw new Error(`Relação inválida: Subassunto '${sub.nome}' (${sub.id}) não possui 'assuntoId'.`);
    }
    if (!assuntoIds.has(sub.assuntoId)) {
      throw new Error(`Identificador sem relação: Subassunto '${sub.nome}' (${sub.id}) refere-se a um assunto inexistente '${sub.assuntoId}'.`);
    }
  }
}

/**
 * Performs strict validation on candidate evidence/history.
 */
export function validateCandidateEvidence(evidence: EvidenciasCandidato, refDateStr: string): void {
  const refDate = new Date(refDateStr);

  if (!evidence.concursoId) {
    throw new Error("Evidência incompleta: 'concursoId' é obrigatório.");
  }

  const attemptIds = new Set<string>();

  for (const [subId, subEvidence] of Object.entries(evidence.porSubassunto)) {
    if (!subEvidence || typeof subEvidence !== "object") {
      throw new Error(`Objeto de evidência inválido para o subassunto '${subId}'`);
    }

    if (subEvidence.subassuntoId !== subId) {
      throw new Error(`Conflito de identificador: Chave '${subId}' não bate com subassuntoId '${subEvidence.subassuntoId}'.`);
    }

    if (subEvidence.teoriaConcluida !== undefined && typeof subEvidence.teoriaConcluida !== "boolean") {
      throw new Error(`teoriaConcluida de ${subId} deve ser booleano.`);
    }

    if (!Number.isInteger(subEvidence.flashcardsDisponiveis) || !Number.isInteger(subEvidence.flashcardsPendentes)) {
      throw new Error(`Flashcards de ${subId} devem ser números inteiros.`);
    }

    validateNumeric(subEvidence.flashcardsDisponiveis, `flashcards disponíveis de ${subId}`, { min: 0 });
    validateNumeric(subEvidence.flashcardsPendentes, `flashcards pendentes de ${subId}`, { min: 0 });

    if (subEvidence.flashcardsPendentes > subEvidence.flashcardsDisponiveis) {
      throw new Error(`flashcardsPendentes não pode exceder flashcardsDisponiveis para o subassunto '${subId}'.`);
    }

    if (subEvidence.dataUltimoEstudo) {
      validateStrictISODate(subEvidence.dataUltimoEstudo, `dataUltimoEstudo de ${subId}`);
      const d = new Date(subEvidence.dataUltimoEstudo);
      if (d.getTime() > refDate.getTime()) {
        throw new Error(`dataUltimoEstudo futura de ${subId}: '${subEvidence.dataUltimoEstudo}' é posterior a referenceDate '${refDateStr}'.`);
      }
    }

    if (subEvidence.proximaRevisaoProgramada !== undefined) {
      validateStrictISODate(
        subEvidence.proximaRevisaoProgramada,
        `proximaRevisaoProgramada de ${subId}`
      );
      if (typeof subEvidence.revisaoProgramadaPendente !== "boolean") {
        throw new Error(
          `revisaoProgramadaPendente de '${subId}' deve ser booleano quando existe uma data programada.`
        );
      }
      const expectedPending =
        subEvidence.proximaRevisaoProgramada <= refDateStr;
      if (subEvidence.revisaoProgramadaPendente !== expectedPending) {
        throw new Error(
          `Inconsistência na revisão programada de '${subId}': data '${subEvidence.proximaRevisaoProgramada}' e referenceDate '${refDateStr}'.`
        );
      }
    } else if (subEvidence.revisaoProgramadaPendente === true) {
      throw new Error(
        `revisaoProgramadaPendente não pode ser true sem proximaRevisaoProgramada em '${subId}'.`
      );
    } else if (
      subEvidence.revisaoProgramadaPendente !== undefined &&
      typeof subEvidence.revisaoProgramadaPendente !== "boolean"
    ) {
      throw new Error(
        `revisaoProgramadaPendente de '${subId}' deve ser booleano.`
      );
    }

    if (!subEvidence.tentativas || !Array.isArray(subEvidence.tentativas)) {
      throw new Error(`Arrays ausentes: subassunto '${subId}' não possui array 'tentativas'.`);
    }

    if (!subEvidence.historicoRevisoes || !Array.isArray(subEvidence.historicoRevisoes)) {
      throw new Error(`Arrays ausentes: subassunto '${subId}' não possui array 'historicoRevisoes'.`);
    }

    // Validate attempts
    for (const attempt of subEvidence.tentativas) {
      if (!attempt.id) {
        throw new Error(`ID de tentativa vazio detectado no subassunto '${subId}'.`);
      }
      if (attemptIds.has(attempt.id)) {
        throw new Error(`ID de tentativa duplicado: '${attempt.id}'.`);
      }
      attemptIds.add(attempt.id);

      if (typeof attempt.acertou !== "boolean") {
        throw new Error(`Campo 'acertou' na tentativa '${attempt.id}' deve ser booleano.`);
      }

      if (attempt.subassuntoId !== subId) {
        throw new Error(`Conflito de identificador na tentativa '${attempt.id}': subassuntoId esperado '${subId}', recebido '${attempt.subassuntoId}'`);
      }

      if (attempt.origem !== "TREINO_ISOLADO" && attempt.origem !== "SIMULADO") {
        throw new Error(`Origem inválida '${attempt.origem}' na tentativa '${attempt.id}'.`);
      }

      validateStrictISODate(attempt.data, `data da tentativa ${attempt.id}`);
      const d = new Date(attempt.data);
      if (d.getTime() > refDate.getTime()) {
        throw new Error(`Tentativa '${attempt.id}' possui data futura (${attempt.data}) em relação à referenceDate (${refDateStr}).`);
      }

      if (typeof attempt.tempoRespostaSegundos !== "number" || !isFinite(attempt.tempoRespostaSegundos) || attempt.tempoRespostaSegundos < 0) {
        throw new Error(`Tempo de resposta inválido (${attempt.tempoRespostaSegundos}) na tentativa '${attempt.id}'.`);
      }
    }

    // Validate revision history
    for (const rev of subEvidence.historicoRevisoes) {
      if (rev.tipo !== "teoria" && rev.tipo !== "questoes" && rev.tipo !== "revisao" && rev.tipo !== "flashcards") {
        throw new Error(`Tipo de revisão inválido: '${rev.tipo}'`);
      }
      validateStrictISODate(rev.data, `data da revisão de ${subId}`);
      const d = new Date(rev.data);
      if (d.getTime() > refDate.getTime()) {
        throw new Error(`Revisão possui data futura (${rev.data}) em relação à referenceDate (${refDateStr}).`);
      }
    }
  }
}

/**
 * Validates SDE inputs completely to comply with Rule 10.
 */
export function validateSDEInputs(params: {
  edital: EditalConfig;
  diagnosis: SDEDiagnosis;
  history: EvidenciasCandidato;
  knowledgeGraph: KnowledgeGraph;
  timeHorizon: TimeHorizon;
  disciplinas: Disciplina[];
  assuntos: Assunto[];
  subassuntos: Subassunto[];
  assuntoToDisciplina: { [id: string]: string };
  subassuntoToAssunto: { [id: string]: string };
  assuntoToSubassuntos: { [id: string]: string[] };
  policy: EliminationRiskPolicy;
  opportunityCostPolicy: OpportunityCostPolicy;
  learningLeveragePolicy: LearningLeveragePolicy;
  estimatedDurationMinutesByAction?: { [actionId: string]: number };
}): void {
  const {
    edital,
    diagnosis,
    history,
    knowledgeGraph,
    timeHorizon,
    disciplinas,
    assuntos,
    subassuntos,
    assuntoToDisciplina,
    subassuntoToAssunto,
    assuntoToSubassuntos,
    policy,
    opportunityCostPolicy,
    learningLeveragePolicy,
    estimatedDurationMinutesByAction
  } = params;

  // Validate policy presence and values
  if (!policy) {
    throw new Error("Erro estruturado: Política eliminatória obrigatória ausente.");
  }

  if (!opportunityCostPolicy) {
    throw new Error("Erro estruturado: Política de custo de oportunidade obrigatória ausente.");
  }

  if (!learningLeveragePolicy) {
    throw new Error("Erro estruturado: Política de alavancagem de aprendizagem obrigatória ausente.");
  }

  const oc = opportunityCostPolicy;
  validateNumeric(oc.minimumComparableActions, "minimumComparableActions", { min: 2, integer: true });
  validateNumeric(oc.durationToleranceRatio, "durationToleranceRatio", { isRate: true });

  const ll = learningLeveragePolicy;
  if (ll.lowPerformanceUpperBound === undefined || ll.lowPerformanceUpperBound === null || typeof ll.lowPerformanceUpperBound !== "number" || isNaN(ll.lowPerformanceUpperBound) || ll.lowPerformanceUpperBound < 0 || ll.lowPerformanceUpperBound > 1) {
    throw new Error("Erro estruturado: 'lowPerformanceUpperBound' deve ser uma taxa entre 0 e 1.");
  }
  if (ll.leverageZoneLowerBound === undefined || ll.leverageZoneLowerBound === null || typeof ll.leverageZoneLowerBound !== "number" || isNaN(ll.leverageZoneLowerBound) || ll.leverageZoneLowerBound < 0 || ll.leverageZoneLowerBound > 1) {
    throw new Error("Erro estruturado: 'leverageZoneLowerBound' deve ser uma taxa entre 0 e 1.");
  }
  if (ll.leverageZoneUpperBound === undefined || ll.leverageZoneUpperBound === null || typeof ll.leverageZoneUpperBound !== "number" || isNaN(ll.leverageZoneUpperBound) || ll.leverageZoneUpperBound < 0 || ll.leverageZoneUpperBound > 1) {
    throw new Error("Erro estruturado: 'leverageZoneUpperBound' deve ser uma taxa entre 0 e 1.");
  }
  if (ll.masteredLowerBound === undefined || ll.masteredLowerBound === null || typeof ll.masteredLowerBound !== "number" || isNaN(ll.masteredLowerBound) || ll.masteredLowerBound < 0 || ll.masteredLowerBound > 1) {
    throw new Error("Erro estruturado: 'masteredLowerBound' deve ser uma taxa entre 0 e 1.");
  }

  if (!(
    ll.lowPerformanceUpperBound <= ll.leverageZoneLowerBound &&
    ll.leverageZoneLowerBound <= ll.leverageZoneUpperBound &&
    ll.leverageZoneUpperBound <= ll.masteredLowerBound
  )) {
    throw new Error("Erro estruturado: limites da política de alavancagem estão fora de ordem.");
  }

  if (estimatedDurationMinutesByAction) {
    for (const [actionId, duration] of Object.entries(estimatedDurationMinutesByAction)) {
      validateNumeric(duration, `duração estimada da ação '${actionId}'`, { positive: true });
    }
  }

  const {
    minDisciplineSampleSize,
    minTopicSampleSizeForCoverage,
    minWeightedCoverage,
    warningMargin
  } = policy;

  if (minDisciplineSampleSize === undefined || minDisciplineSampleSize === null) {
    throw new Error("Erro estruturado: 'minDisciplineSampleSize' ausente na política.");
  }
  if (minTopicSampleSizeForCoverage === undefined || minTopicSampleSizeForCoverage === null) {
    throw new Error("Erro estruturado: 'minTopicSampleSizeForCoverage' ausente na política.");
  }
  if (minWeightedCoverage === undefined || minWeightedCoverage === null) {
    throw new Error("Erro estruturado: 'minWeightedCoverage' ausente na política.");
  }
  if (warningMargin === undefined || warningMargin === null) {
    throw new Error("Erro estruturado: 'warningMargin' ausente na política.");
  }

  // NaN or Infinity checks
  if (typeof minDisciplineSampleSize !== "number" || isNaN(minDisciplineSampleSize) || !isFinite(minDisciplineSampleSize)) {
    throw new Error("Erro estruturado: 'minDisciplineSampleSize' inválido.");
  }
  if (typeof minTopicSampleSizeForCoverage !== "number" || isNaN(minTopicSampleSizeForCoverage) || !isFinite(minTopicSampleSizeForCoverage)) {
    throw new Error("Erro estruturado: 'minTopicSampleSizeForCoverage' inválido.");
  }
  if (typeof minWeightedCoverage !== "number" || isNaN(minWeightedCoverage) || !isFinite(minWeightedCoverage)) {
    throw new Error("Erro estruturado: 'minWeightedCoverage' inválido.");
  }
  if (typeof warningMargin !== "number" || isNaN(warningMargin) || !isFinite(warningMargin)) {
    throw new Error("Erro estruturado: 'warningMargin' inválido.");
  }

  // Integer positive check for sample sizes
  if (!Number.isInteger(minDisciplineSampleSize)) {
    throw new Error("Erro estruturado: 'minDisciplineSampleSize' deve ser um número inteiro.");
  }
  if (minDisciplineSampleSize <= 0) {
    throw new Error("Erro estruturado: 'minDisciplineSampleSize' deve ser estritamente positivo (maior que zero).");
  }

  if (!Number.isInteger(minTopicSampleSizeForCoverage)) {
    throw new Error("Erro estruturado: 'minTopicSampleSizeForCoverage' deve ser um número inteiro.");
  }
  if (minTopicSampleSizeForCoverage <= 0) {
    throw new Error("Erro estruturado: 'minTopicSampleSizeForCoverage' deve ser estritamente positivo (maior que zero).");
  }

  // Rate range [0, 1] checks
  if (minWeightedCoverage < 0 || minWeightedCoverage > 1) {
    throw new Error("Erro estruturado: 'minWeightedCoverage' deve ser uma taxa entre 0 e 1.");
  }
  if (warningMargin < 0 || warningMargin > 1) {
    throw new Error("Erro estruturado: 'warningMargin' deve ser uma taxa entre 0 e 1.");
  }

  // 1. Validate legacy or provided performance rates
  for (const [aId, r] of Object.entries(diagnosis.assuntoRendimento)) {
    if (r !== null && r !== undefined) {
      validateNumeric(r, `assuntoRendimento de ${aId}`, { isRate: true });
    }
  }

  for (const [subId, r] of Object.entries(diagnosis.subassuntoRendimento)) {
    if (r !== null && r !== undefined) {
      validateNumeric(r, `subassuntoRendimento de ${subId}`, { isRate: true });
    }
  }

  for (const [subId, rate] of Object.entries(diagnosis.decayRates)) {
    if (rate !== null && rate !== undefined) {
      validateNumeric(rate, `decayRate de ${subId}`, { isRate: true });
    }
  }

  // 2. Validate structural hierarchy and maps
  validateHierarchyRelations({ disciplinas, assuntos, subassuntos });

  const discIds = new Set(disciplinas.map(d => d.id));
  const assuntoIds = new Set(assuntos.map(a => a.id));
  const subassuntoIds = new Set(subassuntos.map(s => s.id));

  // 3. Call validateEditalConfig and match concursoIds
  validateEditalConfig(edital);

  if (history.concursoId !== edital.concursoId) {
    throw new Error(`Incoerência de concurso: concursoId do histórico (${history.concursoId}) não bate com o do edital (${edital.concursoId}).`);
  }

  for (const disc of disciplinas) {
    if (disc.concursoId !== edital.concursoId) {
      throw new Error(`Disciplina '${disc.id}' pertence a outro concurso (${disc.concursoId}).`);
    }
    const weight = edital.pesosDisciplinas[disc.id];
    if (weight === undefined) {
      throw new Error(`Peso ausente no edital para a disciplina '${disc.id}'.`);
    }
    const qCount = edital.quantidadeQuestoesProva[disc.id];
    if (qCount === undefined) {
      throw new Error(`Quantidade de questões ausente no edital para a disciplina '${disc.id}'.`);
    }
    const points = edital.pontosPorQuestao[disc.id];
    if (points === undefined) {
      throw new Error(`Pontos por questão ausente no edital para a disciplina '${disc.id}'.`);
    }
  }

  for (const ass of assuntos) {
    const weight = edital.pesosAssuntos[ass.id];
    if (weight === undefined) {
      throw new Error(`Peso ausente no edital para o assunto '${ass.id}'.`);
    }
    const incidence = edital.incidenciaHistoricaAssuntos[ass.id];
    if (incidence === undefined) {
      throw new Error(`Incidência histórica ausente no edital para o assunto '${ass.id}'.`);
    }
  }

  // 4. Validate maps consistency
  for (const assId of Object.keys(assuntoToDisciplina)) {
    if (!assuntoIds.has(assId)) {
      throw new Error(`ID inválido no mapa assuntoToDisciplina: assunto '${assId}' não existe.`);
    }
  }
  for (const subId of Object.keys(subassuntoToAssunto)) {
    if (!subassuntoIds.has(subId)) {
      throw new Error(`ID inválido no mapa subassuntoToAssunto: subassunto '${subId}' não existe.`);
    }
  }

  for (const ass of assuntos) {
    const mappedDiscId = assuntoToDisciplina[ass.id];
    if (!mappedDiscId) {
      throw new Error(`Mapeamento ausente: assuntoToDisciplina para assunto '${ass.id}' não existe.`);
    }
    if (mappedDiscId !== ass.disciplinaId) {
      throw new Error(`Mapeamento contraditório: assuntoToDisciplina['${ass.id}'] é '${mappedDiscId}', mas disciplinaId real é '${ass.disciplinaId}'.`);
    }
  }

  for (const sub of subassuntos) {
    const mappedAssId = subassuntoToAssunto[sub.id];
    if (!mappedAssId) {
      throw new Error(`Mapeamento ausente: subassuntoToAssunto para subassunto '${sub.id}' não existe.`);
    }
    if (mappedAssId !== sub.assuntoId) {
      throw new Error(`Mapeamento contraditório: subassuntoToAssunto['${sub.id}'] é '${mappedAssId}', mas assuntoId real é '${sub.assuntoId}'.`);
    }
  }

  for (const [assId, subList] of Object.entries(assuntoToSubassuntos)) {
    if (!assuntoIds.has(assId)) {
      throw new Error(`ID inválido no mapa assuntoToSubassuntos: assunto '${assId}' não existe.`);
    }
    for (const subId of subList) {
      if (!subassuntoIds.has(subId)) {
        throw new Error(`ID inválido na lista assuntoToSubassuntos de '${assId}': subassunto '${subId}' não existe.`);
      }
    }
  }

  for (const ass of assuntos) {
    const subList = assuntoToSubassuntos[ass.id];
    if (!subList) {
      throw new Error(`Mapeamento ausente: assuntoToSubassuntos para assunto '${ass.id}' não existe.`);
    }
  }

  const subassuntoCountInLists: { [subId: string]: number } = {};
  const subassuntoAssuntoMapping: { [subId: string]: string } = {};

  for (const [assId, subList] of Object.entries(assuntoToSubassuntos)) {
    const seenInThisList = new Set<string>();
    for (const subId of subList) {
      if (seenInThisList.has(subId)) {
        throw new Error(`Subassunto duplicado na lista do assunto '${assId}': '${subId}' aparece múltiplas vezes.`);
      }
      seenInThisList.add(subId);
      subassuntoCountInLists[subId] = (subassuntoCountInLists[subId] || 0) + 1;
      subassuntoAssuntoMapping[subId] = assId;
    }
  }

  for (const sub of subassuntos) {
    const count = subassuntoCountInLists[sub.id] || 0;
    if (count === 0) {
      throw new Error(`Subassunto '${sub.id}' não aparece em nenhum mapeamento assuntoToSubassuntos.`);
    }
    if (count > 1) {
      throw new Error(`Subassunto '${sub.id}' aparece múltiplas vezes em assuntoToSubassuntos.`);
    }

    const listAssId = subassuntoAssuntoMapping[sub.id];
    if (listAssId !== sub.assuntoId) {
      throw new Error(`Subassunto '${sub.id}' foi associado incorretamente ao assunto '${listAssId}' em assuntoToSubassuntos, mas seu assuntoId real é '${sub.assuntoId}'.`);
    }

    const listAssunto = assuntos.find(a => a.id === listAssId);
    const subRealAssunto = assuntos.find(a => a.id === sub.assuntoId);
    if (listAssunto && subRealAssunto && listAssunto.disciplinaId !== subRealAssunto.disciplinaId) {
      throw new Error(`Subassunto '${sub.id}' de outra disciplina: associado a assunto '${listAssId}' da disciplina '${listAssunto.disciplinaId}', mas pertence a '${subRealAssunto.disciplinaId}'.`);
    }
  }

  // 5. Validate Knowledge Graph
  for (const [nodeId, node] of Object.entries(knowledgeGraph.nodes)) {
    if (!subassuntoIds.has(nodeId)) {
      throw new Error(`Erro estruturado: Nó do Knowledge Graph '${nodeId}' não existe na lista de subassuntos.`);
    }
    for (const depId of node.dependencias) {
      if (!knowledgeGraph.nodes[depId]) {
        throw new Error(`Erro estruturado: Dependência inexistente '${depId}'.`);
      }
    }
  }

  // 6. Validate TimeHorizon coherence
  validateStrictISODate(timeHorizon.referenceDate, "referenceDate");
  validateStrictISODate(timeHorizon.dataProva, "timeHorizon.dataProva");
  validateStrictISODate(edital.dataProva, "edital.dataProva");

  if (timeHorizon.dataProva !== edital.dataProva) {
    throw new Error(`Divergência de data da prova: TimeHorizon possui data da prova '${timeHorizon.dataProva}' diferente da data da prova do Edital '${edital.dataProva}'.`);
  }

  validateNumeric(timeHorizon.diasAteAProva, "diasAteAProva", { min: 0, integer: true });

  const refMs = new Date(timeHorizon.referenceDate).getTime();
  const provMs = new Date(timeHorizon.dataProva).getTime();
  const diffMs = provMs - refMs;
  if (diffMs < 0) {
    throw new Error(`TimeHorizon inválido: referenceDate '${timeHorizon.referenceDate}' é posterior à data da prova '${timeHorizon.dataProva}'.`);
  }
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays !== timeHorizon.diasAteAProva) {
    throw new Error(`Incoerência de TimeHorizon: O número de dias até a prova (${timeHorizon.diasAteAProva}) não corresponde à diferença real entre a prova (${timeHorizon.dataProva}) e referenceDate (${timeHorizon.referenceDate}) que é de ${diffDays} dias.`);
  }

  // 7. Validate attempts in history against referenceDate
  validateCandidateEvidence(history, timeHorizon.referenceDate);

  for (const subId of Object.keys(history.porSubassunto)) {
    if (!subassuntoIds.has(subId)) {
      throw new Error(`Contradição: Subassunto '${subId}' no histórico do candidato não existe na lista de subassuntos.`);
    }
  }
}
