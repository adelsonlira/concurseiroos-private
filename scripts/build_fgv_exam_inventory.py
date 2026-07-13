from __future__ import annotations

import csv
import hashlib
import json
import os
import re
import subprocess
import unicodedata
from pathlib import Path
from typing import Any

INPUT = Path('/mnt/data/fgv37_corpus/Provas')
TEXT_DIR = Path('/mnt/data/fgv37_text')
OUT = Path('/mnt/data/fgv37_analysis')
OUT.mkdir(parents=True, exist_ok=True)


def norm(text: str) -> str:
    text = unicodedata.normalize('NFKD', text)
    text = ''.join(ch for ch in text if not unicodedata.combining(ch))
    return re.sub(r'\s+', ' ', text).lower().strip()


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def pages(path: Path) -> int:
    out = subprocess.check_output(['pdfinfo', str(path)], text=True, errors='ignore')
    m = re.search(r'^Pages:\s+(\d+)', out, flags=re.M)
    return int(m.group(1)) if m else 0


def clean_cover_excerpt(text: str) -> str:
    text = re.sub(r'^pcimarkpci\s+\S+\s*', '', text.strip(), flags=re.I)
    text = re.split(r'\bSUA PROVA\b|\bINFORMAÇÕES GERAIS\b', text, maxsplit=1, flags=re.I)[0]
    return re.sub(r'\s+', ' ', text).strip()[:700]


def detected_year(filename: str, cover: str) -> int | None:
    # Prefer explicit filename year, then cover year. Restrict to plausible exam years.
    for source in (filename, cover):
        years = [int(y) for y in re.findall(r'\b(20(?:1[4-9]|2[0-6]))\b', source)]
        if years:
            # The earliest plausible year on the cover usually corresponds to edital/exam.
            return min(years)
    return None


def extract_title(cover: str) -> str:
    # Drop generic exam labels and keep the most informative cover text.
    x = re.sub(r'\b(PROVA|CONCURSO PÚBLICO|EDITAL\s+N[ºO]?\s*[^ ]*|MANHÃ|TARDE|NÍVEL SUPERIOR|TIPO 1\s*[–-]\s*BRANCA)\b', ' ', cover, flags=re.I)
    return re.sub(r'\s+', ' ', x).strip()[:450]

TOPIC_GROUPS = {
    'desenvolvimento_arquitetura': [
        'java', 'spring', 'hibernate', 'jakarta', 'javaee', 'javascript', 'react', 'angular', 'vue',
        'jsf', 'primefaces', 'junit', 'microserv', 'api ', 'api\n', 'rest', 'json', 'xml', 'swagger',
        'arquitetura de software', 'padrao de projeto', 'design pattern', 'solid', 'grasp', 'orientacao a objetos',
        'docker', 'kubernetes', 'container', 'devops', 'git ', 'git\n', 'clean code', 'sonarqube', 'soa', 'mensageria'
    ],
    'engenharia_testes_requisitos': [
        'engenharia de software', 'requisito funcional', 'requisito nao funcional', 'elicitacao', 'uml',
        'ponto de funcao', 'pontos de funcao', 'story point', 'tdd', 'bdd', 'teste unitario', 'teste de integracao',
        'teste de software', 'scrum', 'kanban', 'extreme programming', ' xp '
    ],
    'banco_dados_bi': [
        'sql', 'banco de dados', 'normalizacao', 'modelo relacional', 'modelagem dimensional', 'data warehouse',
        'etl', 'elt', 'olap', 'nosql', 'data lake', 'data mining', 'business intelligence', 'star schema', 'snowflake'
    ],
    'seguranca_aplicacoes': [
        'owasp', 'oauth', 'sso', 'sast', 'dast', 'sql injection', 'cross-site', 'xss', 'csrf',
        'iso/iec 27001', 'iso 27001', 'gestao de riscos', 'vulnerabilidade', 'desenvolvimento seguro', 'sdl'
    ],
    'governanca_gestao': [
        'itil', 'cobit', 'bpmn', 'gerenciamento de projetos', 'gestao de projetos', 'portfolio', 'pmbok',
        'gestao de processos', 'governanca de ti'
    ],
    'ia_dados_emergentes': [
        'inteligencia artificial', 'machine learning', 'aprendizado de maquina', 'modelo de linguagem', 'llm',
        'big data', 'blockchain', 'rede neural'
    ],
}

OUT_SCOPE_GROUPS = {
    'redes_infra': ['roteamento', 'ospf', 'bgp', 'rip', 'vlan', 'sub-rede', 'subrede', 'ipv4', 'ipv6', 'ethernet', 'cabeamento', 'switch', 'wi-fi', 'wireless'],
    'hardware_suporte': ['hardware', 'placa-mae', 'ssd', 'bios', 'uefi', 'impressora', 'manutencao', 'suporte de ti', 'infraestrutura de ti'],
    'informatica_basica': ['microsoft word', 'microsoft excel', 'powerpoint', 'outlook', 'onedrive', 'explorador de arquivos', 'google chrome'],
    'forense': ['informatica forense', 'computacao forense', 'carving', 'autopsy', 'cadeia de custodia'],
}

TITLE_POSITIVE = [
    ('dataprev', 35),
    ('desenvolvimento de software', 26),
    ('desenvolvedor de sistemas', 24),
    ('sistemas e desenvolvimento', 23),
    ('desenvolvimento de sistemas', 22),
    ('analise de sistemas de informacao', 18),
    ('analise de sistemas', 17),
    ('analista de sistemas', 15),
    ('tecnologia da informacao', 6),
]
TITLE_NEGATIVE = [
    ('analise de suporte', -22),
    ('suporte de ti', -20),
    ('infraestrutura', -18),
    ('redes e comunicacao', -25),
]

rows: list[dict[str, Any]] = []
for pdf in sorted(INPUT.glob('*.pdf')):
    text_path = TEXT_DIR / f'{pdf.stem}.txt'
    text = text_path.read_text(encoding='utf-8', errors='ignore')
    cover_raw = ' '.join(text[:7000].split())
    cover = clean_cover_excerpt(cover_raw)
    title = extract_title(cover)
    nt = norm(text)
    ntitle = norm(f'{pdf.name} {title}')
    year = detected_year(pdf.name, cover)

    topic_hits: dict[str, int] = {}
    topic_coverage: dict[str, int] = {}
    for group, kws in TOPIC_GROUPS.items():
        counts = [nt.count(norm(k)) for k in kws]
        topic_hits[group] = sum(counts)
        topic_coverage[group] = sum(1 for c in counts if c > 0)

    out_hits: dict[str, int] = {}
    out_cov: dict[str, int] = {}
    for group, kws in OUT_SCOPE_GROUPS.items():
        counts = [nt.count(norm(k)) for k in kws]
        out_hits[group] = sum(counts)
        out_cov[group] = sum(1 for c in counts if c > 0)

    score = 0.0
    score_reasons: list[str] = []
    for phrase, points in TITLE_POSITIVE:
        if norm(phrase) in ntitle:
            score += points
            score_reasons.append(f'título contém "{phrase}" ({points:+d})')
    for phrase, points in TITLE_NEGATIVE:
        if norm(phrase) in ntitle:
            score += points
            score_reasons.append(f'título contém "{phrase}" ({points:+d})')

    if year:
        recency = max(0, min(7, year - 2019))  # 2026=7, 2025=6 etc.
        score += recency
        score_reasons.append(f'recência {year} (+{recency})')

    # Coverage rewards are capped to avoid long exams automatically winning.
    weights = {
        'desenvolvimento_arquitetura': 1.8,
        'engenharia_testes_requisitos': 1.5,
        'banco_dados_bi': 1.3,
        'seguranca_aplicacoes': 1.1,
        'governanca_gestao': 0.8,
        'ia_dados_emergentes': 0.7,
    }
    for group, cov in topic_coverage.items():
        add = min(cov, 10) * weights[group]
        score += add

    # Penalize predominantly off-scope exams, especially when title indicates support/infra.
    out_penalty = 0.0
    if any(x in ntitle for x in ['suporte', 'infraestrutura', 'redes e comunicacao']):
        out_penalty += min(18, 2.2 * sum(out_cov.values()))
    else:
        out_penalty += min(7, 0.45 * sum(out_cov.values()))
    score -= out_penalty
    if out_penalty:
        score_reasons.append(f'conteúdo fora do escopo (-{out_penalty:.1f})')

    # Exact DATAPREV exam gets explicit source-proximity bonus.
    exact_dataprev = 'dataprev' in ntitle and ('desenvolvimento de software' in ntitle or 'ati - desenvolvimento' in norm(cover))
    if exact_dataprev:
        score += 20
        score_reasons.append('mesmo órgão e especialidade (+20)')

    if exact_dataprev:
        tier = 'A1 - referência primária'
    elif score >= 50:
        tier = 'A2 - muito alta'
    elif score >= 34:
        tier = 'B - alta'
    elif score >= 20:
        tier = 'C - complementar'
    else:
        tier = 'D - baixa/controle negativo'

    if exact_dataprev:
        use = 'Base primária para estilo e aderência; incidência somente após classificação manual.'
    elif tier.startswith('A'):
        use = 'Base principal para classificação temática e estilo FGV de desenvolvimento.'
    elif tier.startswith('B'):
        use = 'Base secundária para ampliar amostra de temas aderentes.'
    elif tier.startswith('C'):
        use = 'Usar seletivamente por questão; não usar denominador integral.'
    else:
        use = 'Controle negativo/filtro; questões aderentes somente após revisão individual.'

    total_questions = None
    m = re.search(r'contendo\s+(\d{2,3})\s*\(', norm(cover_raw))
    if m:
        total_questions = int(m.group(1))

    rows.append({
        'filename': pdf.name,
        'sha256': sha256(pdf),
        'size_bytes': pdf.stat().st_size,
        'pages': pages(pdf),
        'detected_year': year,
        'cover_title': title,
        'declared_total_questions': total_questions,
        'relevance_score': round(score, 2),
        'relevance_tier': tier,
        'recommended_use': use,
        'score_reasons': score_reasons,
        'topic_keyword_coverage': topic_coverage,
        'topic_keyword_hits': topic_hits,
        'out_of_scope_keyword_coverage': out_cov,
        'out_of_scope_keyword_hits': out_hits,
        'review_status': 'AUTO_TRIAGED_UNREVIEWED',
    })

rows.sort(key=lambda r: (-r['relevance_score'], r['filename'].lower()))
for i, r in enumerate(rows, start=1):
    r['rank'] = i

(OUT / 'fgv37-exam-inventory.json').write_text(json.dumps({
    'schemaVersion': '1.0.0',
    'generatedAt': '2026-07-13',
    'sourceArchive': 'Provas FGV.zip',
    'examCount': len(rows),
    'methodology': {
        'status': 'AUTO_TRIAGE_NOT_INCIDENCE',
        'notes': [
            'Ranking preliminar baseado em proximidade do cargo, órgão, recência detectável e cobertura lexical do edital DATAPREV Perfil 3.',
            'Não representa incidência histórica e não pode alterar o SDE antes de revisão manual por questão.',
            'Anos ausentes na capa permanecem não detectados; não foram inferidos externamente.'
        ]
    },
    'exams': rows,
}, ensure_ascii=False, indent=2), encoding='utf-8')

flat_fields = ['rank','filename','detected_year','pages','declared_total_questions','relevance_score','relevance_tier','recommended_use','cover_title','sha256']
with (OUT/'fgv37-exam-inventory.csv').open('w', newline='', encoding='utf-8-sig') as f:
    w=csv.DictWriter(f, fieldnames=flat_fields)
    w.writeheader()
    for r in rows:
        w.writerow({k:r.get(k) for k in flat_fields})

# Markdown report
lines = [
    '# Inventário e ranking preliminar - 37 provas FGV de TI',
    '',
    '## Escopo e cautela',
    '',
    'Este ranking é uma triagem reproduzível para ordenar a curadoria. Não é uma matriz de incidência e não altera o SDE.',
    'As provas sem ano explícito na capa permanecem com ano não detectado, sem inferência externa.',
    '',
    '## Distribuição por faixa',
    '',
]
from collections import Counter
cnt=Counter(r['relevance_tier'] for r in rows)
for k in ['A1 - referência primária','A2 - muito alta','B - alta','C - complementar','D - baixa/controle negativo']:
    lines.append(f'- {k}: {cnt.get(k,0)} prova(s)')
lines += ['', '## Ranking', '', '| # | Faixa | Nota | Ano | Prova | Uso recomendado |', '|---:|---|---:|---:|---|---|']
for r in rows:
    year = r['detected_year'] or 'ND'
    title_short = r['cover_title'].replace('|','/')[:130]
    lines.append(f"| {r['rank']} | {r['relevance_tier']} | {r['relevance_score']:.2f} | {year} | **{title_short}**<br><small>{r['filename']}</small> | {r['recommended_use']} |")
lines += ['', '## Primeira onda de curadoria', '']
for r in rows[:12]:
    lines.append(f"{r['rank']}. **{r['filename']}** - {r['relevance_tier']} ({r['relevance_score']:.2f})")
lines += [
    '',
    '## Próxima validação necessária',
    '',
    'A próxima fase deve segmentar cada prova em questões, classificar cada questão contra os subassuntos oficiais e revisar manualmente amostras antes de calcular qualquer frequência.',
]
(OUT/'FGV37_EXAM_INVENTORY_REPORT.md').write_text('\n'.join(lines), encoding='utf-8')

print(json.dumps([{k:r[k] for k in ['rank','filename','detected_year','relevance_score','relevance_tier']} for r in rows[:20]], ensure_ascii=False, indent=2))
