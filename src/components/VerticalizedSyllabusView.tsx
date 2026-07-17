import React, { useState } from "react";
import { useConcurseiroStore } from "../store";
import { 
  BookOpen, ChevronRight, ChevronDown, CheckSquare, Square, 
  Clock, AlertTriangle, Target, FileText, Zap, Star
} from "lucide-react";
import OperationalScreenGuide from "./OperationalScreenGuide";
import taxonomyArtifact from "../../data/knowledge/dataprev-2026-taxonomy.json";
import routingArtifact from "../../data/quality/pedagogical-routing-report.json";

export default function VerticalizedSyllabusView() {
  const { 
    concursos, disciplinas, assuntos, subassuntos, activeConcursoId,
    flashcards, historicoAtividades, cronogramasRevisao
  } = useConcurseiroStore();

  const activeConcurso = concursos.find(c => c.id === activeConcursoId) || concursos[0];

  const concursoDisciplinas = disciplinas
    .filter(d => d.concursoId === activeConcurso?.id)
    .sort((a, b) => a.ordem - b.ordem);

  const coverageBySubtopic = new Map(taxonomyArtifact.coverage.records.map((item) => [item.subtopicId, item]));
  const routingBySubtopic = new Map(routingArtifact.records.map((item) => [item.subtopicId, item]));

  const [expandedDisciplines, setExpandedDisciplines] = useState<{ [id: string]: boolean }>({});
  const [expandedAssuntos, setExpandedAssuntos] = useState<{ [id: string]: boolean }>({});

  const toggleDiscipline = (id: string) => {
    setExpandedDisciplines(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAssunto = (id: string) => {
    setExpandedAssuntos(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-zinc-950 flex flex-col gap-6" id="verticalized-syllabus-container">
      <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
        Edital e cobertura: {activeConcurso?.nome}
      </h1>

      <OperationalScreenGuide
        icon={BookOpen}
        title="Edital e cobertura"
        purpose="Veja o que o edital exige e quais itens já possuem evidência real. Esta tela não define sozinha a próxima sessão."
        whenToUse="para consultar cobertura e localizar lacunas"
        outcome="mapa auditável do conteúdo programático"
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CoverageMetric label="Subassuntos oficiais" value={routingArtifact.counts.subtopics} detail="Escopo canônico do edital" />
        <CoverageMetric label="Teoria exata" value={routingArtifact.counts.exactTheory} detail="Localizador validado no subassunto" />
        <CoverageMetric label="Fallback amplo" value={routingArtifact.counts.topicTheoryFallback} detail="Seção do assunto, explicitamente sinalizada" />
        <CoverageMetric label="Localizador manual" value={routingArtifact.counts.manualTheoryLocatorRequired} detail="Nunca recebe páginas de subassunto irmão" />
      </section>

      <div className="border border-zinc-900 rounded-lg overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="bg-zinc-900 text-zinc-400 font-mono uppercase text-[10px]">
            <tr>
              <th className="px-4 py-3">Disciplina / Assunto / Sub</th>
              <th className="px-4 py-3">Peso oficial</th>
              <th className="px-4 py-3">Prioridade do edital</th>
              <th className="px-4 py-3">Questões</th>
              <th className="px-4 py-3">Acertos</th>
              <th className="px-4 py-3">Erros</th>
              <th className="px-4 py-3">Acerto observado</th>
              <th className="px-4 py-3">Base executável</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {concursoDisciplinas.map((disc) => {
              const discAssuntos = assuntos.filter(a => a.disciplinaId === disc.id);
              const isDiscExpanded = expandedDisciplines[disc.id];

              return (
                <React.Fragment key={disc.id}>
                  {/* Disciplina Row */}
                  <tr className="bg-zinc-900/40 cursor-pointer" onClick={() => toggleDiscipline(disc.id)}>
                    <td className="px-4 py-3 font-semibold text-zinc-100 flex items-center gap-2">
                      {isDiscExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      {disc.nome}
                    </td>
                    <td className="px-4 py-3">{disc.pesoPadrao}</td>
                    <td className="px-4 py-3">-</td>
                    <td className="px-4 py-3">{disc.totalQuestoesRespondidas}</td>
                    <td className="px-4 py-3">{disc.totalQuestoesAcertadas}</td>
                    <td className="px-4 py-3">{disc.totalQuestoesRespondidas - disc.totalQuestoesAcertadas}</td>
                    <td className="px-4 py-3 font-bold text-emerald-400">
                      {disc.totalQuestoesRespondidas > 0 ? Math.round((disc.totalQuestoesAcertadas / disc.totalQuestoesRespondidas) * 100) : 0}%
                    </td>
                    <td className="px-4 py-3">-</td>
                  </tr>

                  {isDiscExpanded && discAssuntos.map(ass => {
                    const assSub = subassuntos.filter(sa => sa.assuntoId === ass.id);
                    const isAssExpanded = expandedAssuntos[ass.id];
                    
                    return (
                      <React.Fragment key={ass.id}>
                        {/* Assunto Row */}
                        <tr className="bg-zinc-900/20 cursor-pointer" onClick={() => toggleAssunto(ass.id)}>
                          <td className="px-8 py-2 text-zinc-200 flex items-center gap-2">
                            {isAssExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            {ass.nome}
                          </td>
                          <td className="px-4 py-2">-</td>
                          <td className="px-4 py-2">
                             <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                               ass.prioridadeEdital === "ALTA" ? "bg-red-500/20 text-red-400" :
                               ass.prioridadeEdital === "MEDIA" ? "bg-amber-500/20 text-amber-400" :
                               "bg-zinc-800 text-zinc-400"
                             }`}>
                               {ass.prioridadeEdital}
                             </span>
                          </td>
                          <td className="px-4 py-2">{ass.questoesRespondidas}</td>
                          <td className="px-4 py-2">{ass.questoesAcertadas}</td>
                          <td className="px-4 py-2">{ass.questoesRespondidas - ass.questoesAcertadas}</td>
                          <td className="px-4 py-2 font-medium text-emerald-400/80">
                             {ass.questoesRespondidas > 0 ? Math.round((ass.questoesAcertadas / ass.questoesRespondidas) * 100) : 0}%
                          </td>
                          <td className="px-4 py-2">-</td>
                        </tr>

                        {isAssExpanded && assSub.map(sub => {
                           // Find flashcards for this subassunto
                           const subFlashcards = flashcards.filter(f => f.subassuntoId === sub.id);
                           const subRevisao = cronogramasRevisao.find(cr => cr.subassuntoId === sub.id);

                           return (
                             <tr key={sub.id} className="bg-zinc-950 hover:bg-zinc-900 transition-colors">
                                <td className="px-12 py-2 text-zinc-400 font-sans flex items-center gap-2">
                                  {sub.completado ? <CheckSquare className="h-3.5 w-3.5 text-emerald-500" /> : <Square className="h-3.5 w-3.5 text-zinc-700" />}
                                  {sub.nome}
                                </td>
                                <td className="px-4 py-2">-</td>
                                <td className="px-4 py-2">-</td>
                                <td className="px-4 py-2">{sub.questoesRespondidas}</td>
                                <td className="px-4 py-2">{sub.questoesAcertadas}</td>
                                <td className="px-4 py-2">{sub.questoesRespondidas - sub.questoesAcertadas}</td>
                                <td className="px-4 py-2 font-medium text-zinc-400">
                                  {sub.questoesRespondidas > 0 ? Math.round((sub.questoesAcertadas / sub.questoesRespondidas) * 100) : 0}%
                                </td>
                                <td className="px-4 py-2">
                                  {(() => {
                                    const coverage = coverageBySubtopic.get(sub.id);
                                    const routing = routingBySubtopic.get(sub.id);
                                    if (!coverage || !routing) return <span className="text-zinc-600">Sem catálogo</span>;
                                    const theoryLabel = routing.theoryStatus === "EXACT_LOCAL"
                                      ? "Teoria exata"
                                      : routing.theoryStatus === "TOPIC_FALLBACK"
                                        ? "Teoria ampla · confirmar trecho"
                                        : "Teoria: localizar manualmente";
                                    const questionLabel = routing.diagnosticStatus === "EXACT_LOCAL_QUESTION_SET"
                                      ? "questões locais"
                                      : routing.diagnosticStatus === "TOPIC_LOCAL_QUESTION_SET"
                                        ? "questões amplas"
                                        : "questões via plataforma";
                                    const className = routing.theoryStatus === "MANUAL_LOCATOR_REQUIRED"
                                      ? "text-amber-400"
                                      : routing.theoryStatus === "TOPIC_FALLBACK"
                                        ? "text-cyan-200"
                                        : "text-emerald-300";
                                    return <span className={className}>{theoryLabel} · {questionLabel}</span>;
                                  })()}
                                </td>
                             </tr>
                           );
                        })}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CoverageMetric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900/25 p-4">
      <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-zinc-100">{value}</div>
      <div className="mt-1 text-[11px] text-zinc-500">{detail}</div>
    </article>
  );
}
