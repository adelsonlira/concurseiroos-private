/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- CONFIGURAÇÃO DO STRATEGIC DECISION ENGINE (SDE) ---
//
// Every numeric parameter in this object is catalogued by
// src/core/sde/validation/parameterCatalog.ts. Values are operational or
// heuristic unless an individual competition package supplies an official rule.

export const SDE_CONFIG = {
  // Evidence interpretation. These thresholds classify observability and
  // confidence; they do not assert that knowledge has been mastered.
  EVIDENCE: {
    OBSERVED_MIN_SAMPLE_SIZE: 5,
    MEDIUM_CONFIDENCE_MIN_SAMPLE_SIZE: 20,
    HIGH_CONFIDENCE_MIN_SAMPLE_SIZE: 101,
    HIGH_CONFIDENCE_MAX_AGE_DAYS: 15,
    CONFIDENCE_RECENCY_SCALE_DAYS: 45,
    MISSING_DATE_RECENCY_FACTOR: 0.5,
  },

  // Eligibility thresholds protect the learner from impossible transitions and
  // prevent a weak result from being treated as conclusive without context.
  ELIGIBILITY: {
    LOW_PERFORMANCE_HIT_RATE: 0.50,
    STRONG_THEORY_REMEDIATION_MIN_SAMPLE_SIZE: 41,
    PRACTICE_MIN_HIT_RATE: 0.50,
    HIGH_DECAY_THRESHOLD: 0.20,
    PERFORMANCE_DROP_MIN_ATTEMPTS: 6,
    PERFORMANCE_DROP_THRESHOLD: 0.20,
    REVISION_EXPIRED_DAYS: 30,
    THEORY_OVERSTUDY_HIT_RATE: 0.85,
    ZERO_DISCIPLINE_SAFETY_MIN_SAMPLE_SIZE: 5,
  },

  // Cross-topic prerequisite protection.
  CONSTRAINTS: {
    PREREQUISITE_MIN_HIT_RATE: 0.50,
  },

  // Priority Score Constants
  PRIORITY_SCORE: {
    PESO_EDITAL_MULT: 1.0,
    INCIDENCIA_MULT: 15,
    DEFICIENCIA_MULT: 20,
    RISCO_ESQUECIMENTO_MULT: 15,
    FORGETTING_RECENCY_DAILY_MULTIPLIER: 0.05,

    LEARNING_LEVERAGE_GOLDEN_SCORE: 15,
    LEARNING_LEVERAGE_SUB_GOLDEN_SCORE: 10,
    LEARNING_LEVERAGE_HIGH_SCORE: 8,
    LEARNING_LEVERAGE_MASTERED_SCORE: 2,

    RISCO_ELIMINACAO_CRITICAL_SCORE: 30,
    RISCO_ELIMINACAO_WARN_SCORE: 20,

    MAX_DEPENDENCIES_BONUS: 10,
    DEPENDENCY_MULTIPLIER: 3.3,

    CONFIDENCE_DIAGNOSTIC_THRESHOLD: 0.5,
    CONFIDENCE_DIAGNOSTIC_BOOST: 25,
    CONFIDENCE_DIAGNOSTIC_PENALTY: 10,

    FLASHCARD_RISK_THRESHOLD: 5,
    FLASHCARD_HIT_RATE_THRESHOLD: 0.40,
    FLASHCARD_INAPPROPRIATE_PENALTY: 15,

    THEORY_MASTERED_HIT_RATE_THRESHOLD: 0.80,
    THEORY_MASTERED_PENALTY: 30,

    CONSTITUTIONAL_HIGH_TOPIC_WEIGHT_THRESHOLD: 4,
    CONSTITUTIONAL_HIGH_INCIDENCE_THRESHOLD: 0.40,
    CONSTITUTIONAL_RETURN_INCIDENCE_THRESHOLD: 0.25,
    CONSTITUTIONAL_HIGH_GAP_HIT_RATE: 0.60,
    CONSTITUTIONAL_RETURN_MIN_HIT_RATE: 0.50,
    CONSTITUTIONAL_RETURN_MAX_HIT_RATE: 0.75,
    CONSTITUTIONAL_MEMORY_DECAY_THRESHOLD: 0.50,
  }
} as const;

export const DEFAULT_OPPORTUNITY_COST_POLICY = {
  minimumComparableActions: 2,
  durationToleranceRatio: 0.5,
} as const;

export const DEFAULT_LEARNING_LEVERAGE_POLICY = {
  lowPerformanceUpperBound: 0.40,
  leverageZoneLowerBound: 0.55,
  leverageZoneUpperBound: 0.75,
  masteredLowerBound: 0.85,
} as const;
