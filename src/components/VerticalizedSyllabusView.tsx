import React, { useState } from "react";
import { useConcurseiroStore } from "../store";
import { 
  BookOpen, ChevronRight, ChevronDown, CheckSquare, Square, 
  Clock, AlertTriangle, Target, FileText, Zap, Star
} from "lucide-react";

export default function VerticalizedSyllabusView() {
  const { 
    concursos, disciplinas, assuntos, subassuntos, activeConcursoId,
    flashcards, historicoAtividades, cronogramasRevisao
  } = useConcurseiroStore();

  const activeConcurso = concursos.find(c => c.id === activeConcursoId) || concursos[0];

  const concursoDisciplinas = disciplinas
    .filter(d => d.concursoId === activeConcurso?.id)
    .sort((a, b) => a.ordem - b.ordem);

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
        Edital Verticalizado Inteligente: {activeConcurso?.nome}
      </h1>

      <div className="border border-zinc-900 rounded-lg overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="bg-zinc-900 text-zinc-400 font-mono uppercase text-[10px]">
            <tr>
              <th className="px-4 py-3">Disciplina / Assunto / Sub</th>
              <th className="px-4 py-3">Peso</th>
              <th className="px-4 py-3">Relevância</th>
              <th className="px-4 py-3">Qst</th>
              <th className="px-4 py-3">Acertos</th>
              <th className="px-4 py-3">Erros</th>
              <th className="px-4 py-3">Domínio</th>
              <th className="px-4 py-3">Status</th>
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
                                   {sub.completado ? "Feito" : "Pendente"}
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
