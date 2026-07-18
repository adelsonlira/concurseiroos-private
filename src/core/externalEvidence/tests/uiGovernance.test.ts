import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const recorder = readFileSync(
  new URL("../../../components/ExternalAttemptRecorder.tsx", import.meta.url),
  "utf8",
);
const navigation = readFileSync(
  new URL("../../../navigation/navigationModel.ts", import.meta.url),
  "utf8",
);
const exerciseDesk = readFileSync(
  new URL("../../../components/ExerciseDeskView.tsx", import.meta.url),
  "utf8",
);
const focusDesk = readFileSync(
  new URL("../../../components/FocusModeDesk.tsx", import.meta.url),
  "utf8",
);

describe("external evidence UI governance", () => {
  it("renames the reused feature to Registrar resultado and keeps the old search alias", () => {
    expect(navigation).toContain('label: "Registrar resultado"');
    expect(navigation).toContain('"registrar questoes"');
  });

  it("shows the quick fields, details disclosure and non-decisional summary label", () => {
    for (const label of [
      "Fonte",
      "Disciplina",
      "Assunto",
      "Subassunto / item do edital",
      "Total de questões",
      "Acertos",
      "Erros",
      "Brancos",
      "Duração (min)",
      "Consulta a material?",
      "Principal causa dos erros",
      "Mais detalhes",
      "Evidências recentes",
      "Resumo descritivo — ainda não altera as decisões do SDE",
    ])
      expect(recorder).toContain(label);
  });

  it("offers correction and void actions but no physical delete action", () => {
    expect(recorder).toContain("Registrar correção");
    expect(recorder).toContain("Registrar anulação");
    expect(recorder).not.toContain("Excluir evidência");
    expect(recorder).not.toContain("registrarBateriaExterna");
  });

  it("links valid ledger evidence to prescription progress in both reused entry points", () => {
    for (const source of [exerciseDesk, focusDesk]) {
      expect(source).toContain("countExternalEvidenceQuestionsForContext");
      expect(source).toContain("externalEvidenceLedger");
    }
  });
});
