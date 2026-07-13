from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import re
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import fitz
from rapidfuzz.fuzz import ratio

SCHEMA_VERSION = "1.0.0"


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower().replace("\u00ad", "")
    text = re.sub(r"\b(?:a|b|c|d|e)\s*\)", " ", text)
    text = re.sub(r"[^a-z0-9+#./@-]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def clean_block_text(text: str) -> str:
    return " ".join(text.replace("\u00ad", "").replace("\uf0b7", " ").split())


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


@dataclass(frozen=True)
class QuestionMarker:
    sequence_index: int
    number: int
    inline: bool
    quality: float


@dataclass
class ExtractedQuestion:
    number: int
    page: int
    text: str


HEADER_PATTERNS = [
    re.compile(r"FGV CONHECIMENTO$", re.I),
    re.compile(r"(?:TIPO|PROVA).*P[ÁA]GINA\s+\d+", re.I),
    re.compile(r"^REALIZA[ÇC][ÃA]O$", re.I),
]

SECTION_HEADINGS = {
    "CONHECIMENTOS GERAIS",
    "CONHECIMENTOS ESPECÍFICOS",
    "CONHECIMENTOS ESPECIFICOS",
    "CONHECIMENTOS ESPECIALIZADOS",
    "CONHECIMENTOS TÉCNICOS",
    "CONHECIMENTOS TECNICOS",
}

TRAILING_SECTION_PATTERN = re.compile(
    r"\b(?:PROVA\s+DISCURSIVA|QUEST(?:Ã|A)O\s+DISCURSIVA|DISCURSIVAS?|REDA(?:Ç|C)(?:Ã|A)O)\b",
    re.I,
)


def _question_sequence(pdf_path: Path) -> tuple[list[dict[str, Any]], list[QuestionMarker]]:
    document = fitz.open(pdf_path)
    sequence: list[dict[str, Any]] = []

    for page_index, page in enumerate(document):
        width, height = page.rect.width, page.rect.height
        raw: list[dict[str, Any]] = []
        for block in page.get_text("blocks"):
            x0, y0, x1, y1, text, *_ = block
            cleaned = clean_block_text(text)
            if not cleaned or y1 < 25 or y0 > height - 35:
                continue
            if cleaned.startswith("pcimarkpci") or cleaned.lower().startswith("www.pci"):
                continue
            raw.append({
                "page": page_index + 1,
                "x0": x0,
                "y0": y0,
                "x1": x1,
                "y1": y1,
                "text": cleaned,
            })

        left = [item for item in raw if item["x0"] < width * 0.5]
        right = [item for item in raw if item["x0"] >= width * 0.5]
        two_columns = len(left) >= 2 and len(right) >= 2
        columns = [left, right] if two_columns else [raw]

        for column_index, items in enumerate(columns):
            items.sort(key=lambda item: (item["y0"], item["x0"]))
            x_values = sorted(
                item["x0"] for item in items
                if len(item["text"]) > 1 and item["y0"] > 45
            )
            if x_values:
                quantile_index = min(len(x_values) - 1, max(0, int(len(x_values) * 0.12)))
                column_start = x_values[quantile_index]
            else:
                column_start = 35 if column_index == 0 else width / 2 + 20

            for item in items:
                item["column"] = column_index
                item["column_start"] = column_start
                sequence.append(item)

    markers: list[QuestionMarker] = []
    for index, item in enumerate(sequence):
        text = item["text"]
        x0 = item["x0"]
        column_start = item["column_start"]
        block_width = item["x1"] - item["x0"]
        number: int | None = None
        inline = False
        quality = 0.0

        if (
            re.fullmatch(r"\d{1,3}", text)
            and abs(x0 - column_start) < 32
            and block_width < 55
        ):
            number = int(text)
            quality = 6.0 - min(2.0, abs(x0 - column_start) / 20)
        else:
            match = re.match(r"^(\d{1,3})\s+(.{15,})$", text)
            if match and abs(x0 - column_start) < 32:
                number = int(match.group(1))
                inline = True
                quality = 5.0 - min(2.0, abs(x0 - column_start) / 20)

        if number is not None and 1 <= number <= 150:
            markers.append(QuestionMarker(index, number, inline, quality))

    return sequence, markers


def _select_contiguous_markers(
    markers: list[QuestionMarker], expected_count: int | None
) -> list[QuestionMarker]:
    by_number: dict[int, list[QuestionMarker]] = defaultdict(list)
    for marker in markers:
        by_number[marker.number].append(marker)
    for values in by_number.values():
        values.sort(key=lambda marker: marker.sequence_index)

    # state: (question number, marker sequence index) -> (score, previous key, marker)
    states: dict[tuple[int, int], tuple[float, tuple[int, int] | None, QuestionMarker]] = {}
    for marker in by_number.get(1, []):
        states[(1, marker.sequence_index)] = (marker.quality, None, marker)

    for number in range(2, 151):
        previous_states = [
            (key, state) for key, state in states.items() if key[0] == number - 1
        ]
        if not previous_states or number not in by_number:
            break
        inserted = False
        for marker in by_number[number]:
            valid = [
                (key, state)
                for key, state in previous_states
                if key[1] < marker.sequence_index
            ]
            if not valid:
                continue
            previous_key, previous_state = max(
                valid,
                key=lambda item: (item[1][0], item[0][1]),
            )
            gap = marker.sequence_index - previous_key[1]
            gap_bonus = min(0.5, math.log1p(gap) / 20)
            states[(number, marker.sequence_index)] = (
                previous_state[0] + marker.quality + gap_bonus,
                previous_key,
                marker,
            )
            inserted = True
        if not inserted:
            break

    if not states:
        raise ValueError("Nenhuma sequência de questões foi detectada.")

    available_numbers = {key[0] for key in states}
    if expected_count is not None and expected_count in available_numbers:
        target = expected_count
    else:
        target = max(available_numbers)

    if target < 10:
        raise ValueError(f"Sequência detectada é curta demais: {target} questões.")

    end_key = max(
        (key for key in states if key[0] == target),
        key=lambda key: states[key][0],
    )
    selected: list[QuestionMarker] = []
    current: tuple[int, int] | None = end_key
    while current is not None:
        _, previous, marker = states[current]
        selected.append(marker)
        current = previous
    selected.reverse()
    return selected


def extract_questions(pdf_path: Path, expected_count: int | None = None) -> list[ExtractedQuestion]:
    sequence, markers = _question_sequence(pdf_path)
    selected = _select_contiguous_markers(markers, expected_count)
    questions: list[ExtractedQuestion] = []

    for position, marker in enumerate(selected):
        end_index = (
            selected[position + 1].sequence_index
            if position + 1 < len(selected)
            else len(sequence)
        )
        parts: list[str] = []
        first_text = sequence[marker.sequence_index]["text"]
        if marker.inline:
            first_text = re.sub(r"^\d{1,3}\s+", "", first_text, count=1)
            parts.append(first_text)

        for item in sequence[marker.sequence_index + 1:end_index]:
            text = item["text"]
            if any(pattern.search(text) for pattern in HEADER_PATTERNS):
                continue
            if text.upper() in SECTION_HEADINGS:
                continue
            parts.append(text)

        question_text = " ".join(parts).strip()
        trailing_section = TRAILING_SECTION_PATTERN.search(question_text)
        if trailing_section and trailing_section.start() >= 80:
            question_text = question_text[:trailing_section.start()].strip()
        questions.append(ExtractedQuestion(
            number=marker.number,
            page=sequence[marker.sequence_index]["page"],
            text=question_text,
        ))

    # Some FGV two-column pages place a wide option block below both columns.
    # In that layout PyMuPDF can attach the second question's options to the first.
    # Repair only the unambiguous signature: two complete A-E sets followed by a
    # question with no alternatives. This keeps SQL syntax such as foreign key (A) intact.
    for index in range(len(questions) - 1):
        current = questions[index]
        following = questions[index + 1]
        current_markers = list(re.finditer(r"\([A-E]\)", current.text))
        following_markers = list(re.finditer(r"\([A-E]\)", following.text))
        if (
            len(current_markers) == 10
            and sum(1 for marker in current_markers if marker.group(0) == "(A)") == 2
            and not following_markers
        ):
            first_e = next((marker for marker in current_markers if marker.group(0) == "(E)"), None)
            second_a = [marker for marker in current_markers if marker.group(0) == "(A)"][1]
            if first_e is not None:
                boundary = current.text.find(". ", first_e.end(), second_a.start())
                if boundary != -1:
                    trailing = current.text[boundary + 2:].strip()
                    current.text = current.text[:boundary + 1].strip()
                    following.text = f"{following.text} {trailing}".strip()

    return questions


# Official DATAPREV 2026 Profile 3 hierarchy. Regex weights intentionally favor
# explicit technical terms and allow ambiguous questions to remain unclassified.
SUBTOPIC_TO_TOPIC = {
    # Development
    "dp26-p3-esp-linguagens-frameworks": "dp26-p3-esp-desenvolvimento-sistemas",
    "dp26-p3-esp-mobile-lowcode": "dp26-p3-esp-desenvolvimento-sistemas",
    "dp26-p3-esp-clean-code-sonarqube": "dp26-p3-esp-desenvolvimento-sistemas",
    "dp26-p3-esp-arquitetura-software": "dp26-p3-esp-desenvolvimento-sistemas",
    "dp26-p3-esp-orientacao-objetos-web": "dp26-p3-esp-desenvolvimento-sistemas",
    "dp26-p3-esp-ambientes-web": "dp26-p3-esp-desenvolvimento-sistemas",
    "dp26-p3-esp-padroes-dados-web": "dp26-p3-esp-desenvolvimento-sistemas",
    "dp26-p3-esp-devops-git": "dp26-p3-esp-desenvolvimento-sistemas",
    "dp26-p3-esp-testes": "dp26-p3-esp-desenvolvimento-sistemas",
    "dp26-p3-esp-rpa": "dp26-p3-esp-desenvolvimento-sistemas",
    "dp26-p3-esp-metodologias-ageis": "dp26-p3-esp-desenvolvimento-sistemas",
    "dp26-p3-esp-padroes-reuso": "dp26-p3-esp-desenvolvimento-sistemas",
    "dp26-p3-esp-codificacao": "dp26-p3-esp-desenvolvimento-sistemas",
    "dp26-p3-esp-metricas": "dp26-p3-esp-desenvolvimento-sistemas",
    "dp26-p3-esp-requisitos": "dp26-p3-esp-desenvolvimento-sistemas",
    "dp26-p3-esp-frontend": "dp26-p3-esp-desenvolvimento-sistemas",
    "dp26-p3-esp-https-tls": "dp26-p3-esp-desenvolvimento-sistemas",
    "dp26-p3-esp-blockchain": "dp26-p3-esp-desenvolvimento-sistemas",
    "dp26-p3-esp-design-arquitetura": "dp26-p3-esp-desenvolvimento-sistemas",
    "dp26-p3-esp-ux-cms": "dp26-p3-esp-desenvolvimento-sistemas",
    "dp26-p3-esp-ia-dados-bigdata": "dp26-p3-esp-desenvolvimento-sistemas",
    # BI
    "dp26-p3-esp-bi-conceitos": "dp26-p3-esp-bi",
    "dp26-p3-esp-bi-suporte-decisao": "dp26-p3-esp-bi",
    "dp26-p3-esp-bi-dw-etl-olap": "dp26-p3-esp-bi",
    "dp26-p3-esp-bi-dw-mining": "dp26-p3-esp-bi",
    "dp26-p3-esp-bi-visualizacao": "dp26-p3-esp-bi",
    "dp26-p3-esp-bi-fontes": "dp26-p3-esp-bi",
    "dp26-p3-esp-bi-arquitetura": "dp26-p3-esp-bi",
    # Security
    "dp26-p3-esp-si-politicas": "dp26-p3-esp-seguranca",
    "dp26-p3-esp-si-iso": "dp26-p3-esp-seguranca",
    "dp26-p3-esp-si-cid": "dp26-p3-esp-seguranca",
    "dp26-p3-esp-si-acesso": "dp26-p3-esp-seguranca",
    "dp26-p3-esp-si-riscos": "dp26-p3-esp-seguranca",
    "dp26-p3-esp-si-sdl-owasp": "dp26-p3-esp-seguranca",
    "dp26-p3-esp-si-sast-dast": "dp26-p3-esp-seguranca",
    # DB
    "dp26-p3-esp-bd-modelagem": "dp26-p3-esp-banco-dados",
    "dp26-p3-esp-bd-relacional-multidimensional": "dp26-p3-esp-banco-dados",
    "dp26-p3-esp-bd-normalizacao": "dp26-p3-esp-banco-dados",
    "dp26-p3-esp-bd-integridade": "dp26-p3-esp-banco-dados",
    "dp26-p3-esp-bd-metadados": "dp26-p3-esp-banco-dados",
    "dp26-p3-esp-bd-dimensional": "dp26-p3-esp-banco-dados",
    "dp26-p3-esp-bd-sql": "dp26-p3-esp-banco-dados",
    "dp26-p3-esp-bd-ddl": "dp26-p3-esp-banco-dados",
    "dp26-p3-esp-bd-dml": "dp26-p3-esp-banco-dados",
    "dp26-p3-esp-bd-sgbd": "dp26-p3-esp-banco-dados",
    "dp26-p3-esp-bd-propriedades": "dp26-p3-esp-banco-dados",
    "dp26-p3-esp-bd-nosql": "dp26-p3-esp-banco-dados",
    "dp26-p3-esp-bd-memoria": "dp26-p3-esp-banco-dados",
    "dp26-p3-esp-bd-datalake-bigdata": "dp26-p3-esp-banco-dados",
    "dp26-p3-esp-bd-estruturados": "dp26-p3-esp-banco-dados",
    "dp26-p3-esp-bd-avaliacao-modelos": "dp26-p3-esp-banco-dados",
    "dp26-p3-esp-bd-integracao-ingestao": "dp26-p3-esp-banco-dados",
    # Governance
    "dp26-p3-esp-gov-projetos": "dp26-p3-esp-gestao-governanca",
    "dp26-p3-esp-gov-processos": "dp26-p3-esp-gestao-governanca",
    "dp26-p3-esp-gov-riscos": "dp26-p3-esp-gestao-governanca",
    "dp26-p3-esp-gov-itil": "dp26-p3-esp-gestao-governanca",
    "dp26-p3-esp-gov-cobit": "dp26-p3-esp-gestao-governanca",
    "dp26-p3-esp-gov-bpmn": "dp26-p3-esp-gestao-governanca",
    # General official topics useful for filtering full exams
    "dp26-p3-leg-lai-capitulos": "dp26-p3-leg-lai",
    "dp26-p3-leg-delitos-art2": "dp26-p3-leg-delitos-informaticos",
    "dp26-p3-leg-marco-civil-capitulos": "dp26-p3-leg-marco-civil",
    "dp26-p3-leg-lgpd-capitulos": "dp26-p3-leg-lgpd",
    "dp26-p3-ia-conceitos": "dp26-p3-ia-fundamentos",
    "dp26-p3-ia-machine-learning": "dp26-p3-ia-fundamentos",
    "dp26-p3-ia-generativa-llm": "dp26-p3-ia-fundamentos",
    "dp26-p3-ia-etica-governanca": "dp26-p3-ia-fundamentos",
}


def _rules(*items: tuple[str, float]) -> list[tuple[re.Pattern[str], float, str]]:
    return [(re.compile(pattern, re.I), weight, label) for pattern, weight, label in items]


RULES: dict[str, list[tuple[re.Pattern[str], float, str]]] = {
    "dp26-p3-esp-linguagens-frameworks": _rules(
        (r"\bjava(?:ee|\s+ee)?\b|\bjakarta\s*ee\b", 5, "Java/JakartaEE"),
        (r"\bspring(?:\s+boot|\s+cloud)?\b", 6, "Spring"),
        (r"\bhibernate\b|\bjpa\b|@entity|@repository|@autowired", 6, "JPA/Hibernate"),
        (r"\bjsf\b|\bprimefaces\b|\bjunit\b", 5, "Framework Java"),
        (r"\bjavascript\b|\becmascript\b|\bnode\.?(?:js)?\b|\bnpm\b", 4, "JavaScript/Node"),
    ),
    "dp26-p3-esp-mobile-lowcode": _rules(
        (r"\bandroid\b|androidmanifest|\bios\b|\bswift\b|\bkotlin\b", 6, "Mobile"),
        (r"\bflutter\b|react\s+native|aplicativo\s+m[oó]vel", 5, "Mobile multiplataforma"),
        (r"low[- ]?code|no[- ]?code", 7, "Low-code/no-code"),
    ),
    "dp26-p3-esp-clean-code-sonarqube": _rules(
        (r"clean\s+code|code\s+smell|d[ií]vida\s+t[eé]cnica", 7, "Clean Code"),
        (r"sonarqube|sonarlint", 8, "SonarQube"),
        (r"an[aá]lise\s+est[aá]tica|analisador(?:es)?\s+est[aá]tico", 6, "Análise estática"),
    ),
    "dp26-p3-esp-arquitetura-software": _rules(
        (r"\bsoa\b|service[- ]oriented|arquitetura\s+orientada\s+a\s+servi", 6, "SOA"),
        (r"web\s*service|\bsoap\b|\bwsdl\b|\buddi\b", 6, "Web services"),
        (r"mensageria|message\s+broker|rabbitmq|apache\s+kafka|fila\s+de\s+mensagens", 6, "Mensageria"),
        (r"\bapi\b|openapi|swagger|interoperabilidade", 4, "API/interoperabilidade"),
    ),
    "dp26-p3-esp-orientacao-objetos-web": _rules(
        (r"orienta[çc][aã]o\s+a\s+objetos|programa[çc][aã]o\s+orientada\s+a\s+objetos", 7, "Orientação a objetos"),
        (r"\bheran[çc]a\b|\bpolimorfismo\b|\bencapsulamento\b|\bsobrecarga\b", 5, "POO"),
        (r"servidor\s+de\s+aplica[çc][aã]o|servidor\s+web|\btomcat\b|\bwildfly\b|\bservlet\b", 6, "Servidor web/aplicação"),
    ),
    "dp26-p3-esp-ambientes-web": _rules(
        (r"\bintranet\b|\bextranet\b|portal\s+corporativo", 6, "Intranet/extranet/portal"),
    ),
    "dp26-p3-esp-padroes-dados-web": _rules(
        (r"\bxml\b|\bxslt\b|\bxpath\b|\bxsd\b", 6, "XML/XSLT/XPath"),
        (r"\bjson\b|\bbson\b", 4, "JSON"),
        (r"\brest(?:ful)?\b|representational\s+state", 5, "REST"),
        (r"\buddi\b", 7, "UDDI"),
    ),
    "dp26-p3-esp-devops-git": _rules(
        (r"\bdevops\b|azure\s+devops", 7, "DevOps"),
        (r"\bgit\b|git\s+(?:reset|restore|revert|commit|merge|rebase|stash|log|blame)", 7, "Git"),
        (r"integra[çc][aã]o\s+cont[ií]nua|entrega\s+cont[ií]nua|continuous\s+(?:integration|delivery|deployment)|\bci/?cd\b|\bcd/?ci\b", 7, "CI/CD"),
        (r"\bjenkins\b|pipeline(?:s)?\s+de\s+(?:build|deploy)", 5, "Pipeline"),
    ),
    "dp26-p3-esp-testes": _rules(
        (r"frameworks?\s+de\s+testes?|bibliotecas?\s+de\s+testes?", 13, "Frameworks de testes"),
        (r"\btdd\b|test[- ]driven|\bbdd\b|behavior[- ]driven", 13, "TDD/BDD"),
        (r"teste(?:s)?\s+(?:unit[aá]rio|de\s+integra[çc][aã]o|de\s+sistema|de\s+aceita[çc][aã]o|de\s+regress[aã]o|automatizado|de\s+usabilidade)", 7, "Tipos de teste"),
        (r"ciclo\s+de\s+vida\s+de\s+testes|teste\s+de\s+software", 6, "Testes de software"),
        (r"\bjunit\b", 5, "JUnit"),
    ),
    "dp26-p3-esp-rpa": _rules((r"\brpa\b|robotic\s+process\s+automation|automa[çc][aã]o\s+rob[oó]tica", 9, "RPA")),
    "dp26-p3-esp-metodologias-ageis": _rules(
        (r"\bscrum\b|scrum\s+master|product\s+owner|sprint\s+backlog|daily\s+scrum", 7, "Scrum"),
        (r"\bkanban\b|work\s+in\s+progress|limite\s+de\s+wip", 7, "Kanban"),
        (r"extreme\s+programming|\bxp\b|pair\s+programming", 7, "XP"),
        (r"metodologia(?:s)?\s+[aá]geis|m[eé]todo(?:s)?\s+(?:[aá]gil|[aá]geis)|desenvolvimento\s+[aá]gil", 5, "Métodos ágeis"),
    ),
    "dp26-p3-esp-padroes-reuso": _rules(
        (r"design\s+pattern|padr[aã]o\s+(?:de\s+)?projeto|padr[oõ]es\s+gof", 7, "Padrões GoF"),
        (r"\b(?:singleton|factory|abstract\s+factory|builder|prototype|adapter|bridge|composite|decorator|facade|flyweight|proxy|observer|strategy|command|state|template\s+method|visitor|mediator|memento|iterator|chain\s+of\s+responsibility)\b", 7, "Padrão de projeto"),
        (r"\bsolid\b|substitui[çc][aã]o\s+de\s+liskov|open.?closed|single\s+responsibility|\bgrasp\b", 7, "SOLID/GRASP"),
        (r"re[uú]so\s+de\s+software", 5, "Reuso"),
    ),
    "dp26-p3-esp-codificacao": _rules(
        (r"estrutura\s+de\s+dados|\bpilha\b|\bfila\b|lista\s+encadeada|[aá]rvore\s+bin[aá]ria", 5, "Estruturas de dados"),
        (r"algoritmo|pseudoc[oó]digo|sa[ií]da\s+(?:no\s+)?console|erro\s+de\s+compila[çc][aã]o", 4, "Codificação/trace"),
    ),
    "dp26-p3-esp-metricas": _rules(
        (r"pontos?\s+de\s+fun[çc][aã]o|an[aá]lise\s+de\s+pontos?\s+de\s+fun[çc][aã]o|\bapf\b", 9, "APF"),
        (r"story\s+points?", 8, "Story Points"),
        (r"complexidade\s+ciclom[aá]tica|m[eé]trica(?:s)?\s+de\s+software|\bdit\b|\bnoc\b|\blcom\b", 6, "Métricas de software"),
    ),
    "dp26-p3-esp-requisitos": _rules(
        (r"[àa]\s+luz\s+da\s+engenharia\s+de\s+requisitos|considerando.*engenharia\s+de\s+requisitos", 14, "Objeto explícito de engenharia de requisitos"),
        (r"requisitos?\s+funcionais?\s+e\s+n[aã]o\s+funcionais?|[ée]\s*\(?s[aã]o\)?\s+requisitos?\s+funcionais?", 13, "Classificação explícita de requisitos"),
        (r"requisito(?:s)?\s+(?:funcional|n[aã]o\s+funcional)|regra\s+de\s+neg[oó]cio", 8, "Classificação de requisitos"),
        (r"elicita[çc][aã]o|levantamento\s+de\s+requisitos|entrevista|brainstorming|workshop\s+de\s+requisitos|prototipa[çc][aã]o", 7, "Elicitação"),
        (r"engenharia\s+de\s+requisitos|documento\s+de\s+requisitos|caso\s+de\s+uso", 6, "Engenharia de requisitos"),
    ),
    "dp26-p3-esp-frontend": _rules(
        (r"\bhtml5?\b|\bcss3?\b|\bajax\b", 6, "HTML/CSS/Ajax"),
        (r"\breact\b|react\s+hooks?|usememo|usecallback|\bangular\b|router-outlet|\bvue\.?js\b", 7, "Framework frontend"),
        (r"single\s+page\s+application|\bspa\b|progressive\s+web\s+app|\bpwa\b", 7, "SPA/PWA"),
        (r"manipula[çc][aã]o\s+do\s+dom|document\.getelement|queryselector", 5, "DOM"),
    ),
    "dp26-p3-esp-https-tls": _rules(
        (r"\bhttps\b(?!\s*//)|\bssl\b|\btls\b|transport\s+layer\s+security", 7, "HTTPS/SSL/TLS"),
    ),
    "dp26-p3-esp-blockchain": _rules(
        (r"\bblockchain\b|cadeia\s+de\s+blocos|smart\s+contract|prova\s+de\s+trabalho|proof\s+of\s+work", 8, "Blockchain"),
    ),
    "dp26-p3-esp-design-arquitetura": _rules(
        (r"arquitetura\s+hexagonal|ports?\s+and\s+adapters", 9, "Arquitetura hexagonal"),
        (r"\bmicroservi[çc]os\b|\bmicroservices?\b|service\s+discovery|circuit\s+breaker", 8, "Microsserviços"),
        (r"api\s+gateway|transa[çc][aã]o\s+distribu[ií]da|\bsaga\b|two[- ]phase\s+commit", 8, "Integração distribuída"),
        (r"\bdocker\b|\bkubernetes\b|\bcontainer(?:s)?\b|\bpods?\b", 7, "Containers"),
        (r"arquitetura\s+(?:de\s+)?camadas|arquitetura\s+monol[ií]tica|\bmon[oó]lito\b|\bmvc\b", 5, "Arquitetura de software"),
    ),
    "dp26-p3-esp-ux-cms": _rules(
        (r"\bux\b|user\s+experience|experi[eê]ncia\s+do\s+usu[aá]rio|usabilidade", 6, "UX/usabilidade"),
        (r"acessibilidade|\bemag\b|wcag|navega[çc][aã]o\s+por\s+teclado|contraste", 7, "Acessibilidade"),
        (r"\bcms\b|sistema\s+de\s+gest[aã]o\s+de\s+conte[uú]do|arquitetura\s+da\s+informa[çc][aã]o|workflow", 6, "CMS/arquitetura da informação"),
    ),
    "dp26-p3-esp-ia-dados-bigdata": _rules(
        (r"intelig[eê]ncia\s+artificial|machine\s+learning|aprendizado\s+de\s+m[aá]quina|deep\s+learning", 7, "IA/ML"),
        (r"large\s+language\s+model|\bllm\b|transformer|\bbert\b|\bgpt\b|\brag\b|prompt\s+engineering", 8, "LLM/IA generativa"),
        (r"rede(?:s)?\s+neural|regress[aã]o\s+(?:linear|log[ií]stica|polinomial)|\bsvm\b|\bknn\b|\bk-means\b|\bdbscan\b|\bgan\b", 7, "Modelos de IA"),
        (r"\bbig\s+data\b|ci[eê]ncia\s+de\s+dados|an[aá]lise\s+de\s+dados|\bpandas\b|\bnumpy\b", 5, "Dados/Big Data"),
    ),
    # BI
    "dp26-p3-esp-bi-conceitos": _rules((r"business\s+intelligence|intelig[eê]ncia\s+de\s+neg[oó]cios", 6, "BI")),
    "dp26-p3-esp-bi-suporte-decisao": _rules((r"sistema(?:s)?\s+de\s+suporte\s+[aà]\s+decis[aã]o|decision\s+support", 8, "Suporte à decisão")),
    "dp26-p3-esp-bi-dw-etl-olap": _rules(
        (r"data\s+warehouse|\bdw\b", 5, "Data Warehouse"),
        (r"\betl\b|extract.?transform.?load|\bolap\b|roll[- ]?up|drill[- ]?down|slice\s+and\s+dice", 7, "ETL/OLAP"),
    ),
    "dp26-p3-esp-bi-dw-mining": _rules(
        (r"no\s+contexto\s+de\s+data\s+mining|data\s+mining\s+[ée]\s+o\s+processo|tarefa(?:s)?\s+de\s+minera[çc][aã]o\s+de\s+dados", 14, "Objeto explícito de Data Mining"),
        (r"data\s+mining|minera[çc][aã]o\s+de\s+dados|descoberta\s+de\s+conhecimento", 8, "Data mining"),
    ),
    "dp26-p3-esp-bi-visualizacao": _rules((r"power\s*bi|visualiza[çc][aã]o\s+de\s+dados|dashboard|mapa\s+coropl[eé]tico|cubo(?:s)?\s+de\s+dados", 7, "Visualização")),
    "dp26-p3-esp-bi-fontes": _rules((r"mapeamento\s+de\s+fontes|fontes\s+de\s+dados|coleta\s+de\s+dados|qualidade\s+dos\s+dados", 6, "Fontes/coleta")),
    "dp26-p3-esp-bi-arquitetura": _rules((r"arquitetura\s+de\s+(?:business\s+intelligence|bi)|camada\s+sem[aâ]ntica", 7, "Arquitetura BI")),
    # Security
    "dp26-p3-esp-si-politicas": _rules((r"pol[ií]tica(?:s)?\s+de\s+seguran[çc]a(?:\s+da\s+informa[çc][aã]o|\s+cibern[eé]tica)?|procedimentos?\s+de\s+seguran[çc]a\s+(?:da\s+informa[çc][aã]o|de\s+sistemas?|cibern[eé]tica)|\bsgsi\b", 7, "Políticas/SGSI")),
    "dp26-p3-esp-si-iso": _rules((r"(?:abnt\s+nbr\s+)?iso/?iec\s*2700[12]|(?:abnt\s+nbr\s+)?iso\s*2700[12]", 9, "ISO 27001/27002")),
    "dp26-p3-esp-si-cid": _rules((r"confidencialidade.*integridade.*disponibilidade|integridade.*disponibilidade.*confidencialidade|tr[ií]ade\s+cia", 8, "CID")),
    "dp26-p3-esp-si-acesso": _rules(
        (r"controle\s+de\s+acesso|autentica[çc][aã]o|autoriza[çc][aã]o|\bmfa\b|multifator|\bsso\b|single\s+sign[- ]on", 6, "Acesso/autenticação"),
        (r"\boauth\s*2\b|authorization\s+code|openid\s+connect", 8, "OAuth2"),
        (r"certificado\s+digital|assinatura\s+digital|chave\s+p[uú]blica|criptografia\s+assim[eé]trica", 4, "Mecanismo de segurança"),
    ),
    "dp26-p3-esp-si-riscos": _rules((r"gest[aã]o\s+de\s+riscos?\s+(?:de\s+seguran[çc]a|da\s+informa[çc][aã]o|cibern[eé]ticos?)|amea[çc]a(?:s)?\s+(?:cibern[eé]tica|digital|[àa]\s+seguran[çc]a)|vulnerabilidade(?:s)?\s+(?:de\s+seguran[çc]a|em\s+(?:software|sistemas?|aplica[çc][oõ]es))|hardening|malware|trojan|ransomware", 5, "Riscos/ameaças")),
    "dp26-p3-esp-si-sdl-owasp": _rules(
        (r"\bowasp\b|owasp\s+top\s*10", 9, "OWASP"),
        (r"sql\s+injection|\bxss\b|cross[- ]site\s+scripting|\bcsrf\b|broken\s+access\s+control|cryptographic\s+failures", 8, "Vulnerabilidade web"),
        (r"secure\s+development\s+lifecycle|\bsdl\b|desenvolvimento\s+seguro", 7, "SDL"),
    ),
    "dp26-p3-esp-si-sast-dast": _rules((r"\bsast\b|\bdast\b|static\s+application\s+security\s+testing|dynamic\s+application\s+security\s+testing", 9, "SAST/DAST")),
    # DB
    "dp26-p3-esp-bd-modelagem": _rules((r"modelagem\s+(?:conceitual|l[oó]gica|f[ií]sica)|modelo\s+entidade.?relacionamento|diagrama\s+entidade.?relacionamento|cardinalidade", 7, "Modelagem de dados")),
    "dp26-p3-esp-bd-relacional-multidimensional": _rules((r"modelo\s+relacional|abordagem\s+relacional|modelo\s+multidimensional|abordagem\s+multidimensional", 7, "Relacional/multidimensional")),
    "dp26-p3-esp-bd-normalizacao": _rules((r"normaliza[çc][aã]o|primeira\s+forma\s+normal|segunda\s+forma\s+normal|terceira\s+forma\s+normal|\b1fn\b|\b2fn\b|\b3fn\b|\bfnbc\b", 9, "Normalização")),
    "dp26-p3-esp-bd-integridade": _rules((r"integridade\s+referencial|foreign\s+key|chave\s+estrangeira|restri[çc][aã]o\s+check|constraint", 7, "Integridade")),
    "dp26-p3-esp-bd-metadados": _rules((r"\bmetadados?\b|dicion[aá]rio\s+de\s+dados", 7, "Metadados")),
    "dp26-p3-esp-bd-dimensional": _rules((r"modelagem\s+dimensional|star\s+schema|snowflake|tabela\s+fato|tabela\s+dimens[aã]o|esquema\s+estrela", 8, "Modelagem dimensional")),
    "dp26-p3-esp-bd-sql": _rules((r"\bsql\b|\bselect\b|\bgroup\s+by\b|\bjoin\b|\bhaving\b|\bwhere\b|subconsulta|\bnot\s+exists\b", 5, "SQL")),
    "dp26-p3-esp-bd-ddl": _rules((r"\bddl\b|\bcreate\s+table\b|\balter\s+table\b|\bdrop\s+table\b", 7, "DDL")),
    "dp26-p3-esp-bd-dml": _rules((r"\bdml\b|\binsert\b|\bupdate\b|\bdelete\b|\bmerge\b", 6, "DML")),
    "dp26-p3-esp-bd-sgbd": _rules((r"\bsgbd\b|sistema\s+de\s+gerenciamento\s+de\s+banco|stored\s+procedure|\btrigger\b|[ií]ndice(?:s)?\s+de\s+banco", 6, "SGBD")),
    "dp26-p3-esp-bd-propriedades": _rules((r"\bacid\b|atomicidade|consist[eê]ncia|isolamento|durabilidade|transa[çc][aã]o\s+de\s+banco|controle\s+de\s+concorr[eê]ncia|\bdeadlock\b", 7, "Propriedades/transações")),
    "dp26-p3-esp-bd-nosql": _rules((r"\bnosql\b|mongodb|cassandra|\bredis\b|banco\s+orientado\s+a\s+documentos|banco\s+orientado\s+a\s+grafos|chave.?valor", 8, "NoSQL")),
    "dp26-p3-esp-bd-memoria": _rules((r"banco\s+de\s+dados\s+em\s+mem[oó]ria|in[- ]memory\s+database", 8, "Banco em memória")),
    "dp26-p3-esp-bd-datalake-bigdata": _rules((r"data\s+lake|lakehouse|hadoop|spark|solu[çc][aã]o\s+para\s+big\s+data", 7, "Data lake/Big Data")),
    "dp26-p3-esp-bd-estruturados": _rules((r"dados\s+estruturados|dados\s+n[aã]o\s+estruturados|dados\s+semiestruturados", 6, "Estrutura dos dados")),
    "dp26-p3-esp-bd-avaliacao-modelos": _rules((r"avalia[çc][aã]o\s+de\s+modelo(?:s)?\s+de\s+dados|qualidade\s+do\s+modelo\s+de\s+dados", 7, "Avaliação de modelos")),
    "dp26-p3-esp-bd-integracao-ingestao": _rules((r"\betl\b|\belt\b|integra[çc][aã]o\s+de\s+dados|ingest[aã]o\s+de\s+dados|transfer[eê]ncia\s+de\s+arquivos", 6, "Integração/ingestão")),
    # Governance
    "dp26-p3-esp-gov-projetos": _rules((r"gerenciamento\s+de\s+projetos|gest[aã]o\s+de\s+projetos|portf[oó]lio|programa(?:s)?\s+e\s+projetos|abordagem\s+h[ií]brida|\bpmbok\b", 7, "Projetos")),
    "dp26-p3-esp-gov-processos": _rules((r"grupos?\s+de\s+processos\s+(?:do\s+pmbok|de\s+gerenciamento)|[aá]reas?\s+de\s+conhecimento\s+(?:do\s+pmbok|em\s+gerenciamento\s+de\s+projetos)|processos?\s+de\s+gerenciamento\s+de\s+projetos", 6, "Processos de gestão")),
    "dp26-p3-esp-gov-riscos": _rules((r"gest[aã]o\s+de\s+riscos?\s+(?:de\s+projeto|corporativos?)|risco\s+do\s+projeto", 7, "Riscos de gestão")),
    "dp26-p3-esp-gov-itil": _rules((r"\bitil\s*v?4\b|service\s+value\s+system|cadeia\s+de\s+valor\s+de\s+servi[çc]o|incidente\s+e\s+problema", 9, "ITIL 4")),
    "dp26-p3-esp-gov-cobit": _rules((r"\bcobit\s*2019\b|fatores?\s+de\s+design\s+do\s+cobit|objetivos?\s+de\s+governan[çc]a", 9, "COBIT 2019")),
    "dp26-p3-esp-gov-bpmn": _rules((r"\bbpmn\b|business\s+process\s+model|evento\s+de\s+in[ií]cio|gateway\s+exclusivo|diagrama\s+de\s+processo", 8, "BPMN")),
    # General official topics
    "dp26-p3-leg-lai-capitulos": _rules((r"lei\s+n?[ºo]?\s*12\.527|lei\s+de\s+acesso\s+[aà]\s+informa[çc][aã]o|\blai\b", 9, "LAI")),
    "dp26-p3-leg-delitos-art2": _rules((r"lei\s+n?[ºo]?\s*12\.737|invas[aã]o\s+de\s+dispositivo\s+inform[aá]tico", 9, "Delitos informáticos")),
    "dp26-p3-leg-marco-civil-capitulos": _rules((r"lei\s+n?[ºo]?\s*12\.965|marco\s+civil\s+da\s+internet", 9, "Marco Civil")),
    "dp26-p3-leg-lgpd-capitulos": _rules((r"lei\s+n?[ºo]?\s*13\.709|lei\s+geral\s+de\s+prote[çc][aã]o\s+de\s+dados|\blgpd\b", 9, "LGPD")),
    "dp26-p3-ia-conceitos": _rules((r"conceito(?:s)?\s+de\s+intelig[eê]ncia\s+artificial", 7, "Conceitos de IA")),
    "dp26-p3-ia-machine-learning": _rules((r"aprendizado\s+supervisionado|aprendizado\s+n[aã]o\s+supervisionado|machine\s+learning", 7, "Machine Learning")),
    "dp26-p3-ia-generativa-llm": _rules((r"intelig[eê]ncia\s+artificial\s+generativa|modelo(?:s)?\s+de\s+linguagem|\bllm\b", 8, "IA generativa/LLM")),
    "dp26-p3-ia-etica-governanca": _rules((r"[eé]tica\s+(?:em|da)\s+ia|governan[çc]a\s+de\s+ia|privacidade\s+em\s+ia|fairness.*accountability.*transparency", 8, "Ética/governança de IA")),
}

OUT_OF_SCOPE_RULES = _rules(
    (r"microsoft\s+(?:word|excel|powerpoint|outlook)|onedrive|explorador\s+de\s+arquivos|google\s+chrome", 7, "Informática básica"),
    (r"\b(?:ospf|bgp|rip|eigrp|vlan|ethernet|802\.11|sub[- ]?rede|ipv4|ipv6|cabeamento|fibra\s+[oó]ptica|switch(?:es)?|roteamento)\b", 6, "Redes/infraestrutura"),
    (r"placa[- ]m[aã]e|\bssd\b|\bbios\b|\buefi\b|processador|mem[oó]ria\s+ram|impressora", 7, "Hardware/suporte"),
    (r"inform[aá]tica\s+forense|computa[çc][aã]o\s+forense|\bcarving\b|\bautopsy\b|cadeia\s+de\s+cust[oó]dia", 8, "Forense"),
    (r"\b(?:c#|c\+\+|php|matlab|assembly)\b|asp\.net|\.net\s+(?:core|framework|[ée]\s+uma\s+plataforma)", 9, "Linguagem não listada"),
)


MANUAL_OVERRIDES: dict[str, dict[int, tuple[str | None, str, str]]] = {
    "analista_de_tecnologia_da_informacao_desenvolvimento_de_software.pdf": {
        41: ("dp26-p3-esp-linguagens-frameworks", "MANUALLY_REVIEWED", "Frameworks Java/Spring/Hibernate/JUnit"),
        42: ("dp26-p3-esp-padroes-dados-web", "MANUALLY_REVIEWED", "XML, XSLT e JSON"),
        43: ("dp26-p3-esp-design-arquitetura", "MANUALLY_REVIEWED", "Design e arquitetura de software"),
        44: ("dp26-p3-esp-ambientes-web", "MANUALLY_REVIEWED", "Internet, extranet, intranet e portal"),
        45: ("dp26-p3-esp-arquitetura-software", "MANUALLY_REVIEWED", "SOA, web services e REST"),
        46: ("dp26-p3-esp-https-tls", "MANUALLY_REVIEWED", "HTTPS, SSL e TLS"),
        47: ("dp26-p3-esp-metricas", "MANUALLY_REVIEWED", "Pontos de Função e Story Points"),
        48: ("dp26-p3-esp-mobile-lowcode", "MANUALLY_REVIEWED", "Desenvolvimento móvel"),
        49: ("dp26-p3-esp-padroes-reuso", "MANUALLY_REVIEWED", "SOLID e Liskov"),
        50: ("dp26-p3-esp-orientacao-objetos-web", "MANUALLY_REVIEWED", "Servidor web e servidor de aplicações"),
        51: ("dp26-p3-esp-frontend", "MANUALLY_REVIEWED", "SPA e PWA"),
        52: ("dp26-p3-esp-testes", "MANUALLY_REVIEWED", "Tipos de teste e TDD"),
        53: ("dp26-p3-esp-metodologias-ageis", "MANUALLY_REVIEWED", "Scrum, Kanban, XP e métodos"),
        54: ("dp26-p3-esp-requisitos", "MANUALLY_REVIEWED", "Requisitos e elicitação"),
        55: ("dp26-p3-esp-devops-git", "MANUALLY_REVIEWED", "DevOps, CI e CD"),
        56: ("dp26-p3-esp-blockchain", "MANUALLY_REVIEWED", "Blockchain"),
        57: ("dp26-p3-esp-design-arquitetura", "MANUALLY_REVIEWED", "Arquitetura hexagonal e microsserviços"),
        58: ("dp26-p3-esp-ia-dados-bigdata", "MANUALLY_REVIEWED", "Inteligência artificial"),
        59: ("dp26-p3-esp-bi-dw-etl-olap", "MANUALLY_REVIEWED", "ETL e Data Warehouse"),
        60: ("dp26-p3-esp-bi-suporte-decisao", "MANUALLY_REVIEWED", "Sistemas de suporte à decisão"),
        61: ("dp26-p3-esp-bi-fontes", "MANUALLY_REVIEWED", "Fontes e qualidade de dados"),
        62: ("dp26-p3-esp-si-acesso", "MANUALLY_REVIEWED", "Controle de acesso"),
        63: ("dp26-p3-esp-si-sdl-owasp", "MANUALLY_REVIEWED", "OWASP Top 10"),
        64: ("dp26-p3-esp-si-politicas", "MANUALLY_REVIEWED", "Mecanismos/políticas de segurança"),
        65: ("dp26-p3-esp-bd-relacional-multidimensional", "MANUALLY_REVIEWED", "Relacional e multidimensional"),
        66: ("dp26-p3-esp-bd-nosql", "MANUALLY_REVIEWED", "NoSQL"),
        67: ("dp26-p3-esp-bd-integracao-ingestao", "MANUALLY_REVIEWED", "ETL e ELT"),
        68: ("dp26-p3-esp-metodologias-ageis", "MANUALLY_REVIEWED", "Scrum Master"),
        69: ("dp26-p3-esp-metodologias-ageis", "MANUALLY_REVIEWED", "Planejamento da Sprint"),
        70: ("dp26-p3-esp-gov-projetos", "MANUALLY_REVIEWED", "Projetos híbridos e ágeis"),
    },
    "auditor_de_controle_externo_informatica_analista_de_sistemas.pdf": {
        41: ("dp26-p3-esp-si-cid", "MANUALLY_REVIEWED", "Confidencialidade, integridade e disponibilidade"),
        42: ("dp26-p3-esp-si-politicas", "MANUALLY_REVIEWED", "Segurança física e lógica"),
        43: ("dp26-p3-esp-si-politicas", "MANUALLY_REVIEWED", "Classificação e políticas de informação"),
        44: ("dp26-p3-esp-si-acesso", "MANUALLY_REVIEWED", "Controle de acesso e autenticação"),
        45: ("dp26-p3-esp-si-riscos", "MANUALLY_REVIEWED", "Hardening e vulnerabilidades"),
        46: ("dp26-p3-esp-si-iso", "MANUALLY_REVIEWED", "ISO 27001"),
        47: ("dp26-p3-esp-https-tls", "MANUALLY_REVIEWED", "SSL/TLS"),
        48: ("dp26-p3-esp-si-riscos", "MANUALLY_REVIEWED", "Malware como ameaça"),
        49: ("dp26-p3-esp-si-acesso", "MANUALLY_REVIEWED", "Certificado digital"),
        50: ("dp26-p3-leg-lai-capitulos", "MANUALLY_REVIEWED", "Lei de Acesso à Informação"),
        51: ("dp26-p3-esp-bd-normalizacao", "MANUALLY_REVIEWED", "Primeira forma normal"),
        52: ("dp26-p3-esp-bd-sql", "MANUALLY_REVIEWED", "SQL e agregação"),
        53: ("dp26-p3-esp-bd-integridade", "MANUALLY_REVIEWED", "Restrição CHECK"),
        54: ("dp26-p3-esp-bd-dml", "MANUALLY_REVIEWED", "UPDATE"),
        55: ("dp26-p3-esp-bd-integridade", "MANUALLY_REVIEWED", "Integridade referencial"),
        56: ("dp26-p3-esp-bd-sgbd", "MANUALLY_REVIEWED", "Índices em SGBD"),
        57: ("dp26-p3-esp-bd-modelagem", "MANUALLY_REVIEWED", "Relacionamentos de dados"),
        58: ("dp26-p3-esp-bd-sgbd", "MANUALLY_REVIEWED", "Stored Procedures e Triggers"),
        59: ("dp26-p3-esp-bd-propriedades", "MANUALLY_REVIEWED", "ACID"),
        60: ("dp26-p3-esp-bd-propriedades", "MANUALLY_REVIEWED", "Transações"),
        61: ("dp26-p3-esp-ia-dados-bigdata", "MANUALLY_REVIEWED", "Métricas de classificação"),
        62: ("dp26-p3-esp-ia-dados-bigdata", "MANUALLY_REVIEWED", "Técnicas de classificação"),
        63: ("dp26-p3-esp-ia-dados-bigdata", "MANUALLY_REVIEWED", "Regressão polinomial"),
        64: ("dp26-p3-esp-ia-dados-bigdata", "MANUALLY_REVIEWED", "K-means e DBSCAN"),
        65: ("dp26-p3-esp-ia-dados-bigdata", "MANUALLY_REVIEWED", "BERT, GPT e T5"),
        66: ("dp26-p3-esp-ia-dados-bigdata", "MANUALLY_REVIEWED", "RAG e alucinações"),
        67: ("dp26-p3-esp-ia-dados-bigdata", "MANUALLY_REVIEWED", "NLP e embeddings"),
        68: ("dp26-p3-esp-ia-dados-bigdata", "MANUALLY_REVIEWED", "GAN e mode collapse"),
        69: ("dp26-p3-esp-ia-dados-bigdata", "MANUALLY_REVIEWED", "Ética em IA"),
        70: ("dp26-p3-esp-ia-dados-bigdata", "MANUALLY_REVIEWED", "Pandas e análise de dados"),
        71: (None, "MANUALLY_EXCLUDED", "Python puro não listado no Perfil 3"),
        72: ("dp26-p3-esp-bi-conceitos", "MANUALLY_REVIEWED", "BI e Data Warehouse"),
        73: ("dp26-p3-esp-metodologias-ageis", "MANUALLY_REVIEWED", "Scrum e Kanban"),
        74: ("dp26-p3-esp-devops-git", "MANUALLY_REVIEWED", "Azure DevOps"),
        75: ("dp26-p3-esp-metodologias-ageis", "MANUALLY_REVIEWED", "Métodos ágil, cascata e espiral"),
        76: ("dp26-p3-esp-metricas", "MANUALLY_REVIEWED", "Métricas OO"),
        77: ("dp26-p3-esp-metricas", "MANUALLY_REVIEWED", "Análise de Pontos de Função"),
        78: ("dp26-p3-esp-testes", "MANUALLY_REVIEWED", "Teste de aceitação"),
        79: ("dp26-p3-esp-metricas", "MANUALLY_REVIEWED", "Funções APF"),
        80: ("dp26-p3-esp-orientacao-objetos-web", "MANUALLY_REVIEWED", "Programação orientada a objetos"),
        81: ("dp26-p3-esp-codificacao", "MANUALLY_REVIEWED", "Estruturas de dados"),
        82: (None, "MANUALLY_EXCLUDED", "ASP.NET não listado no Perfil 3"),
        83: ("dp26-p3-esp-clean-code-sonarqube", "MANUALLY_REVIEWED", "Análise estática"),
        84: ("dp26-p3-esp-orientacao-objetos-web", "MANUALLY_REVIEWED", "Sobrecarga de funções"),
        85: ("dp26-p3-esp-si-sdl-owasp", "MANUALLY_REVIEWED", "OWASP"),
        86: ("dp26-p3-esp-si-acesso", "MANUALLY_REVIEWED", "Criptografia assimétrica/certificação"),
        87: ("dp26-p3-esp-padroes-dados-web", "MANUALLY_REVIEWED", "XML e XPath"),
        88: ("dp26-p3-esp-ux-cms", "MANUALLY_REVIEWED", "CMS e cache"),
        89: ("dp26-p3-esp-padroes-dados-web", "MANUALLY_REVIEWED", "Serviço web e XML"),
        90: ("dp26-p3-esp-si-sdl-owasp", "MANUALLY_REVIEWED", "Prevenção de XSS"),
        91: ("dp26-p3-esp-design-arquitetura", "MANUALLY_REVIEWED", "Service Discovery"),
        92: ("dp26-p3-esp-mobile-lowcode", "MANUALLY_REVIEWED", "Low-code/no-code"),
        93: ("dp26-p3-esp-bi-dw-mining", "MANUALLY_REVIEWED", "Mineração de dados"),
        94: ("dp26-p3-esp-bi-visualizacao", "MANUALLY_REVIEWED", "Power BI e visualização"),
        95: ("dp26-p3-esp-bd-nosql", "MANUALLY_REVIEWED", "NoSQL documental"),
        96: ("dp26-p3-esp-bd-nosql", "MANUALLY_REVIEWED", "NoSQL em grafos"),
        97: ("dp26-p3-esp-design-arquitetura", "MANUALLY_REVIEWED", "Docker"),
        98: ("dp26-p3-esp-devops-git", "MANUALLY_REVIEWED", "Azure DevOps"),
        99: ("dp26-p3-esp-devops-git", "MANUALLY_REVIEWED", "DevOps e CI/CD"),
        100: ("dp26-p3-esp-devops-git", "MANUALLY_REVIEWED", "Git"),
    },
    "2025 DPE RO - analista_de_sistemas_classe_b.pdf": {
        41: ("dp26-p3-esp-testes", "MANUALLY_REVIEWED", "A questão tem TDD como objeto principal; XP e metodologias ágeis são contexto."),
    },
    "EBSERH analista_de_tecnologia_da_informacao.pdf": {
        59: (None, "MANUALLY_EXCLUDED", "Questão normativa do domínio da saúde; REST/XML aparecem incidentalmente e não são o objeto cobrado."),
    },
    "2023 DNIT analista_administrativo_tecnologia_da_informacao.pdf": {
        76: ("dp26-p3-esp-si-riscos", "MANUALLY_REVIEWED", "Ameaças e segurança na administração de bancos de dados, incluindo injeção SQL/NoSQL."),
    },
}


def classify_style(text: str) -> str:
    normalized = normalize_text(text)
    if re.search(r"\b(?:codigo|script|pseudocodigo)\b", normalized) and re.search(
        r"\b(?:saida|console|executar|compila|resultado)\b", normalized
    ):
        return "CODE_TRACE"
    if re.search(r"\bi\.?\s+.*\bii\.?", normalized) and re.search(r"esta correto|analise as afirmativas|avalie", normalized):
        return "ASSERTION_SET"
    if "relacione" in normalized or normalized.count("( )") >= 2:
        return "ASSOCIATION"
    if re.search(r"uma empresa|uma organizacao|um analista|uma equipe|um desenvolvedor|o tribunal|o departamento", normalized):
        return "SCENARIO"
    if re.search(r"compare|diferenca|em relacao a|corresponde", normalized):
        return "CONCEPT_COMPARISON"
    return "DIRECT_KNOWLEDGE"


def _split_stem_and_options(text: str) -> tuple[str, str]:
    """Split conservatively so distractor alternatives do not dominate classification."""
    option_markers = [match.start() for match in re.finditer(r"\s\([A-E]\)\s", text)]
    if len(option_markers) >= 3:
        start = option_markers[0]
        return text[:start].strip(), text[start:].strip()
    return text, ""


def auto_classify(text: str) -> dict[str, Any]:
    stem_text, options_text = _split_stem_and_options(text)
    normalized = normalize_text(text)
    normalized_stem = normalize_text(stem_text)
    normalized_options = normalize_text(options_text)
    scores: list[tuple[str, float, list[str]]] = []
    for subtopic_id, rules in RULES.items():
        score = 0.0
        matched: list[str] = []
        for pattern, weight, label in rules:
            if pattern.search(normalized_stem):
                score += weight
                matched.append(label)
            elif normalized_options and pattern.search(normalized_options):
                # Alternatives are useful for recall but contain deliberate distractors.
                # They can suggest manual review, never create high confidence alone.
                score += weight * 0.25
                matched.append(label)
        if score > 0:
            scores.append((subtopic_id, score, sorted(set(matched))))
    # Generic SQL/DML verbs occur in programming APIs (for example String.join or update methods).
    # They are only admissible as database evidence when the question has an explicit DB context.
    database_context = bool(re.search(
        r"banco\s+de\s+dados|database|\bsgbd\b|tabela|modelo\s+relacional|consulta\s+sql|cl[aá]usula\s+sql|transa[çc][aã]o|chave\s+(?:prim[aá]ria|estrangeira)|stored\s+procedure|\bsql\b|forma\s+normal|depend[eê]ncia\s+funcional|\b1fn\b|\b2fn\b|\b3fn\b|\bfnbc\b",
        normalized_stem,
    ))
    if not database_context:
        scores = [
            item for item in scores
            if item[0] not in {
                "dp26-p3-esp-bd-sql",
                "dp26-p3-esp-bd-ddl",
                "dp26-p3-esp-bd-dml",
                "dp26-p3-esp-bd-propriedades",
                "dp26-p3-esp-bd-sgbd",
                "dp26-p3-esp-bd-normalizacao",
            }
        ]

    requirements_context = bool(re.search(
        r"requisit|engenharia\s+de\s+software|desenvolvimento\s+de\s+software|sistema|aplica[çc][aã]o|stakeholder|produto\s+de\s+software",
        normalized_stem,
    ))
    if not requirements_context:
        scores = [item for item in scores if item[0] != "dp26-p3-esp-requisitos"]

    object_context = bool(re.search(
        r"programa[çc][aã]o|classe|objeto|m[eé]todo|interface|software|\bjava\b|c[oó]digo|algoritmo",
        normalized_stem,
    ))
    if not object_context:
        scores = [item for item in scores if item[0] != "dp26-p3-esp-orientacao-objetos-web"]

    project_management_context = bool(re.search(
        r"\bpmbok\b|gerenciamento\s+de\s+projetos|dom[ií]nio\s+de\s+desempenho|cronograma|escopo\s+do\s+projeto|risco\s+do\s+projeto|gest[aã]o\s+de\s+portf[oó]lio",
        normalized_stem,
    ))
    if not project_management_context:
        scores = [item for item in scores if item[0] != "dp26-p3-esp-gov-projetos"]

    access_security_context = bool(re.search(
        r"controle\s+de\s+acesso|autentica[çc][aã]o|credencial|login|token|openid|oauth|keycloak|permiss[aã]o|papel\s+de\s+usu[aá]rio|\brole\b|\bmfa\b|\bsso\b|certificado\s+digital|chave\s+p[uú]blica|criptografia|sistema|aplica[çc][aã]o|web\s*service|\bapi\b",
        normalized_stem,
    ))
    if not access_security_context:
        scores = [item for item in scores if item[0] != "dp26-p3-esp-si-acesso"]

    ux_context = bool(re.search(
        r"interface\s+(?:gr[aá]fica|do\s+usu[aá]rio)|aplica[çc][aã]o|software|sistema\s+web|site|p[aá]gina\s+web|navega[çc][aã]o|acessibilidade\s+digital|\bemag\b|\bwcag\b|experi[eê]ncia\s+do\s+usu[aá]rio",
        normalized_stem,
    ))
    if not ux_context:
        scores = [item for item in scores if item[0] != "dp26-p3-esp-ux-cms"]

    reuse_context = bool(re.search(
        r"padr[aã]o\s+(?:de\s+)?projeto|design\s+pattern|orienta[çc][aã]o\s+a\s+objetos|programa[çc][aã]o|software|classe|objeto|liskov|single\s+responsibility|open.?closed|\bgrasp\b",
        normalized_stem,
    ))
    if not reuse_context:
        scores = [item for item in scores if item[0] != "dp26-p3-esp-padroes-reuso"]

    scores.sort(key=lambda item: (-item[1], item[0]))

    out_scope_score = 0.0
    out_scope_matches: list[str] = []
    for pattern, weight, label in OUT_OF_SCOPE_RULES:
        if pattern.search(normalized):
            out_scope_score += weight
            out_scope_matches.append(label)

    # The Perfil 3 edital does not list R as an implementation language. Questions
    # whose object is R syntax/operators are out of scope even when the preamble
    # mentions data science or AI. Conceptual ML/statistics questions remain eligible.
    r_language_specific = bool(re.search(
        r"linguagem\s+de\s+programa[çc][aã]o\s+r|em\s+r,?\s+o\s+operador|operador\s+.*\s+em\s+r|c[oó]digo\s+(?:na\s+linguagem\s+)?r|script\s+(?:na\s+linguagem\s+)?r",
        normalized_stem,
    ))
    if r_language_specific:
        out_scope_score += 16
        out_scope_matches.append("Sintaxe de linguagem R não listada")

    python_language_specific = bool(re.search(
        r"linguagem\s+de\s+programa[çc][aã]o\s+python|em\s+python,?\s+o\s+operador|operador\s+.*\s+em\s+python|c[oó]digo\s+(?:na\s+linguagem\s+)?python|script\s+(?:na\s+linguagem\s+)?python",
        normalized_stem,
    ))
    if python_language_specific:
        out_scope_score += 16
        out_scope_matches.append("Sintaxe de linguagem Python não listada")

    if not scores:
        return {
            "primarySubtopicId": None,
            "primaryTopicId": None,
            "classificationStatus": "UNCLASSIFIED",
            "confidence": 0.0,
            "candidateScores": [],
            "matchedTerms": [],
            "outOfScopeScore": out_scope_score,
            "outOfScopeMatches": sorted(set(out_scope_matches)),
        }

    top_id, top_score, top_terms = scores[0]
    second_score = scores[1][1] if len(scores) > 1 else 0.0
    margin = top_score - second_score
    confidence = min(0.99, 0.35 + top_score / 20 + max(0.0, margin) / 25)

    if out_scope_score >= top_score + 2:
        status = "AUTO_EXCLUDED_OUT_OF_SCOPE"
        primary = None
        topic = None
        confidence = min(0.95, 0.5 + out_scope_score / 20)
    elif top_score >= 8 and margin >= 2:
        status = "AUTO_CLASSIFIED_HIGH_CONFIDENCE"
        primary = top_id
        topic = SUBTOPIC_TO_TOPIC[top_id]
    elif top_score >= 5:
        status = "AUTO_CLASSIFIED_REVIEW_REQUIRED"
        primary = top_id
        topic = SUBTOPIC_TO_TOPIC[top_id]
    else:
        status = "UNCLASSIFIED"
        primary = None
        topic = None
        confidence = min(confidence, 0.49)

    return {
        "primarySubtopicId": primary,
        "primaryTopicId": topic,
        "classificationStatus": status,
        "confidence": round(confidence, 4),
        "candidateScores": [
            {"subtopicId": item[0], "score": item[1], "matchedTerms": item[2]}
            for item in scores[:3]
        ],
        "matchedTerms": top_terms if primary else [],
        "outOfScopeScore": out_scope_score,
        "outOfScopeMatches": sorted(set(out_scope_matches)),
    }


def build_question_record(
    exam: dict[str, Any],
    source_sha: str,
    question: ExtractedQuestion,
) -> dict[str, Any]:
    classification = auto_classify(question.text)
    override = MANUAL_OVERRIDES.get(exam["filename"], {}).get(question.number)
    if override is not None:
        subtopic_id, status, note = override
        classification.update({
            "primarySubtopicId": subtopic_id,
            "primaryTopicId": SUBTOPIC_TO_TOPIC.get(subtopic_id) if subtopic_id else None,
            "classificationStatus": status,
            "confidence": 1.0,
            "manualReviewNote": note,
        })

    normalized = normalize_text(question.text)
    text_hash = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
    return {
        "schemaVersion": SCHEMA_VERSION,
        "sourceExamId": source_sha[:16],
        "sourceFilename": exam["filename"],
        "sourceSha256": source_sha,
        "examRank": exam["rank"],
        "examTier": exam["relevance_tier"],
        "detectedYear": exam.get("detected_year"),
        "questionNumber": question.number,
        "page": question.page,
        "questionHash": text_hash,
        "normalizedLength": len(normalized),
        "stemExcerpt": question.text[:320],
        "style": classify_style(question.text),
        "answerKeyStatus": "NOT_AVAILABLE",
        **classification,
    }


def mark_duplicates(records: list[dict[str, Any]]) -> None:
    exact_groups: dict[str, list[int]] = defaultdict(list)
    for index, record in enumerate(records):
        exact_groups[record["questionHash"]].append(index)

    group_counter = 0
    for indices in exact_groups.values():
        if len(indices) < 2:
            continue
        group_counter += 1
        group_id = f"exact-{group_counter:04d}"
        canonical = records[indices[0]]["questionHash"]
        for index in indices:
            records[index]["duplicateGroupId"] = group_id
            records[index]["canonicalQuestionHash"] = canonical
            records[index]["duplicateType"] = "EXACT"

    # Near duplicate detection is intentionally conservative and blocked by initial tokens.
    blocks: dict[str, list[int]] = defaultdict(list)
    for index, record in enumerate(records):
        if record.get("duplicateGroupId"):
            continue
        prefix = normalize_text(record["stemExcerpt"])[:70]
        key = prefix[:32]
        if len(key) >= 20:
            blocks[key].append(index)

    for indices in blocks.values():
        if len(indices) < 2:
            continue
        for position, left_index in enumerate(indices):
            if records[left_index].get("duplicateGroupId"):
                continue
            left = normalize_text(records[left_index]["stemExcerpt"])
            for right_index in indices[position + 1:]:
                if records[right_index].get("duplicateGroupId"):
                    continue
                right = normalize_text(records[right_index]["stemExcerpt"])
                length_ratio = min(len(left), len(right)) / max(len(left), len(right))
                if length_ratio < 0.92:
                    continue
                similarity = ratio(left, right)
                if similarity >= 98.5:
                    group_counter += 1
                    group_id = f"near-{group_counter:04d}"
                    canonical = records[left_index]["questionHash"]
                    for index in (left_index, right_index):
                        records[index]["duplicateGroupId"] = group_id
                        records[index]["canonicalQuestionHash"] = canonical
                        records[index]["duplicateType"] = "NEAR"
                    break

    for record in records:
        record.setdefault("duplicateGroupId", None)
        record.setdefault("canonicalQuestionHash", record["questionHash"])
        record.setdefault("duplicateType", None)


def unique_records(records: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    result: list[dict[str, Any]] = []
    for record in records:
        canonical = record["canonicalQuestionHash"]
        if canonical in seen:
            continue
        seen.add(canonical)
        result.append(record)
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--corpus-root", type=Path, required=True)
    parser.add_argument("--inventory", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    inventory = json.loads(args.inventory.read_text(encoding="utf-8"))
    exams = [
        exam for exam in inventory["exams"]
        if exam["relevance_tier"].startswith("A")
    ]
    args.output_dir.mkdir(parents=True, exist_ok=True)

    records: list[dict[str, Any]] = []
    extraction_report: list[dict[str, Any]] = []
    for exam in exams:
        pdf_path = args.corpus_root / exam["filename"]
        source_sha = sha256_file(pdf_path)
        questions = extract_questions(pdf_path, exam.get("declared_total_questions"))
        extraction_report.append({
            "filename": exam["filename"],
            "rank": exam["rank"],
            "tier": exam["relevance_tier"],
            "expectedQuestionCount": exam.get("declared_total_questions"),
            "extractedQuestionCount": len(questions),
            "firstQuestion": questions[0].number,
            "lastQuestion": questions[-1].number,
            "completeContiguousSequence": questions[-1].number == len(questions),
        })
        records.extend(
            build_question_record(exam, source_sha, question)
            for question in questions
        )

    mark_duplicates(records)
    unique = unique_records(records)

    corpus_path = args.output_dir / "wave1-question-corpus.ndjson"
    with corpus_path.open("w", encoding="utf-8") as stream:
        for record in records:
            stream.write(json.dumps(record, ensure_ascii=False) + "\n")

    status_counts = Counter(record["classificationStatus"] for record in unique)
    candidate_topic_counts = Counter(
        record["primaryTopicId"] for record in unique
        if record["primaryTopicId"] is not None
    )
    candidate_subtopic_counts = Counter(
        record["primarySubtopicId"] for record in unique
        if record["primarySubtopicId"] is not None
    )
    style_counts = Counter(record["style"] for record in unique)
    manually_reviewed = sum(
        1 for record in unique
        if record["classificationStatus"] in {"MANUALLY_REVIEWED", "MANUALLY_EXCLUDED"}
    )
    duplicates = len(records) - len(unique)

    candidate_classified_in_scope = [
        record for record in unique
        if record["primaryTopicId"] is not None
        and record["classificationStatus"] not in {"AUTO_EXCLUDED_OUT_OF_SCOPE", "MANUALLY_EXCLUDED"}
    ]
    # Review-required records are a queue, not evidence. Only manual mappings and
    # high-confidence automatic candidates enter the experimental denominator.
    incidence_basis_records = [
        record for record in candidate_classified_in_scope
        if record["classificationStatus"] in {"MANUALLY_REVIEWED", "AUTO_CLASSIFIED_HIGH_CONFIDENCE"}
    ]
    eligible_count = len(incidence_basis_records)
    topic_counts = Counter(record["primaryTopicId"] for record in incidence_basis_records)
    subtopic_counts = Counter(record["primarySubtopicId"] for record in incidence_basis_records)

    incidence_evidence = []
    for topic_id, count in sorted(topic_counts.items()):
        manual_for_topic = sum(
            1 for record in incidence_basis_records
            if record["primaryTopicId"] == topic_id
            and record["classificationStatus"] == "MANUALLY_REVIEWED"
        )
        incidence_evidence.append({
            "id": f"fgv37-wave1-{topic_id}",
            "topicId": topic_id,
            "sourceIds": ["fgv-exam-corpus-37-wave1-auto-classified"],
            "status": "AUTO_CLASSIFIED_UNREVIEWED",
            "matchedQuestionCount": count,
            "eligibleCorpusQuestionCount": eligible_count,
            "incidenceRate": round(count / eligible_count, 6) if eligible_count else None,
            "manuallyReviewedQuestionCount": manual_for_topic,
            "deduplicated": True,
            "inclusionCriteria": [
                "Prova classificada na faixa A1 ou A2 do inventário de proximidade.",
                "Questão revisada manualmente ou classificada automaticamente com alta confiança após regras conservadoras.",
            ],
            "exclusionCriteria": [
                "Questão geral ou técnica sem aderência segura ao conteúdo programático.",
                "Questão duplicada conta uma única vez no denominador experimental.",
                "Questão de linguagem ou tecnologia explicitamente fora do edital é excluída.",
            ],
            "notes": [
                "Taxa experimental entre questões classificadas como aderentes, não probabilidade de cobrança na prova DATAPREV.",
                "Evidência permanece inativa até revisão manual por tópico e validação do corpus.",
            ],
        })

    summary = {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": "2026-07-13",
        "sourceArchive": "Provas FGV.zip",
        "wave": "A1_A2",
        "examCount": len(exams),
        "rawQuestionCount": len(records),
        "uniqueQuestionCount": len(unique),
        "duplicateQuestionCount": duplicates,
        "manuallyReviewedOrExcludedQuestionCount": manually_reviewed,
        "candidateClassifiedInScopeUniqueQuestionCount": len(candidate_classified_in_scope),
        "experimentalIncidenceBasisQuestionCount": eligible_count,
        "classifiedInScopeUniqueQuestionCount": eligible_count,
        "classificationStatusCounts": dict(sorted(status_counts.items())),
        "candidateTopicCounts": dict(sorted(candidate_topic_counts.items(), key=lambda item: (-item[1], item[0]))),
        "candidateSubtopicCounts": dict(sorted(candidate_subtopic_counts.items(), key=lambda item: (-item[1], item[0]))),
        "topicCounts": dict(sorted(topic_counts.items(), key=lambda item: (-item[1], item[0]))),
        "subtopicCounts": dict(sorted(subtopic_counts.items(), key=lambda item: (-item[1], item[0]))),
        "styleCounts": dict(sorted(style_counts.items(), key=lambda item: (-item[1], item[0]))),
        "extraction": extraction_report,
        "incidenceEvidence": incidence_evidence,
        "activationStatus": "NOT_ELIGIBLE_FOR_SDE_HISTORICAL_INCIDENCE",
        "activationReasons": [
            "Classificações automáticas ainda não foram revisadas manualmente por tópico.",
            "A taxa mede participação no corpus aderente, não chance absoluta de cobrança.",
            "Gabaritos não estão disponíveis para identificar anulações e analisar distratores.",
        ],
    }
    (args.output_dir / "wave1-corpus-summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (args.output_dir / "wave1-experimental-incidence.json").write_text(
        json.dumps({
            "schemaVersion": SCHEMA_VERSION,
            "status": "EXPERIMENTAL_NOT_ACTIVE",
            "denominatorDefinition": "Questões únicas A1/A2 revisadas manualmente ou classificadas automaticamente com alta confiança; itens REVIEW_REQUIRED são excluídos.",
            "evidence": incidence_evidence,
        }, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    review_candidates = [
        record for record in unique
        if record["classificationStatus"] in {
            "AUTO_CLASSIFIED_REVIEW_REQUIRED",
            "AUTO_CLASSIFIED_HIGH_CONFIDENCE",
            "UNCLASSIFIED",
        }
    ]
    review_candidates.sort(key=lambda record: (
        0 if record["classificationStatus"] == "AUTO_CLASSIFIED_REVIEW_REQUIRED" else 1,
        record["confidence"],
        record["examRank"],
        record["questionNumber"],
    ))
    with (args.output_dir / "wave1-review-queue.csv").open("w", newline="", encoding="utf-8-sig") as stream:
        fields = [
            "sourceFilename", "examRank", "questionNumber", "page", "classificationStatus",
            "primaryTopicId", "primarySubtopicId", "confidence", "matchedTerms",
            "outOfScopeMatches", "style", "stemExcerpt", "questionHash",
        ]
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        for record in review_candidates:
            writer.writerow({
                field: (
                    "; ".join(record.get(field, []))
                    if isinstance(record.get(field), list)
                    else record.get(field)
                )
                for field in fields
            })

    report_lines = [
        "# P1.3 — Primeira onda de segmentação e classificação do corpus FGV",
        "",
        "## Escopo",
        "",
        f"- Provas A1/A2 processadas: **{len(exams)}**.",
        f"- Questões extraídas em sequência contínua: **{len(records)}**.",
        f"- Questões únicas após deduplicação: **{len(unique)}**.",
        f"- Duplicações exatas/próximas detectadas: **{duplicates}**.",
        f"- Questões revisadas ou excluídas manualmente: **{manually_reviewed}**.",
        f"- Candidatas aderentes antes da exclusão da fila REVIEW_REQUIRED: **{len(candidate_classified_in_scope)}**.",
        f"- Base experimental (manual + alta confiança): **{eligible_count}**.",
        "",
        "A matriz produzida é experimental e permanece bloqueada para o SDE.",
        "",
        "## Integridade da extração",
        "",
        "| Prova | Extraídas | Faixa | Sequência |",
        "|---|---:|---|---|",
    ]
    for item in extraction_report:
        report_lines.append(
            f"| {item['filename']} | {item['extractedQuestionCount']} | {item['tier']} | "
            f"{'completa' if item['completeContiguousSequence'] else 'revisar'} |"
        )

    report_lines += [
        "",
        "## Estado das classificações únicas",
        "",
        "| Estado | Quantidade |",
        "|---|---:|",
    ]
    for status, count in sorted(status_counts.items(), key=lambda item: (-item[1], item[0])):
        report_lines.append(f"| {status} | {count} |")

    report_lines += [
        "",
        "## Distribuição experimental por grande bloco",
        "",
        "| Tópico oficial | Questões | Participação no corpus aderente | Revisadas manualmente |",
        "|---|---:|---:|---:|",
    ]
    evidence_by_topic = {item["topicId"]: item for item in incidence_evidence}
    for topic_id, count in sorted(topic_counts.items(), key=lambda item: (-item[1], item[0])):
        evidence = evidence_by_topic[topic_id]
        report_lines.append(
            f"| `{topic_id}` | {count} | {evidence['incidenceRate']:.1%} | "
            f"{evidence['manuallyReviewedQuestionCount']} |"
        )

    report_lines += [
        "",
        "## Limites",
        "",
        "- A classificação automática é uma triagem reproduzível, não revisão humana.",
        "- Itens AUTO_CLASSIFIED_REVIEW_REQUIRED não entram no denominador experimental.",
        "- Percentuais são participação no corpus filtrado, não previsão de questões na DATAPREV.",
        "- A ausência de gabaritos não impede incidência temática, mas impede análise de anulações e distratores.",
        "- A próxima etapa é revisar a fila de ambiguidades e medir precisão por tópico antes de qualquer ativação.",
    ]
    (args.output_dir / "WAVE1_CLASSIFICATION_REPORT.md").write_text(
        "\n".join(report_lines),
        encoding="utf-8",
    )

    print(json.dumps({
        "exams": len(exams),
        "rawQuestions": len(records),
        "uniqueQuestions": len(unique),
        "duplicates": duplicates,
        "manual": manually_reviewed,
        "candidateClassifiedInScope": len(candidate_classified_in_scope),
        "classifiedInScope": eligible_count,
        "statusCounts": dict(status_counts),
        "topicCounts": dict(topic_counts),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
