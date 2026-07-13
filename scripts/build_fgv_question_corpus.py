#!/usr/bin/env python3
"""Build a metadata-only draft corpus from user-provided FGV question PDFs.

The generated corpus intentionally omits question text and alternatives. It stores only
source provenance, question identifiers, rule matches and review status. The output is
NOT eligible to influence the SDE until manual review and validation are completed.

Usage:
    python scripts/build_fgv_question_corpus.py \
      --input-dir /path/to/pdfs \
      --output-dir data/evidence/dataprev-2026-perfil-3

Requires: PyMuPDF (fitz)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

import fitz

QUESTION_HEADER = re.compile(r"(?m)^Questão\s+(\d+)\s*$", re.IGNORECASE)
EXTERNAL_ID = re.compile(r"\b(4\d{9})\b")

# Conservative rules: only distinctive terms are used. A match is a candidate for
# human review, not a validated classification.
TOPIC_RULES: dict[str, tuple[str, ...]] = {
    "dp26-p3-esp-linguagens-frameworks": (
        r"\bjava\b", r"spring boot", r"spring cloud", r"\bspring\b", r"hibernate",
        r"jakarta", r"javaee", r"\bjpa\b", r"\bjsf\b", r"primefaces", r"\bjunit\b",
    ),
    "dp26-p3-esp-mobile-lowcode": (
        r"\bandroid\b", r"\bios\b", r"low[- ]code", r"no[- ]code", r"\bflutter\b",
    ),
    "dp26-p3-esp-clean-code-sonarqube": (
        r"clean code", r"sonarqube", r"code smell", r"analise estatica de codigo",
    ),
    "dp26-p3-esp-arquitetura-software": (
        r"arquitetura de software", r"\bsoa\b", r"web ?service", r"\bsoap\b",
        r"\bwsdl\b", r"mensageria", r"\bswagger\b", r"\bopenapi\b",
    ),
    "dp26-p3-esp-orientacao-objetos-web": (
        r"orientacao a objetos", r"\bpolimorfismo\b", r"\bencapsulamento\b",
        r"classe abstrata", r"fragile base class", r"sobrescrita", r"sobrecarga",
    ),
    "dp26-p3-esp-ambientes-web": (r"\bintranet\b", r"\bextranet\b", r"portal corporativo"),
    "dp26-p3-esp-padroes-dados-web": (r"\bxslt\b", r"\buddi\b", r"\brestful\b", r"\bjson\b"),
    "dp26-p3-esp-devops-git": (
        r"\bdevops\b", r"\bgit\b", r"integracao continua", r"entrega continua", r"\bci/cd\b",
    ),
    "dp26-p3-esp-testes": (
        r"testes? de software", r"teste unitario", r"teste de integracao", r"teste de sistema",
        r"teste de aceitacao", r"\btdd\b", r"\bbdd\b", r"\bjunit\b",
    ),
    "dp26-p3-esp-rpa": (r"\brpa\b", r"robotic process automation"),
    "dp26-p3-esp-metodologias-ageis": (
        r"\bscrum\b", r"\bkanban\b", r"extreme programming", r"product owner",
        r"scrum master", r"sprint backlog", r"work in progress", r"\bwip\b",
    ),
    "dp26-p3-esp-padroes-reuso": (
        r"design patterns?", r"padroes? de projeto", r"\bgof\b", r"\bsingleton\b",
        r"abstract factory", r"\bobserver\b", r"\bstrategy\b", r"\badapter\b",
        r"\bfacade\b", r"\bbuilder\b", r"\bmemento\b",
    ),
    "dp26-p3-esp-metricas": (
        r"pontos? de funcao", r"analise de pontos de funcao", r"\bapf\b", r"\bifpug\b",
        r"story points?",
    ),
    "dp26-p3-esp-requisitos": (
        r"engenharia de requisitos", r"requisitos? funcionais?", r"requisitos? nao funcionais?",
        r"elicitacao de requisitos", r"levantamento de requisitos", r"focus group",
    ),
    "dp26-p3-esp-frontend": (
        r"\bvuejs\b", r"\bangular\b", r"\breact\b", r"\bajax\b", r"\bspa\b", r"\bpwa\b",
        r"frontend",
    ),
    "dp26-p3-esp-https-tls": (r"\bhttps\b", r"\bssl/tls\b", r"\btls\b"),
    "dp26-p3-esp-blockchain": (r"\bblockchain\b", r"smart contract", r"proof of work", r"proof of stake"),
    "dp26-p3-esp-design-arquitetura": (
        r"arquitetura hexagonal", r"microsservic", r"api gateway", r"\bdocker\b",
        r"\bkubernetes\b", r"transacoes? distribuidas?", r"\bddd\b", r"domain driven design",
    ),
    "dp26-p3-esp-ux-cms": (
        r"experiencia do usuario", r"acessibilidade digital", r"usabilidade", r"\bcms\b",
        r"arquitetura da informacao",
    ),
    "dp26-p3-esp-ia-dados-bigdata": (
        r"inteligencia artificial", r"aprendizado de maquina", r"machine learning", r"deep learning",
        r"redes neurais", r"modelo de linguagem", r"\bllm", r"big data", r"analise de dados",
    ),
    "dp26-p3-esp-bi-dw-etl-olap": (
        r"data warehouse", r"\betl\b", r"\belt\b", r"\bolap\b", r"drill[- ]?down",
        r"roll[- ]?up", r"star schema", r"snowflake schema",
    ),
    "dp26-p3-esp-bi-dw-mining": (r"data mining", r"mineracao de dados"),
    "dp26-p3-esp-bi-visualizacao": (r"visualizacao de dados", r"power ?bi", r"cubo(?:s)? de dados"),
    "dp26-p3-esp-si-iso": (r"27001", r"27002", r"iso/iec 2700"),
    "dp26-p3-esp-si-cid": (
        r"confidencialidade,? integridade e disponibilidade", r"triade cia",
    ),
    "dp26-p3-esp-si-acesso": (
        r"controle de acesso", r"\boauth2?\b", r"single sign[- ]on", r"\bsso\b",
        r"autenticacao multifator", r"\bmfa\b",
    ),
    "dp26-p3-esp-si-riscos": (
        r"gerenciamento de riscos", r"gestao de riscos de seguranca", r"avaliacao de riscos de seguranca",
    ),
    "dp26-p3-esp-si-sdl-owasp": (
        r"\bowasp\b", r"sql injection", r"\bxss\b", r"\bcsrf\b", r"broken access control",
        r"security development lifecycle",
    ),
    "dp26-p3-esp-si-sast-dast": (r"\bsast\b", r"\bdast\b", r"analise dinamica de codigo"),
    "dp26-p3-esp-bd-modelagem": (
        r"modelagem conceitual", r"modelagem logica", r"modelagem fisica", r"modelo entidade[- ]relacionamento",
    ),
    "dp26-p3-esp-bd-relacional-multidimensional": (
        r"modelo relacional", r"algebra relacional", r"modelo multidimensional",
    ),
    "dp26-p3-esp-bd-normalizacao": (r"normalizacao", r"\b1fn\b", r"\b2fn\b", r"\b3fn\b", r"\bfnbc\b"),
    "dp26-p3-esp-bd-integridade": (r"integridade referencial", r"chave estrangeira"),
    "dp26-p3-esp-bd-dimensional": (
        r"modelagem dimensional", r"star schema", r"snowflake", r"tabela fato", r"tabela dimensao",
    ),
    "dp26-p3-esp-bd-sql": (
        r"linguagem sql", r"comando sql", r"script sql", r"\bselect\b.+\bfrom\b", r"\bjoin\b",
    ),
    "dp26-p3-esp-bd-sgbd": (r"\bmysql\b", r"\bpostgresql\b", r"sql server", r"\boracle\b", r"\bsgbd\b"),
    "dp26-p3-esp-bd-propriedades": (r"propriedades acid", r"isolamento de transacao"),
    "dp26-p3-esp-bd-nosql": (
        r"\bnosql\b", r"\bmongodb\b", r"banco de grafos", r"orientado a documentos", r"chave[- ]valor",
    ),
    "dp26-p3-esp-bd-memoria": (r"banco de dados em memoria", r"in[- ]memory database", r"\bredis\b"),
    "dp26-p3-esp-bd-datalake-bigdata": (r"data lake", r"\bhadoop\b", r"\bapache spark\b"),
    "dp26-p3-esp-bd-estruturados": (r"dados estruturados", r"dados nao estruturados", r"dados semiestruturados"),
    "dp26-p3-esp-bd-integracao-ingestao": (r"ingestao de dados", r"integracao via base de dados", r"\betl\b", r"\belt\b"),
    "dp26-p3-esp-gov-projetos": (r"gerenciamento de projetos", r"gestao de projetos", r"\bpmbok\b"),
    "dp26-p3-esp-gov-itil": (r"\bitil 4\b", r"\bitil v4\b", r"service desk", r"gestao de incidentes", r"gerenciamento de problemas"),
    "dp26-p3-esp-gov-cobit": (r"\bcobit 2019\b", r"\bcobit\b"),
    "dp26-p3-esp-gov-bpmn": (r"\bbpmn\b", r"business process model and notation"),
}

EXCLUSION_RULES: dict[str, tuple[str, ...]] = {
    "OFFICE_BASIC": (
        r"\bexcel\b", r"\bword\b", r"\bpowerpoint\b", r"\boutlook\b", r"\bonedrive\b",
        r"microsoft teams", r"google chrome", r"mozilla firefox", r"webmail",
    ),
    "NETWORK_LOW_LEVEL": (
        r"\bvlan\b", r"\bospf\b", r"\bbgp\b", r"\brip\b", r"mascara de subrede", r"\bipv4\b",
        r"\bipv6\b", r"cabeamento", r"fibra optica", r"par trancado", r"\bethernet\b", r"802\.11",
        r"\barp\b", r"\bdhcp\b", r"\bstp\b",
    ),
    "HARDWARE": (r"\bssd\b", r"\bcpu\b", r"\bbios\b", r"\buefi\b", r"placa-mae", r"memoria ram"),
    "FORENSICS": (r"informatica forense", r"computacao forense", r"\bautopsy\b", r"\bcarving\b", r"\bapfs\b"),
    "SERVER_ADMIN": (r"active directory", r"windows server", r"\bwsus\b", r"domain controller"),
    "OUT_OF_SCOPE_LANGUAGE": (r"\bphp\b", r"\blaravel\b", r"\bsymfony\b", r"\bc\+\+\b", r"\bmatlab\b", r"\bassembly\b"),
}


@dataclass(frozen=True)
class QuestionMetadata:
    year: int
    source_file: str
    source_sha256: str
    question_number: int
    external_question_id: str
    candidate_topic_ids: list[str]
    matched_terms: dict[str, list[str]]
    exclusion_flags: list[str]
    classification_status: str = "AUTO_CLASSIFIED_UNREVIEWED"
    manual_review_status: str = "PENDING"


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKD", value)
    return "".join(char for char in value if not unicodedata.combining(char)).lower()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def extract_text(path: Path) -> str:
    document = fitz.open(path)
    try:
        return "\n".join(page.get_text("text") for page in document)
    finally:
        document.close()


def split_questions(text: str) -> Iterable[tuple[int, str]]:
    matches = list(QUESTION_HEADER.finditer(text))
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        yield int(match.group(1)), text[match.end():end].strip()


def classify(body: str) -> tuple[list[str], dict[str, list[str]], list[str]]:
    normalized = normalize(body)
    matched_terms: dict[str, list[str]] = {}
    for topic_id, patterns in TOPIC_RULES.items():
        matches = [pattern for pattern in patterns if re.search(pattern, normalized, flags=re.DOTALL)]
        if matches:
            matched_terms[topic_id] = matches

    exclusion_flags = [
        category
        for category, patterns in EXCLUSION_RULES.items()
        if any(re.search(pattern, normalized, flags=re.DOTALL) for pattern in patterns)
    ]

    candidate_topic_ids = sorted(
        matched_terms,
        key=lambda topic_id: (-len(matched_terms[topic_id]), topic_id),
    )
    return candidate_topic_ids, matched_terms, exclusion_flags


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)
    pdfs = sorted(args.input_dir.glob("fgv 20?? questões.pdf"))
    if not pdfs:
        raise SystemExit("Nenhum arquivo 'fgv 20?? questões.pdf' foi encontrado.")

    corpus: list[QuestionMetadata] = []
    source_manifest: list[dict[str, object]] = []

    for pdf in pdfs:
        year_match = re.search(r"(20\d{2})", pdf.name)
        if not year_match:
            continue
        year = int(year_match.group(1))
        file_hash = sha256(pdf)
        questions = list(split_questions(extract_text(pdf)))
        ids_in_file: list[str] = []

        for question_number, body in questions:
            external_ids = EXTERNAL_ID.findall(body)
            if not external_ids:
                raise ValueError(f"Questão sem identificador externo: {pdf.name} #{question_number}")
            external_id = external_ids[-1]
            ids_in_file.append(external_id)
            candidate_topics, matched_terms, exclusion_flags = classify(body)
            corpus.append(
                QuestionMetadata(
                    year=year,
                    source_file=pdf.name,
                    source_sha256=file_hash,
                    question_number=question_number,
                    external_question_id=external_id,
                    candidate_topic_ids=candidate_topics,
                    matched_terms=matched_terms,
                    exclusion_flags=exclusion_flags,
                )
            )

        source_manifest.append(
            {
                "year": year,
                "file": pdf.name,
                "sha256": file_hash,
                "questionBlocks": len(questions),
                "uniqueQuestionIdsInsideFile": len(set(ids_in_file)),
            }
        )

    id_counts = Counter(record.external_question_id for record in corpus)
    duplicates = sorted(question_id for question_id, count in id_counts.items() if count > 1)
    topic_counts = Counter(
        topic_id
        for record in corpus
        for topic_id in record.candidate_topic_ids
    )
    exclusion_counts = Counter(
        flag
        for record in corpus
        for flag in record.exclusion_flags
    )

    with (args.output_dir / "question-corpus-draft.ndjson").open("w", encoding="utf-8") as handle:
        for record in corpus:
            handle.write(json.dumps(asdict(record), ensure_ascii=False, sort_keys=True) + "\n")

    summary = {
        "status": "AUTO_CLASSIFIED_UNREVIEWED",
        "eligibleForSDEHistoricalIncidence": False,
        "methodologyVersion": "1.0.0",
        "rawQuestionBlocks": len(corpus),
        "uniqueQuestionIds": len(id_counts),
        "duplicateQuestionIdsAcrossCorpus": duplicates,
        "sources": source_manifest,
        "recordsWithAtLeastOneCandidateTopic": sum(bool(record.candidate_topic_ids) for record in corpus),
        "recordsWithExclusionFlags": sum(bool(record.exclusion_flags) for record in corpus),
        "recordsWithoutCandidateTopic": sum(not record.candidate_topic_ids for record in corpus),
        "candidateTopicMatchCounts": dict(topic_counts.most_common()),
        "exclusionFlagCounts": dict(exclusion_counts.most_common()),
        "limitations": [
            "Classificação automática por regras lexicais; exige revisão humana por questão.",
            "Uma questão pode possuir mais de um tópico candidato.",
            "As contagens de candidatos não representam incidência validada.",
            "O corpus reúne cargos e especialidades heterogêneos.",
            "O texto das questões e alternativas não é armazenado no arquivo derivado."
        ]
    }
    (args.output_dir / "question-corpus-summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    (args.output_dir / "source-manifest.json").write_text(
        json.dumps(source_manifest, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )

    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
