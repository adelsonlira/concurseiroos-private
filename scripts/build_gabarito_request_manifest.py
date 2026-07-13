from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_ROOT = ROOT / "data/evidence/dataprev-2026-perfil-3/fgv-exams-37"


def main() -> None:
    inventory = json.loads((DATA_ROOT / "fgv37-exam-inventory.json").read_text(encoding="utf-8"))
    rows = []
    for exam in inventory["exams"]:
        rank = exam["rank"]
        if rank <= 6:
            priority = "P0_ESSENCIAL" if rank == 1 else "P1_MUITO_ALTA"
        elif rank <= 15:
            priority = "P2_ALTA"
        elif rank <= 28:
            priority = "P3_SECUNDARIA"
        else:
            priority = "NAO_SOLICITAR_AGORA"
        if priority == "NAO_SOLICITAR_AGORA":
            purpose = "Não é necessário procurar neste momento; prova complementar ou controle negativo."
        elif rank == 1:
            purpose = "Mesma instituição e especialidade; necessário para distratores, anulações e simulado de referência."
        elif rank <= 15:
            purpose = "Prova de desenvolvimento/análise de sistemas com alta proximidade temática."
        else:
            purpose = "Ampliação posterior da análise de alternativas após concluir o núcleo A1/A2."
        rows.append({
            "priority": priority,
            "rank": rank,
            "examTitle": exam["cover_title"],
            "filename": exam["filename"],
            "tier": exam["relevance_tier"],
            "detectedYear": exam.get("detected_year") or "N/D",
            "declaredQuestionCount": exam.get("declared_total_questions") or "N/D",
            "whyNeeded": purpose,
            "status": "PENDING_USER_SEARCH" if rank <= 28 else "DEFERRED",
        })
    fields = list(rows[0].keys())
    with (DATA_ROOT / "fgv37-gabarito-request-manifest.csv").open("w", newline="", encoding="utf-8-sig") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    report = [
        "# Manifesto priorizado de gabaritos FGV",
        "",
        "Os gabaritos não são necessários para classificação temática, mas são necessários para validar alternativas, anulações, distratores e simulados internos.",
        "",
        "## Prioridade recomendada",
        "",
        "1. **P0 essencial:** prova DATAPREV Desenvolvimento de Software.",
        "2. **P1 muito alta:** cinco provas mais próximas seguintes (ranks 2 a 6).",
        "3. **P2 alta:** demais provas A2 (ranks 7 a 15).",
        "4. **P3 secundária:** somente depois, provas B (ranks 16 a 28).",
        "5. Provas C/D não precisam de gabarito agora.",
        "",
        "A busca pode ser feita gradualmente; não é necessário localizar os 37 gabaritos de uma vez.",
    ]
    (DATA_ROOT / "FGV37_GABARITO_REQUEST_PLAN.md").write_text("\n".join(report), encoding="utf-8")


if __name__ == "__main__":
    main()
