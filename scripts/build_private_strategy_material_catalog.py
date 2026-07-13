#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import fitz

SCHEMA_VERSION = "1.0.0"
CONCURSO_ID = "dataprev-2026-perfil-3"

DISCIPLINES = {
    "portugues": "dp26-p3-portugues",
    "ingles": "dp26-p3-ingles",
    "rlm": "dp26-p3-raciocinio-logico",
    "atualidades_ia": "dp26-p3-atualidades-ia",
    "legislacao": "dp26-p3-legislacao-si-dados",
    "especificos": "dp26-p3-conhecimentos-especificos",
}

TOPICS = {
    "portugues": "dp26-p3-por-interpretacao",
    "ingles": "dp26-p3-ing-compreensao",
    "atualidades": "dp26-p3-atualidades",
    "ia_geral": "dp26-p3-ia-fundamentos",
    "lair": "dp26-p3-leg-lai",
    "delitos": "dp26-p3-leg-delitos-informaticos",
    "marco_civil": "dp26-p3-leg-marco-civil",
    "lgpd": "dp26-p3-leg-lgpd",
    "desenvolvimento": "dp26-p3-esp-desenvolvimento-sistemas",
    "bi": "dp26-p3-esp-bi",
    "seguranca": "dp26-p3-esp-seguranca",
    "bd": "dp26-p3-esp-banco-dados",
    "governanca": "dp26-p3-esp-gestao-governanca",
}

# Rules are ordered from more specific to more general. Confidence is intentionally conservative.
SUBTOPIC_RULES: list[tuple[str, list[str], str, float]] = [
    # Portuguese
    ("dp26-p3-por-ortografia-dominio", ["ortografia", "acentuacao", "fonema", "digrafo"], "portugues", 0.98),
    ("dp26-p3-por-classes-palavras", ["classes de palavras", "substantivo", "adjetivo", "adverbio", "pronome"], "portugues", 0.96),
    ("dp26-p3-por-coordenacao", ["oracoes coordenadas", "coordenacao"], "portugues", 0.94),
    ("dp26-p3-por-subordinacao", ["oracoes subordinadas", "subordinacao"], "portugues", 0.94),
    ("dp26-p3-por-pontuacao", ["pontuacao"], "portugues", 0.98),
    ("dp26-p3-por-concordancia", ["concordancia"], "portugues", 0.98),
    ("dp26-p3-por-regencia", ["regencia"], "portugues", 0.98),
    ("dp26-p3-por-crase", ["crase"], "portugues", 0.99),
    ("dp26-p3-por-colocacao-pronominal", ["colocacao pronominal"], "portugues", 0.99),
    ("dp26-p3-por-coesao-referenciacao", ["coesao", "conectivos", "conjuncoes", "preposicoes"], "portugues", 0.90),
    ("dp26-p3-por-coesao-tempos-modos", ["verbos", "tempos verbais", "modos verbais"], "portugues", 0.91),
    ("dp26-p3-por-significacao", ["semantica", "significacao"], "portugues", 0.94),
    ("dp26-p3-por-tipos-generos-reconhecimento", ["tipologia textual", "generos textuais", "tipos textuais"], "portugues", 0.95),
    ("dp26-p3-por-interpretacao-generos", ["compreensao e interpretacao", "interpretacao de textos"], "portugues", 0.95),
    # English
    ("dp26-p3-ing-textos", ["reading techniques", "skimming", "scanning", "cognates", "idioms"], "ingles", 0.95),
    ("dp26-p3-ing-gramatica-contextual", ["verbs", "articles", "nouns", "adjectives", "adverbs", "pronouns", "prepositions", "conjunctions", "reported speech", "passive voice", "if clauses", "quantifiers"], "ingles", 0.94),
    # General AI/current affairs
    ("dp26-p3-ia-machine-learning", ["machine learning", "aprendizado de maquina"], "ia_geral", 0.98),
    ("dp26-p3-ia-etica-governanca", ["etica da inteligencia artificial", "governanca em ia", "privacidade em ia"], "ia_geral", 0.96),
    ("dp26-p3-ia-generativa-llm", ["modelo de linguagem", "llm", "ia generativa", "modelos generativos"], "ia_geral", 0.96),
    ("dp26-p3-ia-conceitos", ["inteligencia artificial", "fundamentos de inteligencia artificial", "nocoes de inteligencia artificial"], "ia_geral", 0.93),
    ("dp26-p3-atualidades-areas", ["atualidades", "economia brasileira", "energia", "transportes", "saude", "educacao", "seguranca publica", "relacoes internacionais", "retrospectiva", "copa do mundo", "questao hidrica"], "atualidades", 0.90),
    # Legislation
    ("dp26-p3-leg-lai-capitulos", ["lei de acesso a informacao", "lei n 12 527", "lei nº 12.527"], "lair", 0.99),
    ("dp26-p3-leg-delitos-art2", ["lei de delitos informaticos", "12737", "12 737"], "delitos", 0.99),
    ("dp26-p3-leg-marco-civil-capitulos", ["marco civil da internet", "12 965", "12965"], "marco_civil", 0.99),
    ("dp26-p3-leg-lgpd-capitulos", ["lei geral de protecao de dados", "lgpd", "13 709", "13709"], "lgpd", 0.99),
    # Development
    ("dp26-p3-esp-linguagens-frameworks", ["java ee", "jakarta", "java ", "jpa", "hibernate", "spring framework", "spring boot", "spring cloud", "jsf", "primefaces", "junit"], "desenvolvimento", 0.98),
    ("dp26-p3-esp-mobile-lowcode", ["android", "ios", "kotlin", "swift", "low no code", "low-code", "no-code"], "desenvolvimento", 0.97),
    ("dp26-p3-esp-clean-code-sonarqube", ["analise estatica", "clean code", "sonarqube"], "desenvolvimento", 0.99),
    ("dp26-p3-esp-arquitetura-software", ["arquitetura web", "soa", "web services", "swagger", "mensageria", "activemq", "kafka", "rabbitmq", "nats", "stomp", "integracao de servicos"], "desenvolvimento", 0.95),
    ("dp26-p3-esp-orientacao-objetos-web", ["orientado a objetos", "orientacao a objetos", "paradigma orientado"], "desenvolvimento", 0.98),
    ("dp26-p3-esp-ambientes-web", ["intranet", "extranet", "internet x extranet"], "desenvolvimento", 0.98),
    ("dp26-p3-esp-padroes-dados-web", ["xml", "xslt", "uddi", "json", "rest"], "desenvolvimento", 0.96),
    ("dp26-p3-esp-devops-git", ["devops", "git ", "gitlab"], "desenvolvimento", 0.98),
    ("dp26-p3-esp-testes", ["testes de software", "automacao de testes", "junit", "tdd", "teste unitario", "testes unitarios"], "desenvolvimento", 0.97),
    ("dp26-p3-esp-rpa", ["rpa", "robotic process automation"], "desenvolvimento", 0.99),
    ("dp26-p3-esp-metodologias-ageis", ["metodologias ageis", "scrum", "kanban", "xp ", "extreme programming"], "desenvolvimento", 0.98),
    ("dp26-p3-esp-padroes-reuso", ["padroes de projeto", "design patterns", "solid", "grasp", "mvc", "reuso"], "desenvolvimento", 0.95),
    ("dp26-p3-esp-codificacao", ["logica de programacao", "codificacao", "algoritmos"], "desenvolvimento", 0.90),
    ("dp26-p3-esp-metricas", ["metricas de software", "pontos de funcao", "story points"], "desenvolvimento", 0.98),
    ("dp26-p3-esp-requisitos", ["engenharia de requisitos", "requisitos"], "desenvolvimento", 0.98),
    ("dp26-p3-esp-frontend", ["front-end", "frontend", "html", "css", "bootstrap", "javascript", "angular", "react", "vue", "ajax", "spa", "pwa"], "desenvolvimento", 0.97),
    ("dp26-p3-esp-https-tls", ["https", "ssl", "tls", "http"], "desenvolvimento", 0.93),
    ("dp26-p3-esp-blockchain", ["blockchain"], "desenvolvimento", 0.99),
    ("dp26-p3-esp-design-arquitetura", ["arquitetura hexagonal", "microsservicos", "api gateway", "containeres", "docker", "kubernetes", "saga", "circuit breaker", "bff", "transacoes distribuidas"], "desenvolvimento", 0.98),
    ("dp26-p3-esp-ux-cms", ["user experience", "ux", "usabilidade", "interface", "arquitetura da informacao", "gestao de conteudo", "portais corporativos", "cms", "acessibilidade"], "desenvolvimento", 0.95),
    ("dp26-p3-esp-ia-dados-bigdata", ["inteligencia artificial", "big data", "analise de dados"], "desenvolvimento", 0.88),
    # BI
    ("dp26-p3-esp-bi-suporte-decisao", ["suporte a decisao", "sistemas de suporte"], "bi", 0.98),
    ("dp26-p3-esp-bi-dw-etl-olap", ["data warehouse", "etl", "elt", "olap"], "bi", 0.98),
    ("dp26-p3-esp-bi-dw-mining", ["data mining", "text mining", "kdd"], "bi", 0.98),
    ("dp26-p3-esp-bi-visualizacao", ["visualizacao de dados", "cubos"], "bi", 0.95),
    ("dp26-p3-esp-bi-fontes", ["fontes de dados", "coleta de dados"], "bi", 0.92),
    ("dp26-p3-esp-bi-arquitetura", ["arquitetura de business intelligence", "arquitetura de bi"], "bi", 0.96),
    ("dp26-p3-esp-bi-conceitos", ["business intelligence", "bi e kdd", "bi "], "bi", 0.92),
    # Security
    ("dp26-p3-esp-si-iso", ["iso 27001", "iso 27002", "27001 e 27002"], "seguranca", 0.99),
    ("dp26-p3-esp-si-cid", ["principios de seguranca", "confidencialidade", "integridade", "disponibilidade"], "seguranca", 0.97),
    ("dp26-p3-esp-si-acesso", ["controle de acesso", "autenticacao", "oauth2", "sso"], "seguranca", 0.97),
    ("dp26-p3-esp-si-riscos", ["gestao de riscos", "gerencia de riscos", "ameaca", "vulnerabilidade", "impacto"], "seguranca", 0.95),
    ("dp26-p3-esp-si-sdl-owasp", ["desenvolvimento seguro", "owasp", "sdl"], "seguranca", 0.97),
    ("dp26-p3-esp-si-sast-dast", ["sast", "dast"], "seguranca", 0.99),
    ("dp26-p3-esp-si-politicas", ["politicas de seguranca", "procedimentos de seguranca"], "seguranca", 0.94),
    # Database
    ("dp26-p3-esp-bd-normalizacao", ["normalizacao"], "bd", 0.99),
    ("dp26-p3-esp-bd-dimensional", ["modelagem dimensional"], "bd", 0.99),
    ("dp26-p3-esp-bd-sql", ["sql"], "bd", 0.94),
    ("dp26-p3-esp-bd-nosql", ["nosql"], "bd", 0.99),
    ("dp26-p3-esp-bd-memoria", ["in-memory", "in memory"], "bd", 0.99),
    ("dp26-p3-esp-bd-datalake-bigdata", ["data lake", "big data"], "bd", 0.96),
    ("dp26-p3-esp-bd-integracao-ingestao", ["etl", "elt", "integracao de dados", "ingestao"], "bd", 0.95),
    ("dp26-p3-esp-bd-modelagem", ["modelo logico", "modelagem conceitual", "modelagem logica", "idef1x", "fundamentos de banco de dados"], "bd", 0.94),
    ("dp26-p3-esp-bd-relacional-multidimensional", ["relacional", "multidimensional"], "bd", 0.92),
    ("dp26-p3-esp-bd-sgbd", ["sgbd"], "bd", 0.96),
    ("dp26-p3-esp-bd-propriedades", ["transacao", "acid", "propriedades de banco"], "bd", 0.94),
    # Governance
    ("dp26-p3-esp-gov-itil", ["itil 4", "itil"], "governanca", 0.99),
    ("dp26-p3-esp-gov-cobit", ["cobit 2019", "cobit"], "governanca", 0.99),
    ("dp26-p3-esp-gov-bpmn", ["bpmn"], "governanca", 0.99),
    ("dp26-p3-esp-gov-processos", ["bpm ", "gestao de processos", "grupos de processos", "areas de conhecimento"], "governanca", 0.95),
    ("dp26-p3-esp-gov-projetos", ["pmbok", "gerenciamento de projetos", "projetos"], "governanca", 0.97),
    ("dp26-p3-esp-gov-riscos", ["gestao de riscos"], "governanca", 0.91),
]

FOLDER_DEFAULTS = {
    "Banco de dados - C": (DISCIPLINES["especificos"], TOPICS["bd"]),
    "Desenvolvimento - C": (DISCIPLINES["especificos"], TOPICS["desenvolvimento"]),
    "Engenharia de software - F": (DISCIPLINES["especificos"], TOPICS["desenvolvimento"]),
    "Gestão e Governança - C": (DISCIPLINES["especificos"], TOPICS["governanca"]),
    "Segurança da informação - C": (DISCIPLINES["especificos"], TOPICS["seguranca"]),
    "Português - C": (DISCIPLINES["portugues"], None),
    "Inglês - C": (DISCIPLINES["ingles"], TOPICS["ingles"]),
    "Atualidades - F": (DISCIPLINES["atualidades_ia"], TOPICS["atualidades"]),
    "LGPD e IA - C": (DISCIPLINES["atualidades_ia"], None),
    "RLM - F": (DISCIPLINES["rlm"], None),
}

WATERMARK_PATTERNS = [
    re.compile(r"\b\d{11}\s*-\s*[A-ZÁÉÍÓÚÃÕÂÊÔÇ][^\n]{3,80}", re.I),
    re.compile(r"\b\d{3}\.\d{3}\.\d{3}-\d{2}\b"),
]


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower().replace("–", "-").replace("—", "-")
    text = re.sub(r"[^a-z0-9+.#/ -]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def first_pages_text(doc: fitz.Document, limit: int = 8) -> str:
    return "\n".join(doc[i].get_text("text") for i in range(min(limit, len(doc))))


def contains_personal_watermark(text: str) -> bool:
    return any(pattern.search(text) for pattern in WATERMARK_PATTERNS)


def parse_index(doc: fitz.Document) -> list[dict]:
    entries: list[tuple[int, str, int]] = []
    for page_index in range(min(10, len(doc))):
        lines = [line.strip() for line in doc[page_index].get_text("text").splitlines() if line.strip()]
        for index, line in enumerate(lines):
            match = re.match(r"^(\d+)\)\s+(.+)$", line)
            if not match:
                continue
            ordinal = int(match.group(1))
            title = match.group(2).strip()
            start_page = None
            for candidate in lines[index + 1:index + 6]:
                if re.fullmatch(r"\d{1,4}", candidate):
                    start_page = int(candidate)
                    break
                if re.match(r"^\d+\)", candidate):
                    break
            if start_page is not None and 1 <= start_page <= len(doc):
                entries.append((ordinal, title, start_page))
    dedup: dict[int, tuple[str, int]] = {}
    for ordinal, title, page in entries:
        dedup.setdefault(ordinal, (title, page))
    ordered = [(ordinal, *dedup[ordinal]) for ordinal in sorted(dedup)]
    result = []
    for idx, (ordinal, title, start_page) in enumerate(ordered):
        next_page = ordered[idx + 1][2] if idx + 1 < len(ordered) else len(doc) + 1
        end_page = max(start_page, min(len(doc), next_page - 1))
        result.append({"ordinal": ordinal, "title": title, "startPage": start_page, "endPage": end_page})
    return result


def infer_lesson_label(path: Path, text: str) -> str:
    match = re.search(r"\bAula\s+(Única|Unica|\d{1,2})(?:\s*[-–][^\n]*)?", text, re.I)
    if match:
        raw = match.group(1)
        return "Única" if normalize(raw) == "unica" else raw.zfill(2)
    match = re.search(r"aula-(unica|\d{1,2})", path.name, re.I)
    if match:
        raw = match.group(1)
        return "Única" if raw.lower() == "unica" else raw.zfill(2)
    return "Sem identificação"


def infer_course_title(folder: str, text: str) -> str:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    joined = " ".join(lines[:12])
    joined = re.sub(r"\b\d{11}\s*-\s*[^\n]+", "", joined)
    match = re.search(r"DataPrev(?:\s*\(Perfil 3:[^)]+\))?\s+(.+?)\s*-\s*2026", joined, re.I)
    if match:
        return re.sub(r"\s+", " ", match.group(1)).strip(" -–—")
    return folder.replace(" - C", "").replace(" - F", "")


def infer_course_code(filename: str) -> str | None:
    match = re.search(r"curso-(\d+)", filename)
    return match.group(1) if match else None


def classify_content_kind(title: str) -> tuple[str, str | None]:
    n = normalize(title)
    banca = None
    if "fgv" in n:
        banca = "FGV"
    elif "multibancas" in n:
        banca = "MULTIBANCAS"
    elif "cebraspe" in n or "cespe" in n:
        banca = "CEBRASPE"
    elif "fcc" in n:
        banca = "FCC"
    elif "vunesp" in n:
        banca = "VUNESP"
    elif "cesgranrio" in n:
        banca = "CESGRANRIO"
    if "questoes comentadas" in n or "questao comentada" in n:
        return "COMMENTED_QUESTIONS", banca
    if "lista de questoes" in n:
        return "QUESTION_LIST", banca
    if "simulado" in n:
        return "SIMULATION", banca
    if "resumo" in n:
        return "SUMMARY", banca
    if "mapa mental" in n:
        return "MIND_MAP", banca
    if "bibliografia" in n or "apresentacao" in n:
        return "REFERENCE", banca
    return "THEORY", banca


def special_folder_context(folder: str, source_name: str, course_title: str) -> tuple[str | None, str | None]:
    discipline_id, topic_id = FOLDER_DEFAULTS.get(folder, (None, None))
    n = normalize(f"{source_name} {course_title}")
    if folder == "LGPD e IA - C":
        if "inteligencia artificial" in n or "392459" in n:
            return DISCIPLINES["atualidades_ia"], TOPICS["ia_geral"]
        if "marco civil" in n or "392461-aula-00" in n:
            return DISCIPLINES["legislacao"], TOPICS["marco_civil"]
        if "delitos" in n or "392461-aula-02" in n:
            return DISCIPLINES["legislacao"], TOPICS["delitos"]
        if "acesso a informacao" in n:
            return DISCIPLINES["legislacao"], TOPICS["lair"]
        # Aula 03 is treated as likely LGPD only after title extraction confirms it.
        if "392461-aula-03" in n or "lgpd" in n:
            return DISCIPLINES["legislacao"], TOPICS["lgpd"]
    return discipline_id, topic_id


def map_section(title: str, folder: str, source_name: str, course_title: str) -> dict:
    n = normalize(f"{title} {source_name}")
    discipline_id, default_topic_id = special_folder_context(folder, source_name, course_title)
    candidates = []
    for subtopic_id, patterns, rule_topic, confidence in SUBTOPIC_RULES:
        matched = [pattern for pattern in patterns if normalize(pattern) in n]
        if matched:
            candidates.append({
                "subtopicId": subtopic_id,
                "topicId": TOPICS[rule_topic],
                "ruleTopic": rule_topic,
                "confidence": confidence,
                "matchedTerms": matched,
            })

    # Keep the hierarchy valid and use the course group only as a tie-breaker.
    filtered = []
    for candidate in candidates:
        if discipline_id == DISCIPLINES["atualidades_ia"] and candidate["topicId"] not in {TOPICS["atualidades"], TOPICS["ia_geral"]}:
            continue
        if discipline_id == DISCIPLINES["legislacao"] and candidate["topicId"] not in {TOPICS["lair"], TOPICS["delitos"], TOPICS["marco_civil"], TOPICS["lgpd"]}:
            continue
        if discipline_id == DISCIPLINES["portugues"] and candidate["ruleTopic"] != "portugues":
            continue
        if discipline_id == DISCIPLINES["ingles"] and candidate["ruleTopic"] != "ingles":
            continue
        if discipline_id == DISCIPLINES["especificos"]:
            if candidate["ruleTopic"] in {"portugues", "ingles", "atualidades", "lair", "delitos", "marco_civil", "lgpd"}:
                continue
            if candidate["ruleTopic"] == "ia_geral":
                candidate = {
                    **candidate,
                    "subtopicId": "dp26-p3-esp-ia-dados-bigdata",
                    "topicId": TOPICS["desenvolvimento"],
                    "ruleTopic": "desenvolvimento",
                    "confidence": min(candidate["confidence"], 0.94),
                }
        filtered.append(candidate)

    preferred_topics = {
        "Banco de dados - C": {"bd", "bi", "desenvolvimento"},
        "Desenvolvimento - C": {"desenvolvimento"},
        "Engenharia de software - F": {"desenvolvimento", "bi"},
        "Gestão e Governança - C": {"governanca"},
        "Segurança da informação - C": {"seguranca", "desenvolvimento"},
    }.get(folder, set())
    for candidate in filtered:
        candidate["contextScore"] = candidate["confidence"] + (0.04 if candidate["ruleTopic"] in preferred_topics else 0.0)
    filtered.sort(key=lambda item: (-item["contextScore"], -item["confidence"], item["subtopicId"]))
    selected = filtered[0] if filtered else None
    if selected:
        return {
            "disciplineId": discipline_id,
            "topicId": selected["topicId"],
            "subtopicIds": [selected["subtopicId"]],
            "mappingStatus": "AUTO_HIGH_CONFIDENCE" if selected["confidence"] >= 0.94 else "AUTO_REVIEWABLE",
            "confidence": selected["confidence"],
            "matchedTerms": selected["matchedTerms"],
        }
    return {
        "disciplineId": discipline_id,
        "topicId": default_topic_id,
        "subtopicIds": [],
        "mappingStatus": "TOPIC_ONLY" if default_topic_id else "REVIEW_REQUIRED",
        "confidence": 0.75 if default_topic_id else 0.0,
        "matchedTerms": [],
    }


def derive_fallback_section(doc: fitz.Document, path: Path, folder: str, course_title: str) -> list[dict]:
    text = first_pages_text(doc, 3)
    candidate = ""
    # The first substantial uppercase heading is usually the lesson subject in grifado PDFs.
    for line in text.splitlines():
        clean = re.sub(r"\s+", " ", line).strip()
        if len(clean) < 5 or WATERMARK_PATTERNS[0].search(clean):
            continue
        if clean.upper() == clean and sum(ch.isalpha() for ch in clean) >= 5:
            candidate = clean.title()
            break
    if not candidate:
        candidate = course_title
    return [{"ordinal": 1, "title": candidate, "startPage": 1, "endPage": len(doc)}]


def build_catalog(root: Path) -> dict:
    records = []
    for path in sorted(root.rglob("*.pdf")):
        folder = path.parent.name
        with fitz.open(path) as doc:
            text = first_pages_text(doc, 8)
            course_title = infer_course_title(folder, text)
            sections = parse_index(doc)
            if not sections:
                sections = derive_fallback_section(doc, path, folder, course_title)
            mapped_sections = []
            for section in sections:
                mapping = map_section(section["title"], folder, path.name, course_title)
                content_kind, banca = classify_content_kind(section["title"])
                mapped_sections.append({
                    **section,
                    "contentKind": content_kind,
                    "questionBank": banca,
                    **mapping,
                })
            lesson_label = infer_lesson_label(path, text)
            discipline_id, topic_id = special_folder_context(folder, path.name, course_title)
            high_section = next((s for s in mapped_sections if s["mappingStatus"] == "AUTO_HIGH_CONFIDENCE"), None)
            if high_section:
                discipline_id = high_section["disciplineId"] or discipline_id
                topic_id = high_section["topicId"] or topic_id
            source_hash = sha256_file(path)
            course_code = infer_course_code(path.name)
            first_meaningful = next((s["title"] for s in mapped_sections if s["contentKind"] not in {"REFERENCE"}), mapped_sections[0]["title"])
            display_title = f"{course_title} — Aula {lesson_label}: {first_meaningful}"
            records.append({
                "id": f"strategy-{source_hash[:16]}",
                "schemaVersion": SCHEMA_VERSION,
                "concursoId": CONCURSO_ID,
                "sourceGroup": folder,
                "sourceFileName": path.name,
                "sourceRelativePath": str(path.relative_to(root)),
                "sourceSha256": source_hash,
                "sourcePortalCourseId": course_code,
                "lessonLabel": lesson_label,
                "courseTitle": course_title,
                "displayTitle": display_title,
                "totalPages": len(doc),
                "textLayer": "NATIVE_TEXT",
                "disciplineId": discipline_id,
                "topicId": topic_id,
                "sections": mapped_sections,
                "rights": {
                    "classification": "PRIVATE_LICENSED_USER_COPY",
                    "sharingAllowed": False,
                    "contentExportAllowed": False,
                    "metadataExportAllowed": True,
                    "containsPersonalWatermark": contains_personal_watermark(text),
                    "retentionPolicy": "DERIVED_METADATA_ONLY",
                },
            })
    return {"schemaVersion": SCHEMA_VERSION, "concursoId": CONCURSO_ID, "materials": records}


def build_summary(catalog: dict, root: Path) -> dict:
    materials = catalog["materials"]
    statuses = Counter()
    content_kinds = Counter()
    groups = Counter()
    mapped_subtopics = Counter()
    for material in materials:
        groups[material["sourceGroup"]] += 1
        for section in material["sections"]:
            statuses[section["mappingStatus"]] += 1
            content_kinds[section["contentKind"]] += 1
            for subtopic_id in section["subtopicIds"]:
                mapped_subtopics[subtopic_id] += 1
    known_groups = sorted(set(FOLDER_DEFAULTS) | set(groups))
    missing_groups = [group for group in known_groups if groups.get(group, 0) == 0]
    total_bytes = sum((root / material["sourceRelativePath"]).stat().st_size for material in materials)
    return {
        "schemaVersion": SCHEMA_VERSION,
        "concursoId": CONCURSO_ID,
        "materialCount": len(materials),
        "totalPages": sum(material["totalPages"] for material in materials),
        "totalSourceBytes": total_bytes,
        "sectionCount": sum(len(material["sections"]) for material in materials),
        "materialsByGroup": dict(sorted(groups.items())),
        "mappingStatusCounts": dict(sorted(statuses.items())),
        "contentKindCounts": dict(sorted(content_kinds.items())),
        "mappedSubtopicCounts": dict(sorted(mapped_subtopics.items())),
        "groupsWithoutPdf": missing_groups,
        "privacy": {
            "rawPdfIncludedInDerivedCatalog": False,
            "rawTextIncludedInDerivedCatalog": False,
            "personalIdentifierIncluded": False,
            "allMaterialsMetadataOnly": all(m["rights"]["retentionPolicy"] == "DERIVED_METADATA_ONLY" for m in materials),
        },
    }


def write_csv(catalog: dict, path: Path) -> None:
    fields = ["id", "sourceGroup", "lessonLabel", "courseTitle", "displayTitle", "sourceFileName", "totalPages", "disciplineId", "topicId", "sectionCount", "mappedSectionCount", "containsPersonalWatermark"]
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for material in catalog["materials"]:
            writer.writerow({
                "id": material["id"],
                "sourceGroup": material["sourceGroup"],
                "lessonLabel": material["lessonLabel"],
                "courseTitle": material["courseTitle"],
                "displayTitle": material["displayTitle"],
                "sourceFileName": material["sourceFileName"],
                "totalPages": material["totalPages"],
                "disciplineId": material["disciplineId"],
                "topicId": material["topicId"],
                "sectionCount": len(material["sections"]),
                "mappedSectionCount": sum(bool(section["subtopicIds"]) for section in material["sections"]),
                "containsPersonalWatermark": material["rights"]["containsPersonalWatermark"],
            })


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-root", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    catalog = build_catalog(args.input_root)
    summary = build_summary(catalog, args.input_root)
    (args.output_dir / "strategy-private-material-catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    (args.output_dir / "strategy-private-material-summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(catalog, args.output_dir / "strategy-private-material-catalog.csv")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
