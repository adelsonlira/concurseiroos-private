import type { PrioritizedReviewQueueItem, ReviewQueueCandidate } from "./types";

const ISSUE_WEIGHT = {
  ANSWER_KEY: 24,
  EXTRACTION: 22,
  DUPLICATE: 12,
  CLASSIFICATION: 16,
  EQUIVALENCE: 14,
} as const;

export function prioritizeReviewQueue(
  candidates: readonly ReviewQueueCandidate[],
): PrioritizedReviewQueueItem[] {
  return candidates
    .map((candidate) => {
      const reasons: string[] = [];
      let score = 0;
      const normalizedContest = (candidate.contestSlug ?? "").toLocaleLowerCase("pt-BR");
      const normalizedRole = (candidate.roleLabel ?? "").toLocaleLowerCase("pt-BR");
      const isDataprevReference = normalizedContest.includes("dataprev") && candidate.examYear === 2024;
      const isDevelopment = normalizedRole.includes("desenvolvimento") || normalizedRole.includes("software");

      if (isDataprevReference) {
        score += 100;
        reasons.push("Prova de referência DATAPREV 2024.");
      }
      if (isDevelopment) {
        score += 35;
        reasons.push("Cargo diretamente relacionado a desenvolvimento de software.");
      }

      const proximity = candidate.technicalProximity ?? "UNKNOWN";
      const proximityWeight = { TARGET: 70, HIGH: 40, MEDIUM: 20, LOW: 5, UNKNOWN: 0 }[proximity];
      score += proximityWeight;
      if (proximityWeight > 0) reasons.push(`Proximidade técnica ${proximity.toLowerCase()}.`);

      for (const issue of [...new Set(candidate.issueKinds)]) {
        score += ISSUE_WEIGHT[issue];
      }
      if (candidate.issueKinds.length > 0) reasons.push(`Pendências: ${[...new Set(candidate.issueKinds)].join(", ")}.`);

      const unresolved = Math.max(0, candidate.unresolvedCount ?? 0);
      score += Math.min(20, unresolved);
      if (unresolved > 0) reasons.push(`${unresolved} item(ns) ainda não resolvido(s).`);

      const priorityBand: PrioritizedReviewQueueItem["priorityBand"] = score >= 100
        ? "P0_TARGET"
        : score >= 65
          ? "P1_HIGH"
          : score >= 30
            ? "P2_MEDIUM"
            : "P3_BACKLOG";

      return { ...candidate, priorityScore: score, priorityBand, reasons };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore || a.id.localeCompare(b.id));
}
