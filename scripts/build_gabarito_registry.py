#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import fitz

SCHEMA_VERSION = "1.0.0"
CONCURSO_ID = "dataprev-2026-perfil-3"

@dataclass(frozen=True)
class TargetSpec:
    source_exam_filename: str
    gabarito_filename: str
    heading_pattern: str
    question_count: int
    required_page_context: str | None = None
    status_override: str | None = None
    provenance_note: str | None = None

TARGETS = [
    TargetSpec(
        "analista_de_tecnologia_da_informacao_desenvolvimento_de_software.pdf",
        "gabarito dataprev.pdf",
        r"(?:ATI|Analista de Tecnologia da Informação)\s*-\s*DESENVOLVIMENTO DE SOFTWARE\s*-\s*(?:PROVA\s+)?TIPO 1",
        70,
        status_override="DEFINITIVE",
        provenance_note="Arquivo definitivo fornecido pelo usuário e conferido contra cargo, tipo e quadro de respostas.",
    ),
    TargetSpec(
        "auditor_de_controle_externo_informatica_analista_de_sistemas.pdf",
        "gabarito TCE-PA 2024.pdf",
        r"AUDITOR DE CONTROLE EXTERNO\s*-\s*ÁREA(?: DE)? INFORMÁTICA\s*(?:/|-)\s*ANALISTA DE SISTEMAS\s*-\s*(?:PROVA\s+)?TIPO 1",
        100,
        status_override="DEFINITIVE",
        provenance_note="Arquivo definitivo fornecido pelo usuário e conferido contra cargo, tipo e quadro de respostas.",
    ),
    TargetSpec(
        "analista_legislativo_desenvolvedor_de_sistemas.pdf",
        "gabarito - ALEP.pdf",
        r"ANALISTA LEGISLATIVO\s*-\s*DESENVOLVEDOR DE SISTEMAS\s*-\s*(?:PROVA\s+)?TIPO 1",
        70,
        status_override="DEFINITIVE",
        provenance_note="A página oficial da FGV classifica o arquivo como gabarito definitivo; o cabeçalho interno do PDF mantém, por inconsistência editorial, a palavra preliminar.",
    ),
    TargetSpec(
        "analista_judiciario_area_apoio_especializado_especialidade_analise_de_sistemas_de_informacao.pdf",
        "gabarito_preliminar - TRF 1.pdf",
        r"Analista Judiciário\s*-\s*Área Apoio Especializado\s*-\s*(?:Especialidade:\s*)?Análise de Sistemas de Informação\s*-\s*TIPO 1",
        80,
        status_override="DEFINITIVE",
        provenance_note="Arquivo definitivo fornecido pelo usuário e conferido contra cargo, tipo e quadro de respostas.",
    ),
    TargetSpec(
        "analista_judiciario_apoio_especializado_tecnologia_da_informacao_desenvolvimento_de_sistemas.pdf",
        "gabarito_definitivo TJAP.pdf",
        r"Analista Judiciário\s*-\s*Área Apoio Especializado\s*-\s*Especialidade Tecnologia da Informação\s*-\s*Desenvolvimento de Sistemas\s*-\s*TIPO 1",
        80,
        status_override="DEFINITIVE",
        provenance_note="Arquivo definitivo fornecido pelo usuário e conferido contra cargo, tipo e quadro de respostas.",
    ),
    TargetSpec(
        "analista_do_mpu_desenvolvimento_de_sistemas.pdf",
        "gabarito MPU.pdf",
        r"(?:A06\s*-\s*)?Analista do MPU\s*-\s*Desenvolvimento de Sistemas\s*-\s*(?:TIPO\s*)?1",
        80,
        status_override="DEFINITIVE",
        provenance_note="Arquivo definitivo fornecido pelo usuário e conferido contra cargo, tipo e quadro de respostas.",
    ),
    TargetSpec(
        "analista_em_tecnologia_da_informacao_desenvolvimento_de_sistemas.pdf",
        "gabarito_definitivo - Baneste.pdf",
        r"Analista em Tecnologia da Informação\s*-\s*Desenvolvimento de Sistemas\s*[–-]\s*Tipo 1",
        60,
    ),
    TargetSpec(
        "analista_previdenciario_especialidade_analista_de_sistemas.pdf",
        "gabarito_preliminar MACAEPREV.pdf",
        r"ANALISTA PREVIDENCIÁRIO\s*-\s*ESPECIALIDADE ANALISTA DE SISTEMAS\s+PROVA TIPO 1",
        70,
    ),
    TargetSpec(
        "analista_judiciario_desenvolvimento_de_sistemas.pdf",
        "gabarito TJRR.pdf",
        r"ANALISTA JUDICIÁRIO\s*-\s*DESENVOLVIMENTO DE SISTEMA(?:S)?\s+PROVA TIPO 1",
        70,
    ),
    TargetSpec(
        "analista_cvm_perfil_8_ti_sistemas_e_desenvolvimento_tarde.pdf",
        "gabaritos_preliminares CVM.pdf",
        r"Analista CVM\s*-\s*Perfil 8\s*-\s*TI\s*-\s*Sistemas e Desenvolvimento\s*-\s*Tipo 1",
        70,
        required_page_context="TARDE",
    ),
    TargetSpec(
        "DPERS - analista_area_de_apoio_especializado_tecnologia_da_informacao_desenvolvimento_de_sistemas.pdf",
        "gabarito_oficial DPE RS.pdf",
        r"Analista\s*-\s*Área de Apoio Especializado\s*-\s*Tecnologia da Informação\s*-\s*Desenvolvimento de Sistemas\s*-\s*TIPO 1",
        70,
    ),
    TargetSpec(
        "analista_judiciario_tecnologia_de_informacao_analise_de_sistemas.pdf",
        "gabarito TJRN.pdf",
        r"Analista Judiciário\s*-\s*Apoio Especializado\s*-\s*Especialidade\s*-\s*Tecnologia de Informação\s*-\s*Análise de Sistemas\s*-\s*TIPO 1",
        70,
    ),
]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("–", "-").replace("—", "-")).strip()


def normalized_document_text_hash(path: Path) -> str:
    with fitz.open(path) as doc:
        text = "\n".join(normalize_text(page.get_text("text")) for page in doc)
    # Mirror watermarks/timestamps can vary while the key content remains identical.
    text = re.sub(r"pcimarkpci\s+\S+", "", text, flags=re.I)
    text = re.sub(r"www\.pciconcursos\.com\.br", "", text, flags=re.I)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def classify_status(document_text: str) -> str:
    upper = document_text.upper()
    if "GABARITO DEFINITIVO" in upper or "GABARITOS DEFINITIVOS" in upper:
        return "DEFINITIVE"
    if "GABARITO PRELIMINAR" in upper or "GABARITOS PRELIMINARES" in upper or "GABARITO PRELIMINARES" in upper:
        return "PRELIMINARY"
    if "GABARITO OFICIAL" in upper:
        return "PUBLISHED_AS_OFFICIAL"
    return "PUBLISHED_UNQUALIFIED"


def parse_answer_blocks(text: str, question_count: int) -> dict[int, str]:
    tokens = re.findall(r"\*|[A-E]|\d{1,3}", text.upper())
    answers: dict[int, str] = {}
    i = 0
    while i < len(tokens):
        if tokens[i] != "1" and not (tokens[i].isdigit() and int(tokens[i]) in {21, 41, 61, 81}):
            i += 1
            continue
        start = int(tokens[i])
        nums = [start]
        j = i + 1
        while j < len(tokens) and tokens[j].isdigit() and int(tokens[j]) == nums[-1] + 1:
            nums.append(int(tokens[j]))
            j += 1
        if len(nums) < 10:
            i += 1
            continue
        values = []
        k = j
        while k < len(tokens) and len(values) < len(nums) and tokens[k] in {"A", "B", "C", "D", "E", "*"}:
            values.append(tokens[k])
            k += 1
        if len(values) != len(nums):
            i += 1
            continue
        for number, value in zip(nums, values):
            if 1 <= number <= question_count:
                answers[number] = value
        i = k

    # Some official answer keys are extracted by PDF engines as number/answer
    # pairs ("1 C 2 D ...") instead of a row of numbers followed by a row of
    # answers. Merge this layout only for still-missing question numbers.
    for number_raw, answer in re.findall(r"(?<!\d)(\d{1,3})\s+([A-E]|\*)", text.upper()):
        number = int(number_raw)
        if 1 <= number <= question_count and number not in answers:
            answers[number] = answer
    return answers


def extract_target(spec: TargetSpec, root: Path) -> dict:
    path = root / spec.gabarito_filename
    if not path.exists():
        return {
            "sourceExamFilename": spec.source_exam_filename,
            "gabaritoSourceFileName": spec.gabarito_filename,
            "matchStatus": "SOURCE_FILE_MISSING",
        }
    source_sha = sha256_file(path)
    with fitz.open(path) as doc:
        full_text = "\n".join(page.get_text("text") for page in doc)
        detected_status = classify_status(full_text)
        status = spec.status_override or detected_status
        pattern = re.compile(spec.heading_pattern, re.I)
        for page_index in range(len(doc)):
            page_text = normalize_text(doc[page_index].get_text("text"))
            if spec.required_page_context and spec.required_page_context.upper() not in page_text.upper():
                continue
            match = pattern.search(page_text)
            if not match:
                continue
            segment = page_text[match.start():]
            # The next type or next role marks the end of the target Type 1 block.
            next_type = re.search(r"\b(?:PROVA\s+)?TIPO\s+2\b", segment, re.I)
            if next_type:
                segment = segment[:next_type.start()]
            answers = parse_answer_blocks(segment, spec.question_count)
            if len(answers) != spec.question_count:
                return {
                    "id": f"key-{source_sha[:12]}-{hashlib.sha1(spec.source_exam_filename.encode()).hexdigest()[:8]}",
                    "schemaVersion": SCHEMA_VERSION,
                    "concursoId": CONCURSO_ID,
                    "sourceExamFilename": spec.source_exam_filename,
                    "gabaritoSourceFileName": spec.gabarito_filename,
                    "gabaritoSourceSha256": source_sha,
                    "documentStatus": status,
                    "cadernoType": 1,
                    "expectedQuestionCount": spec.question_count,
                    "parsedAnswerCount": len(answers),
                    "answers": {str(k): v for k, v in sorted(answers.items())},
                    "annulledQuestions": [k for k, v in sorted(answers.items()) if v == "*"],
                    "sourcePage": page_index + 1,
                    "matchStatus": "PARTIAL_PARSE_REVIEW_REQUIRED",
                    "sourceNature": "OFFICIAL_FGV_PUBLICATION_USER_SUPPLIED" if spec.status_override else "THIRD_PARTY_MIRROR_OF_PUBLISHED_KEY",
                    "detectedDocumentStatus": detected_status,
                    "provenanceNote": spec.provenance_note,
                }
            return {
                "id": f"key-{source_sha[:12]}-{hashlib.sha1(spec.source_exam_filename.encode()).hexdigest()[:8]}",
                "schemaVersion": SCHEMA_VERSION,
                "concursoId": CONCURSO_ID,
                "sourceExamFilename": spec.source_exam_filename,
                "gabaritoSourceFileName": spec.gabarito_filename,
                "gabaritoSourceSha256": source_sha,
                "documentStatus": status,
                "cadernoType": 1,
                "expectedQuestionCount": spec.question_count,
                "parsedAnswerCount": len(answers),
                "answers": {str(k): v for k, v in sorted(answers.items())},
                "annulledQuestions": [k for k, v in sorted(answers.items()) if v == "*"],
                "sourcePage": page_index + 1,
                "matchStatus": "EXACT_TITLE_AND_CADERNO_MATCH",
                "sourceNature": "OFFICIAL_FGV_PUBLICATION_USER_SUPPLIED" if spec.status_override else "THIRD_PARTY_MIRROR_OF_PUBLISHED_KEY",
                "detectedDocumentStatus": detected_status,
                "provenanceNote": spec.provenance_note,
            }
    return {
        "sourceExamFilename": spec.source_exam_filename,
        "gabaritoSourceFileName": spec.gabarito_filename,
        "gabaritoSourceSha256": source_sha,
        "documentStatus": spec.status_override or classify_status(full_text),
        "detectedDocumentStatus": classify_status(full_text),
        "cadernoType": 1,
        "expectedQuestionCount": spec.question_count,
        "parsedAnswerCount": 0,
        "answers": {},
        "annulledQuestions": [],
        "sourcePage": None,
        "matchStatus": "TARGET_HEADING_NOT_FOUND",
        "sourceNature": "OFFICIAL_FGV_PUBLICATION_USER_SUPPLIED" if spec.status_override else "THIRD_PARTY_MIRROR_OF_PUBLISHED_KEY",
        "provenanceNote": spec.provenance_note,
    }


def build_registry(root: Path) -> dict:
    records = [extract_target(spec, root) for spec in TARGETS]
    mirror_files = []
    groups: dict[str, list[str]] = {}
    for path in sorted(root.glob("*.pdf")):
        content_hash = normalized_document_text_hash(path)
        groups.setdefault(content_hash, []).append(path.name)
        mirror_files.append({
            "fileName": path.name,
            "sha256": sha256_file(path),
            "normalizedTextSha256": content_hash,
        })
    duplicate_groups = [names for names in groups.values() if len(names) > 1]
    return {
        "schemaVersion": SCHEMA_VERSION,
        "concursoId": CONCURSO_ID,
        "sourcePolicy": {
            "sourceNature": "MIXED_OFFICIAL_USER_SUPPLIED_AND_THIRD_PARTY_MIRRORS",
            "exactCadernoRequired": True,
            "preliminaryKeyMayBeSuperseded": True,
            "mayDriveQuestionCorrectionOnlyWhenMatchStatusExact": True,
            "mayDriveStrategicIncidence": False,
        },
        "records": records,
        "sourceFiles": mirror_files,
        "duplicateContentGroups": duplicate_groups,
    }


def apply_to_corpora(registry: dict, corpus_root: Path) -> dict:
    record_by_exam = {
        record["sourceExamFilename"]: record
        for record in registry["records"]
        if record.get("matchStatus") == "EXACT_TITLE_AND_CADERNO_MATCH"
    }
    changed_files = []
    total_questions = 0
    keyed_questions = 0
    for path in sorted(corpus_root.rglob("*-question-corpus.ndjson")):
        output_lines = []
        changed = 0
        for raw in path.read_text(encoding="utf-8").splitlines():
            if not raw.strip():
                continue
            record = json.loads(raw)
            total_questions += 1
            key = record_by_exam.get(record.get("sourceFilename"))
            if key:
                answer = key["answers"].get(str(record.get("questionNumber")))
                if answer is not None:
                    record["answerKeyStatus"] = key["documentStatus"]
                    record["answerKeyOption"] = answer
                    record["answerKeySourceId"] = key["id"]
                    record["answerKeyMatchStatus"] = key["matchStatus"]
                    keyed_questions += 1
                    changed += 1
            output_lines.append(json.dumps(record, ensure_ascii=False))
        path.write_text("\n".join(output_lines) + "\n", encoding="utf-8")
        changed_files.append({"file": str(path), "recordsUpdated": changed})
    return {
        "corpusFilesProcessed": len(changed_files),
        "totalCorpusRecords": total_questions,
        "recordsWithAnswerKey": keyed_questions,
        "files": changed_files,
    }


def write_csv(registry: dict, path: Path) -> None:
    fields = ["sourceExamFilename", "gabaritoSourceFileName", "documentStatus", "cadernoType", "expectedQuestionCount", "parsedAnswerCount", "annulledQuestions", "sourcePage", "matchStatus"]
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for record in registry["records"]:
            writer.writerow({
                key: (",".join(map(str, record.get(key, []))) if key == "annulledQuestions" else record.get(key))
                for key in fields
            })


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--gabarito-root", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--corpus-root", type=Path)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    registry = build_registry(args.gabarito_root)
    coverage = None
    if args.corpus_root:
        coverage = apply_to_corpora(registry, args.corpus_root)
    (args.output_dir / "fgv-gabarito-registry.json").write_text(json.dumps(registry, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(registry, args.output_dir / "fgv-gabarito-registry.csv")
    summary = {
        "records": len(registry["records"]),
        "exactMatches": sum(r.get("matchStatus") == "EXACT_TITLE_AND_CADERNO_MATCH" for r in registry["records"]),
        "definitive": sum(r.get("documentStatus") == "DEFINITIVE" for r in registry["records"]),
        "preliminary": sum(r.get("documentStatus") == "PRELIMINARY" for r in registry["records"]),
        "publishedUnqualified": sum(r.get("documentStatus") == "PUBLISHED_UNQUALIFIED" for r in registry["records"]),
        "officialUserSupplied": sum(r.get("sourceNature") == "OFFICIAL_FGV_PUBLICATION_USER_SUPPLIED" for r in registry["records"]),
        "headerStatusMismatches": sum(
            bool(r.get("detectedDocumentStatus")) and r.get("detectedDocumentStatus") != r.get("documentStatus")
            for r in registry["records"]
        ),
        "annulledQuestions": sum(len(r.get("annulledQuestions", [])) for r in registry["records"]),
        "duplicateContentGroups": registry["duplicateContentGroups"],
        "corpusCoverage": coverage,
    }
    (args.output_dir / "fgv-gabarito-summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
