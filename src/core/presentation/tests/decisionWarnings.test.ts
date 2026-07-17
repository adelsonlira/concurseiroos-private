import { describe, expect, it } from "vitest";
import { presentDecisionWarning } from "../decisionWarnings";

describe("decision warning presentation", () => {
  it("distingue limite oficial de pendência de desenvolvimento", () => {
    const result = presentDecisionWarning("O edital não informa a distribuição por assunto.");
    expect(result.label).toBe("Limite do edital");
    expect(result.blocksStudy).toBe(false);
  });

  it("marca incidência histórica como pesquisa em shadow mode", () => {
    expect(presentDecisionWarning("A matriz histórica permanece em shadow mode.").kind).toBe("SHADOW_RESEARCH");
  });

  it("classifica duração de sessão como nota operacional", () => {
    expect(presentDecisionWarning("As durações são blocos operacionais.").kind).toBe("OPERATIONAL_NOTE");
  });
});
