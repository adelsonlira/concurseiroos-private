#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

import fitz

SCHEMA_VERSION = "1.0.0"
CONCURSO_ID = "dataprev-2026-perfil-3"
DISCIPLINE = "dp26-p3-conhecimentos-especificos"

TOPIC_DEVELOPMENT = "dp26-p3-esp-desenvolvimento-sistemas"
TOPIC_SECURITY = "dp26-p3-esp-seguranca"
TOPIC_DATABASE = "dp26-p3-esp-banco-dados"
TOPIC_BI = "dp26-p3-esp-bi"

MAPPING_RULES = [
    (r"aula 30", TOPIC_DEVELOPMENT, ["dp26-p3-esp-metricas"], 0.99),
    (r"aula 49", TOPIC_DEVELOPMENT, ["dp26-p3-esp-padroes-reuso"], 0.99),
    (r"aula 51", TOPIC_SECURITY, ["dp26-p3-esp-si-acesso"], 0.99),
    (r"aula 52", TOPIC_SECURITY, ["dp26-p3-esp-si-sdl-owasp"], 0.99),
    (r"aula 07", TOPIC_BI, ["dp26-p3-esp-bi-dw-mining"], 0.98),
    (r"aula 06", TOPIC_BI, [], 0.94),
    (r"aula 01", TOPIC_DATABASE, [], 0.94),
]

BANKS = {
    "fgv": "FGV",
    "cebraspe": "CEBRASPE",
    "cespe": "CEBRASPE",
    "fcc": "FCC",
    "vunesp": "VUNESP",
    "aocp": "INSTITUTO_AOCP",
    "idib": "IDIB",
    "outras bancas": "OUTRAS_BANCAS",
}


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower().replace("–", "-").replace("—", "-")
    return re.sub(r"\s+", " ", text).strip()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def is_pdf(path: Path) -> bool:
    try:
        return path.read_bytes()[:5] == b"%PDF-"
    except OSError:
        return False


def infer_content_kind(filename: str) -> tuple[str, str | None]:
    n = normalize(filename)
    bank = "FGV" if "questoes fgv" in n else None
    if "resumo" in n:
        return "SUMMARY", None
    if "quest" in n:
        return "COMMENTED_QUESTIONS", bank
    return "THEORY", None


def infer_mapping(filename: str) -> tuple[str, list[str], float]:
    n = normalize(filename)
    for pattern, topic, subtopics, confidence in MAPPING_RULES:
        if re.search(pattern, n):
            return topic, list(subtopics), confidence
    raise ValueError(f"Arquivo TI Total sem regra de mapeamento: {filename}")


def infer_course_title(filename: str) -> str:
    n = filename
    n = re.sub(r"^[123]_TI TOTAL - Aula \d+ - ", "", n, flags=re.I)
    n = re.sub(r"^TI TOTAL - Aula \d+ - ", "", n, flags=re.I)
    n = re.sub(r"\.pdf$", "", n, flags=re.I)
    n = re.sub(r"\s+-\s+(Teoria|Questões|Resumo)$", "", n, flags=re.I)
    return n.strip()


def bank_from_title(title: str) -> str | None:
    n = normalize(title)
    for key, value in BANKS.items():
        if key in n:
            return value
    return None


def extract_toc_entries(doc: fitz.Document) -> list[tuple[str, str, int]]:
    lines = [
        line.strip()
        for index in range(min(3, len(doc)))
        for line in doc[index].get_text("text").splitlines()
        if line.strip()
    ]
    entries: list[tuple[str, str, int]] = []
    direct = re.compile(r"^(\d+(?:\.\d+)*\.?)\s+(.+?)\s+\.{3,}\s*(\d{1,4})$")
    numbered = re.compile(r"^(\d+(?:\.\d+)*\.?)$")
    title_page = re.compile(r"^(.+?)\s+\.{3,}\s*(\d{1,4})$")
    for index, line in enumerate(lines):
        match = direct.match(line)
        if match:
            number, title, page_raw = match.groups()
            entries.append((number.rstrip("."), re.sub(r"\s+", " ", title).strip(), int(page_raw)))
            continue
        number_match = numbered.match(line)
        if not number_match:
            continue
        for candidate in lines[index + 1:index + 4]:
            match = title_page.match(candidate)
            if match:
                title, page_raw = match.groups()
                entries.append((number_match.group(1).rstrip("."), re.sub(r"\s+", " ", title).strip(), int(page_raw)))
                break
            if numbered.match(candidate):
                break
    dedup: dict[tuple[str, int], tuple[str, str, int]] = {}
    for item in entries:
        if 1 <= item[2] <= len(doc):
            dedup.setdefault((item[0], item[2]), item)
    return sorted(dedup.values(), key=lambda item: (item[2], item[0]))


def sections_for(
    doc: fitz.Document,
    filename: str,
    topic_id: str,
    subtopic_ids: list[str],
    confidence: float,
) -> list[dict]:
    content_kind, file_bank = infer_content_kind(filename)
    toc = extract_toc_entries(doc)

    # Question books: keep banca slices when the sumário exposes them.
    if content_kind == "COMMENTED_QUESTIONS":
        bank_entries = [item for item in toc if bank_from_title(item[1])]
        if bank_entries:
            result = []
            for index, (_, title, start_page) in enumerate(bank_entries):
                next_page = bank_entries[index + 1][2] if index + 1 < len(bank_entries) else len(doc) + 1
                result.append({
                    "ordinal": index + 1,
                    "title": f"Questões comentadas — {title}",
                    "startPage": start_page,
                    "endPage": max(start_page, next_page - 1),
                    "contentKind": content_kind,
                    "questionBank": bank_from_title(title),
                    "disciplineId": DISCIPLINE,
                    "topicId": topic_id,
                    "subtopicIds": subtopic_ids,
                    "mappingStatus": "AUTO_HIGH_CONFIDENCE" if subtopic_ids else "TOPIC_ONLY",
                    "confidence": confidence,
                    "matchedTerms": [title],
                })
            return result

    # Theory with a usable table of contents: route page ranges by section.
    usable = [item for item in toc if item[0].count(".") <= 1]
    if content_kind == "THEORY" and len(usable) >= 2:
        result = []
        for index, (_, title, start_page) in enumerate(usable):
            next_page = usable[index + 1][2] if index + 1 < len(usable) else len(doc) + 1
            result.append({
                "ordinal": index + 1,
                "title": title,
                "startPage": start_page,
                "endPage": max(start_page, next_page - 1),
                "contentKind": content_kind,
                "questionBank": None,
                "disciplineId": DISCIPLINE,
                "topicId": topic_id,
                "subtopicIds": subtopic_ids,
                "mappingStatus": "AUTO_HIGH_CONFIDENCE" if subtopic_ids else "TOPIC_ONLY",
                "confidence": confidence,
                "matchedTerms": [infer_course_title(filename)],
            })
        return result

    return [{
        "ordinal": 1,
        "title": infer_course_title(filename),
        "startPage": 1,
        "endPage": len(doc),
        "contentKind": content_kind,
        "questionBank": file_bank,
        "disciplineId": DISCIPLINE,
        "topicId": topic_id,
        "subtopicIds": subtopic_ids,
        "mappingStatus": "AUTO_HIGH_CONFIDENCE" if subtopic_ids else "TOPIC_ONLY",
        "confidence": confidence,
        "matchedTerms": [infer_course_title(filename)],
    }]


def build_catalog(input_root: Path) -> tuple[dict, dict]:
    materials = []
    invalid = []
    for path in sorted(input_root.glob("*.pdf")):
        if not is_pdf(path):
            invalid.append({
                "sourceFileName": path.name,
                "sizeBytes": path.stat().st_size,
                "status": "INVALID_NOT_A_PDF",
                "note": "Extensão PDF com conteúdo XML NoSuchKey; excluído do catálogo operacional.",
            })
            continue
        with fitz.open(path) as doc:
            topic_id, subtopics, confidence = infer_mapping(path.name)
            source_hash = sha256_file(path)
            content_kind, _ = infer_content_kind(path.name)
            course_title = infer_course_title(path.name)
            materials.append({
                "id": f"titotal-{source_hash[:16]}",
                "schemaVersion": SCHEMA_VERSION,
                "concursoId": CONCURSO_ID,
                "sourceGroup": "TI Total — seleção DATAPREV",
                "sourceProvider": "TI_TOTAL",
                "sourceRole": "COMPLEMENTARY",
                "sourcePriority": 60,
                "sourceFileName": path.name,
                "sourceRelativePath": f"TI Total/{path.name}",
                "sourceSha256": source_hash,
                "sourcePortalCourseId": None,
                "lessonLabel": re.search(r"Aula (\d+)", path.name, re.I).group(1) if re.search(r"Aula (\d+)", path.name, re.I) else "Sem identificação",
                "courseTitle": course_title,
                "displayTitle": f"TI Total — {course_title}",
                "totalPages": len(doc),
                "textLayer": "NATIVE_TEXT",
                "disciplineId": DISCIPLINE,
                "topicId": topic_id,
                "sections": sections_for(doc, path.name, topic_id, subtopics, confidence),
                "rights": {
                    "classification": "PRIVATE_LICENSED_USER_COPY",
                    "sharingAllowed": False,
                    "contentExportAllowed": False,
                    "metadataExportAllowed": True,
                    "containsPersonalWatermark": True,
                    "retentionPolicy": "DERIVED_METADATA_ONLY",
                },
            })
    return ({"schemaVersion": SCHEMA_VERSION, "concursoId": CONCURSO_ID, "materials": materials},
            {"schemaVersion": SCHEMA_VERSION, "invalidFiles": invalid})


def build_summary(catalog: dict, invalid_manifest: dict) -> dict:
    materials = catalog["materials"]
    kinds = Counter()
    banks = Counter()
    subtopics = Counter()
    for material in materials:
        for section in material["sections"]:
            kinds[section["contentKind"]] += 1
            if section["questionBank"]:
                banks[section["questionBank"]] += 1
            for subtopic in section["subtopicIds"]:
                subtopics[subtopic] += 1
    return {
        "schemaVersion": SCHEMA_VERSION,
        "concursoId": CONCURSO_ID,
        "provider": "TI_TOTAL",
        "sourceRole": "COMPLEMENTARY",
        "materialCount": len(materials),
        "totalPages": sum(item["totalPages"] for item in materials),
        "sectionCount": sum(len(item["sections"]) for item in materials),
        "invalidFileCount": len(invalid_manifest["invalidFiles"]),
        "contentKindCounts": dict(sorted(kinds.items())),
        "questionBankSectionCounts": dict(sorted(banks.items())),
        "mappedSubtopicCounts": dict(sorted(subtopics.items())),
        "privacy": {
            "rawPdfIncludedInDerivedCatalog": False,
            "rawTextIncludedInDerivedCatalog": False,
            "personalIdentifierIncluded": False,
            "retentionPolicy": "DERIVED_METADATA_ONLY",
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-root", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    catalog, invalid_manifest = build_catalog(args.input_root)
    summary = build_summary(catalog, invalid_manifest)
    (args.output_dir / "titotal-private-material-catalog.json").write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (args.output_dir / "titotal-private-material-summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (args.output_dir / "titotal-invalid-source-manifest.json").write_text(
        json.dumps(invalid_manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
