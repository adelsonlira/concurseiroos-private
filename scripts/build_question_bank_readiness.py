#!/usr/bin/env python3
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORPUS = ROOT / "data/evidence/dataprev-2026-perfil-3/fgv-exams-37"
OUT = ROOT / "data/evidence/dataprev-2026-perfil-3/fgv-gabaritos/question-bank-readiness.json"

rows = []
for path in sorted(CORPUS.glob("wave*/wave*-question-corpus.ndjson")):
    with path.open(encoding="utf-8") as handle:
        rows.extend(json.loads(line) for line in handle if line.strip())

keyed = [row for row in rows if row.get("answerKeyMatchStatus") == "EXACT_TITLE_AND_CADERNO_MATCH"]
analytic = [
    row for row in keyed
    if row.get("classificationStatus") == "MANUALLY_REVIEWED"
    and row.get("primaryTopicId")
    and row.get("primarySubtopicId")
    and row.get("answerKeyOption")
    and not row.get("duplicateType")
]

summary = {
    "schemaVersion": "1.0.0",
    "totalCorpusRecords": len(rows),
    "exactAnswerKeyRecords": len(keyed),
    "manuallyReviewedAnalyticEligibleRecords": len(analytic),
    "uniqueAnalyticEligibleRecords": len({row["canonicalQuestionHash"] for row in analytic}),
    "inAppPracticeEligibleRecords": 0,
    "reasonInAppPracticeIsZero": "The curated corpus stores excerpts and provenance, not complete stems and all alternatives.",
    "analyticEligibleByAnswerKeyStatus": dict(Counter(row.get("answerKeyStatus") for row in analytic)),
    "analyticEligibleByExam": dict(Counter(row.get("sourceFilename") for row in analytic)),
    "policy": {
        "manualSyllabusReviewRequired": True,
        "exactTitleAndCadernoKeyRequired": True,
        "canonicalRecordRequired": True,
        "completeQuestionAndOptionsRequiredForPractice": True,
        "preliminaryKeysMustRemainMarkedProvisional": True,
        "mayDriveStrategicIncidence": False
    }
}
OUT.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, ensure_ascii=False, indent=2))
