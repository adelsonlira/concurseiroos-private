from __future__ import annotations
import fitz, re, json
from pathlib import Path
from collections import Counter

PDF=Path('/mnt/data/fgv37_corpus/Provas/analista_de_tecnologia_da_informacao_desenvolvimento_de_software.pdf')
OUT=Path('/mnt/data/concurseiroos_evidence_base/data/evidence/dataprev-2026-perfil-3/fgv-exams-37')
OUT.mkdir(parents=True,exist_ok=True)

def extract_questions():
    doc=fitz.open(PDF)
    qs={}
    for pi,page in enumerate(doc):
        blocks=[]
        for b in page.get_text('blocks'):
            x0,y0,x1,y1,text,*_=b
            if y0<30 or y0>780: continue
            t=' '.join(text.split())
            if not t: continue
            col=0 if x0<300 else 1
            blocks.append((col,y0,x0,t))
        for col in [0,1]:
            current=None
            for _,y,x,t in sorted([b for b in blocks if b[0]==col],key=lambda z:(z[1],z[2])):
                m=re.match(r'^(\d{1,2})\s+(.*)$',t)
                if m and 1<=int(m.group(1))<=70:
                    current=int(m.group(1))
                    qs.setdefault(current,{'page':pi+1,'parts':[]})['parts'].append(m.group(2))
                elif current is not None:
                    if any(h in t for h in ['EMPRESA DE TECNOLOGIA','FGV CONHECIMENTO']):
                        continue
                    qs[current]['parts'].append(t)
    return {n:{'page':v['page'],'text':' '.join(v['parts'])} for n,v in qs.items()}

qs=extract_questions()
# Manual topic mapping against the official DATAPREV 2026 Profile 3 hierarchy.
M={
41:("dp26-p3-esp-linguagens-frameworks","Frameworks Java/Spring/Hibernate/JUnit","CONCEPT_COMPARISON"),
42:("dp26-p3-esp-padroes-dados-web","XML, XSLT e JSON","CONCEPT_COMPARISON"),
43:("dp26-p3-esp-design-arquitetura","Design e arquitetura de software","CONCEPT_COMPARISON"),
44:("dp26-p3-esp-ambientes-web","Internet, extranet, intranet e portal","SCENARIO"),
45:("dp26-p3-esp-arquitetura-software","SOA, web services e REST","SCENARIO"),
46:("dp26-p3-esp-https-tls","HTTPS, SSL e TLS","SCENARIO_COMPARISON"),
47:("dp26-p3-esp-metricas","Pontos de Função e Story Points","CONCEPT_COMPARISON"),
48:("dp26-p3-esp-mobile-lowcode","Desenvolvimento móvel multiplataforma","DIRECT_KNOWLEDGE"),
49:("dp26-p3-esp-padroes-reuso","SOLID e Substituição de Liskov","CODE_SCENARIO"),
50:("dp26-p3-esp-orientacao-objetos-web","Servidor web e servidor de aplicações","CONCEPT_COMPARISON"),
51:("dp26-p3-esp-frontend","SPA e PWA","CONCEPT_COMPARISON"),
52:("dp26-p3-esp-testes","Tipos de teste e TDD","ASSERTION_SET"),
53:("dp26-p3-esp-metodologias-ageis","Scrum, Kanban, XP, Waterfall e Lean","SCENARIO_COMPARISON"),
54:("dp26-p3-esp-requisitos","Requisitos funcionais/não funcionais e elicitação","SCENARIO"),
55:("dp26-p3-esp-devops-git","DevOps, CI e CD","DIRECT_KNOWLEDGE"),
56:("dp26-p3-esp-blockchain","Estrutura de blocos em blockchain","DIRECT_KNOWLEDGE"),
57:("dp26-p3-esp-design-arquitetura","Arquitetura hexagonal, monólito e microsserviços","ASSERTION_SET"),
58:("dp26-p3-esp-ia-dados-bigdata","Inteligência artificial e aprendizado","DIRECT_KNOWLEDGE"),
59:("dp26-p3-esp-bi-dw-etl-olap","ETL em Data Warehouse","SCENARIO"),
60:("dp26-p3-esp-bi-suporte-decisao","Sistemas de suporte à decisão","SCENARIO"),
61:("dp26-p3-esp-bi-fontes","Mapeamento e qualidade de fontes de dados","SCENARIO"),
62:("dp26-p3-esp-si-acesso","Políticas e modelos de controle de acesso","DIRECT_KNOWLEDGE"),
63:("dp26-p3-esp-si-sdl-owasp","OWASP Top 10:2021","DIRECT_KNOWLEDGE"),
64:("dp26-p3-esp-si-politicas","Mecanismos de segurança X.800","DIRECT_KNOWLEDGE"),
65:("dp26-p3-esp-bd-relacional-multidimensional","Abordagens relacional e multidimensional","CONCEPT_COMPARISON"),
66:("dp26-p3-esp-bd-nosql","Banco de dados NoSQL","DIRECT_KNOWLEDGE"),
67:("dp26-p3-esp-bd-integracao-ingestao","ETL e ELT","CONCEPT_COMPARISON"),
68:("dp26-p3-esp-metodologias-ageis","Scrum Master e impedimentos","SCENARIO"),
69:("dp26-p3-esp-metodologias-ageis","Planejamento do Sprint e capacidade","SCENARIO"),
70:("dp26-p3-esp-gov-projetos","Gerenciamento de projetos híbrido e ágil","DIRECT_KNOWLEDGE"),
}
items=[]
for n in range(41,71):
    topic_id,label,style=M[n]
    q=qs[n]
    items.append({
        'questionNumber':n,
        'page':q['page'],
        'primaryTopicId':topic_id,
        'topicLabel':label,
        'style':style,
        'classificationStatus':'MANUALLY_REVIEWED_TOPIC_ONLY',
        'answerKeyStatus':'NOT_AVAILABLE',
        'questionText':q['text'],
    })

topic_counts=Counter(i['primaryTopicId'] for i in items)
style_counts=Counter(i['style'] for i in items)
obj={
 'schemaVersion':'1.0.0',
 'sourceId':'fgv-dataprev-development-software-reference-exam',
 'documentName':PDF.name,
 'sha256':'962a9c53f78ef3ce4760dbe1e3bf69077755ef966ef2199c3a5b79630738a78d',
 'specificQuestionRange':[41,70],
 'specificQuestionCount':30,
 'mappingStatus':'MANUALLY_REVIEWED_TOPIC_ONLY',
 'answerKeyStatus':'NOT_AVAILABLE',
 'activationStatus':'NOT_ELIGIBLE_FOR_SDE_INCIDENCE',
 'activationReason':'Uma única prova e contagens por tópico abaixo da política mínima; ausência de gabarito não impede incidência temática, mas impede análise de alternativas corretas/anuladas.',
 'topicCounts':dict(sorted(topic_counts.items(),key=lambda kv:(-kv[1],kv[0]))),
 'styleCounts':dict(sorted(style_counts.items(),key=lambda kv:(-kv[1],kv[0]))),
 'questions':items,
}
(OUT/'dataprev-reference-exam-question-map.json').write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf-8')

# report
lines=['# Mapeamento manual - prova DATAPREV Desenvolvimento de Software','',
'## Status','',
'- 30 questões específicas (41 a 70) classificadas contra o edital DATAPREV 2026 Perfil 3.',
'- Gabarito não disponível.',
'- Uso permitido: aderência temática, estilo de cobrança e seleção de questões para revisão externa.',
'- Uso proibido neste estágio: ativar incidência no SDE ou analisar padrão de distratores corretos/anulações.',
'', '## Distribuição observada por subassunto','', '| Subassunto | Questões |', '|---|---:|']
for topic,count in sorted(topic_counts.items(),key=lambda kv:(-kv[1],kv[0])):
    label=next(i['topicLabel'] for i in items if i['primaryTopicId']==topic)
    lines.append(f'| {label} (`{topic}`) | {count} |')
lines += ['', '## Formatos de cobrança', '', '| Formato | Questões |', '|---|---:|']
for st,count in sorted(style_counts.items(),key=lambda kv:(-kv[1],kv[0])):
    lines.append(f'| {st} | {count} |')
lines += ['', '## Questões', '', '| Q | Página | Classificação | Formato |', '|---:|---:|---|---|']
for i in items:
    lines.append(f"| {i['questionNumber']} | {i['page']} | {i['topicLabel']} | {i['style']} |")
(OUT/'DATAPREV_REFERENCE_EXAM_MAP.md').write_text('\n'.join(lines),encoding='utf-8')
print(json.dumps({'topicCounts':obj['topicCounts'],'styleCounts':obj['styleCounts']},ensure_ascii=False,indent=2))
