import { describe, expect, it } from "vitest";
import { buildCoachOperationalCommand } from "../index";

const prescription = {
  id: "p", sessionId: "s", sequence: 1, activity: "teoria" as const, durationMinutes: 40, disciplineId: "d", disciplineName: "D", topicId: "t", topicName: "T", subtopicId: "st", subtopicName: "Sub", actionId: "a", strategicPriority: 1, sourceScore: 1, reasonCode: "FIRST_CONTACT" as never, diagnosticPurpose: false, diagnosticFollowUp: null, whyNow: "x", confidence: "ALTA" as const, objectives: [], executionSteps: [], focusGuide: null, material: null, questionPractice: null, completionEvidence: [], decisionReliability: { level: "HIGH" as const, mode: "FIRST_CONTACT" as const, historicalIncidenceUsed: false, missingData: [], caveats: [] }, executionReadiness: { status: "READY_WITH_FALLBACK" as const, reason: "Use o material principal.", requiredResource: "MATERIAL" as const }, nextAction: { afterCompletion: "Registrar.", preview: null },
};

describe("operational coach", () => {
  it("não transfere a escolha do fallback ao estudante", () => {
    const command = buildCoachOperationalCommand({ prescription, timerRunning: false });
    expect(command.state).toBe("USE_FALLBACK");
    expect(command.decisionRequiredFromStudent).toBe(false);
  });
});
