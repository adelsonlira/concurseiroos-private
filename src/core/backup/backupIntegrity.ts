import type { BackupExportSchema } from "../../types";
import { containsSensitiveExternalData } from "../externalEvidence/ledger";

export interface BackupValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface BackupImportPreparation {
  backup: BackupExportSchema | null;
  migrated: boolean;
  errors: string[];
  warnings: string[];
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)])
    );
  }
  return value;
}

export function canonicalBackupPayload(backup: BackupExportSchema): string {
  return JSON.stringify(stableValue(backup.dados));
}

/** Deterministic 64-bit FNV-1a checksum; intended for corruption detection, not cryptographic authentication. */
export function calculateBackupChecksum(backup: BackupExportSchema): string {
  const text = canonicalBackupPayload(backup);
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    hash ^= BigInt(code & 0xff);
    hash = BigInt.asUintN(64, hash * prime);
    if (code > 0xff) {
      hash ^= BigInt(code >>> 8);
      hash = BigInt.asUintN(64, hash * prime);
    }
  }
  return hash.toString(16).padStart(16, "0");
}

function duplicateIds(items: readonly { id: string }[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const item of items) {
    if (!item?.id || typeof item.id !== "string") continue;
    if (seen.has(item.id)) duplicates.add(item.id);
    seen.add(item.id);
  }
  return [...duplicates].sort();
}

function requireArray(value: unknown, label: string, errors: string[]): value is unknown[] {
  if (!Array.isArray(value)) {
    errors.push(`${label} deve ser uma lista.`);
    return false;
  }
  return true;
}

/**
 * Fields added after the original 1.0 snapshot format whose absence can be
 * migrated without inventing study evidence. A missing collection means that
 * feature did not exist when the snapshot was produced, therefore an empty
 * list is the only safe default.
 */
const SAFE_ADDITIVE_COLLECTIONS = ["evidenciasAprendizagemGuiada", "casosRecuperacaoErro", "externalEvidenceLedger", "sdeDecisionLedger"] as const;

function verifyOriginalChecksum(
  backup: BackupExportSchema,
  errors: string[],
  warnings: string[]
): void {
  const checksum = backup.metadata?.checksum;
  if (!checksum) {
    warnings.push(
      "Backup legado sem checksum; a estrutura será migrada, mas corrupção byte a byte anterior não pode ser detectada."
    );
    return;
  }
  if (backup.metadata.integrityAlgorithm !== "FNV1A64_CANONICAL_JSON") {
    errors.push("Algoritmo de integridade do backup não suportado.");
    return;
  }
  if (calculateBackupChecksum(backup) !== checksum) {
    errors.push("Checksum do backup não confere; o arquivo pode estar truncado ou alterado.");
  }
}

/**
 * Verifies the snapshot exactly as received and only then applies additive,
 * lossless migrations. This keeps cloud restores backward compatible while
 * preserving the transactional validation introduced in Backup 2.0.
 */
export function prepareBackupForImport(value: unknown): BackupImportPreparation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!value || typeof value !== "object") {
    return { backup: null, migrated: false, errors: ["Backup ausente ou inválido."], warnings };
  }

  const candidate = value as BackupExportSchema;
  if (candidate.metadata?.appSource !== "ConcurseiroOS") {
    errors.push("Origem do backup inválida.");
  }
  if (!candidate.dados || typeof candidate.dados !== "object") {
    errors.push("Bloco de dados ausente.");
  }
  if (errors.length > 0) return { backup: null, migrated: false, errors, warnings };

  verifyOriginalChecksum(candidate, errors, warnings);
  if (errors.length > 0) return { backup: null, migrated: false, errors, warnings };

  const normalized = structuredClone(candidate) as BackupExportSchema;
  let migrated = false;
  const data = normalized.dados as BackupExportSchema["dados"] & Record<string, unknown>;

  for (const key of SAFE_ADDITIVE_COLLECTIONS) {
    const current = data[key];
    if (current === undefined || current === null) {
      data[key] = [];
      migrated = true;
      warnings.push(
        `${key} não existia neste snapshot antigo e foi inicializado como lista vazia, sem criar evidência de aprendizagem.`
      );
    }
  }

  if (migrated) {
    normalized.metadata = {
      ...normalized.metadata,
      versaoBackup: "2.3.0",
      integrityAlgorithm: "FNV1A64_CANONICAL_JSON"
    };
    normalized.metadata.checksum = calculateBackupChecksum(normalized);
    normalized.metadata.totalTamanhoBytes = JSON.stringify(normalized).length;
  }

  const validation = validateBackup(normalized);
  return {
    backup: validation.valid ? normalized : null,
    migrated,
    errors: validation.errors,
    warnings: [...new Set([...warnings, ...validation.warnings])]
  };
}

export function validateBackup(backup: BackupExportSchema): BackupValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!backup || typeof backup !== "object") return { valid: false, errors: ["Backup ausente ou inválido."], warnings };
  if (backup.metadata?.appSource !== "ConcurseiroOS") errors.push("Origem do backup inválida.");
  if (!backup.dados || typeof backup.dados !== "object") return { valid: false, errors: [...errors, "Bloco de dados ausente."], warnings };

  const requiredCollections: Array<keyof BackupExportSchema["dados"]> = [
    "concursos", "editais", "disciplinas", "assuntos", "subassuntos", "questoes",
    "tentativasQuestoes", "flashcards", "documentos", "resumos", "anotacoes",
    "planosEstudo", "simulados", "agenda", "historicos", "cronogramasRevisao",
    "conversasIA", "sessoesEstudo", "evidenciasAprendizagemGuiada", "casosRecuperacaoErro", "externalEvidenceLedger", "itensBiblioteca"
  ];
  for (const key of requiredCollections) requireArray(backup.dados[key], String(key), errors);
  if (errors.length > 0) return { valid: false, errors, warnings };

  const identityCollections = [
    ["concursos", backup.dados.concursos], ["editais", backup.dados.editais],
    ["disciplinas", backup.dados.disciplinas], ["assuntos", backup.dados.assuntos],
    ["subassuntos", backup.dados.subassuntos], ["questoes", backup.dados.questoes],
    ["flashcards", backup.dados.flashcards], ["documentos", backup.dados.documentos],
    ["simulados", backup.dados.simulados], ["sessoesEstudo", backup.dados.sessoesEstudo],
    ["casosRecuperacaoErro", backup.dados.casosRecuperacaoErro]
  ] as const;
  for (const [label, items] of identityCollections) {
    const duplicates = duplicateIds(items);
    if (duplicates.length > 0) errors.push(`${label} contém IDs duplicados: ${duplicates.slice(0, 5).join(", ")}.`);
  }

  const evidenceIds = new Set<string>();
  const duplicateEvidenceIds = new Set<string>();
  for (const event of backup.dados.externalEvidenceLedger) {
    if (!event.evidenceId || typeof event.evidenceId !== "string") {
      errors.push("O ledger externo contém evento sem evidenceId válido.");
      continue;
    }
    if (evidenceIds.has(event.evidenceId)) duplicateEvidenceIds.add(event.evidenceId);
    evidenceIds.add(event.evidenceId);
  }
  if (duplicateEvidenceIds.size > 0) {
    errors.push(`externalEvidenceLedger contém IDs duplicados: ${[...duplicateEvidenceIds].slice(0, 5).join(", ")}.`);
  }

  const concursoIds = new Set(backup.dados.concursos.map((item) => item.id));
  const disciplinaIds = new Set(backup.dados.disciplinas.map((item) => item.id));
  const assuntoIds = new Set(backup.dados.assuntos.map((item) => item.id));
  const subassuntoIds = new Set(backup.dados.subassuntos.map((item) => item.id));
  const questaoIds = new Set(backup.dados.questoes.map((item) => item.id));
  const tentativaIds = new Set(backup.dados.tentativasQuestoes.map((item) => item.id));

  for (const item of backup.dados.disciplinas) if (!concursoIds.has(item.concursoId)) errors.push(`Disciplina ${item.id} referencia concurso inexistente.`);
  for (const item of backup.dados.assuntos) if (!disciplinaIds.has(item.disciplinaId)) errors.push(`Assunto ${item.id} referencia disciplina inexistente.`);
  for (const item of backup.dados.subassuntos) if (!assuntoIds.has(item.assuntoId)) errors.push(`Subassunto ${item.id} referencia assunto inexistente.`);
  for (const item of backup.dados.tentativasQuestoes) {
    if (!item.registradaManualmente && !questaoIds.has(item.questaoId)) {
      errors.push(`Tentativa ${item.id} referencia questão inexistente.`);
    }
  }
  for (const item of backup.dados.cronogramasRevisao) if (!subassuntoIds.has(item.subassuntoId)) errors.push(`Revisão ${item.id} referencia subassunto inexistente.`);
  for (const item of backup.dados.casosRecuperacaoErro) {
    if (!subassuntoIds.has(item.subassuntoId)) errors.push(`Caso de recuperação ${item.id} referencia subassunto inexistente.`);
    const duplicateEvents = duplicateIds(item.events ?? []);
    if (duplicateEvents.length > 0) errors.push(`Caso de recuperação ${item.id} contém eventos duplicados: ${duplicateEvents.slice(0, 5).join(", ")}.`);
    for (const event of item.events ?? []) {
      for (const attemptId of event.attemptIds ?? []) {
        if (!tentativaIds.has(attemptId)) errors.push(`Evento ${event.id} referencia tentativa inexistente ${attemptId}.`);
      }
    }
  }

  const priorEvidenceIds = new Set<string>();
  for (const event of backup.dados.externalEvidenceLedger) {
    if (!disciplinaIds.has(event.disciplineId)) errors.push(`Evidência ${event.evidenceId} referencia disciplina inexistente.`);
    if (!assuntoIds.has(event.topicId)) errors.push(`Evidência ${event.evidenceId} referencia assunto inexistente.`);
    if (event.subtopicId && !subassuntoIds.has(event.subtopicId)) errors.push(`Evidência ${event.evidenceId} referencia subassunto inexistente.`);
    if (event.affectsSde === true && event.decisionStatus !== "eligible_for_future_sde") {
      errors.push(`Evidência ${event.evidenceId} afeta o SDE sem elegibilidade determinística.`);
    }
    if (event.affectsSde === true) {
      const total = event.totalQuestions ?? event.actualQuestions ?? 0;
      const sum = (event.correctAnswers ?? 0) + (event.wrongAnswers ?? 0) + (event.blankAnswers ?? 0);
      if (total <= 0 || sum !== total || event.source === "notebooklm" || event.evidenceType === "guided_retrieval") {
        errors.push(`Evidência ${event.evidenceId} marcada para o SDE sem resultado objetivo válido.`);
      }
    }
    if (event.supersedesEvidenceId && !priorEvidenceIds.has(event.supersedesEvidenceId)) {
      errors.push(`Evidência ${event.evidenceId} substitui evento inexistente ou posterior.`);
    }
    if (event.voidsEvidenceId && !priorEvidenceIds.has(event.voidsEvidenceId)) {
      errors.push(`Evidência ${event.evidenceId} anula evento inexistente ou posterior.`);
    }
    if ([event.sourceReference, event.sourceLabel, event.notes, event.difficultPoints].some(containsSensitiveExternalData)) {
      errors.push(`Evidência ${event.evidenceId} contém dado externo sensível ou HTML não permitido.`);
    }
    priorEvidenceIds.add(event.evidenceId);
  }


  const decisionIds = new Set<string>();
  for (const decision of backup.dados.sdeDecisionLedger ?? []) {
    if (!decision?.decisionId || typeof decision.decisionId !== "string") {
      errors.push("O ledger de decisões contém registro sem decisionId válido.");
      continue;
    }
    if (decisionIds.has(decision.decisionId)) errors.push(`sdeDecisionLedger contém ID duplicado: ${decision.decisionId}.`);
    decisionIds.add(decision.decisionId);
    if (decision.sdeVersion !== "2.0") errors.push(`Decisão ${decision.decisionId} possui versão não suportada.`);
  }

  const checksum = backup.metadata.checksum;
  if (checksum) {
    if (backup.metadata.integrityAlgorithm !== "FNV1A64_CANONICAL_JSON") errors.push("Algoritmo de integridade do backup não suportado.");
    else if (calculateBackupChecksum(backup) !== checksum) errors.push("Checksum do backup não confere; o arquivo pode estar truncado ou alterado.");
  } else {
    warnings.push("Backup legado sem checksum; a estrutura foi validada, mas corrupção byte a byte não pode ser detectada.");
  }

  return { valid: errors.length === 0, errors, warnings };
}
