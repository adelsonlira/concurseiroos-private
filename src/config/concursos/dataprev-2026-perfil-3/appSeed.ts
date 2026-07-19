/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Assunto,
  Concurso,
  ConcursoStatus,
  DifficultyLevel,
  Disciplina,
  Edital,
  Estatisticas,
  ItemBiblioteca,
  ParseStatus,
  Subassunto
} from "../../../types";
import { createSixDayAvailability } from "../../../core/availability/availabilityEngine";
import {
  DATAPREV_2026_PROFILE_3_ID,
  DATAPREV_2026_PROFILE_3_PACKAGE
} from "./officialData";
import { buildPrivateStudyMaterialLibraryItems } from "./privateStudyMaterials";

const CREATED_AT = "2026-07-03T00:00:00-03:00";

import type { CompetitionAppSeed } from "../types";

/** @deprecated Use CompetitionAppSeed for package-independent integrations. */
export type DataprevAppSeed = CompetitionAppSeed;

export function buildDataprev2026Profile3AppSeed(): CompetitionAppSeed {
  const pkg = DATAPREV_2026_PROFILE_3_PACKAGE;

  const concurso: Concurso = {
    id: DATAPREV_2026_PROFILE_3_ID,
    nome: "DATAPREV 2026 — Perfil 3 — Desenvolvimento de Software",
    orgao: "DATAPREV",
    banca: "FGV",
    status: ConcursoStatus.EDITAL_PUBLICADO,
    vagas: pkg.vacancies.immediate.total,
    remuneracaoInicial: pkg.remunerationInitial,
    dataInscricaoInicio: "2026-07-06T16:00:00-03:00",
    dataInscricaoFim: "2026-08-06T16:00:00-03:00",
    dataProva: "2026-10-11T13:00:00-03:00",
    siteOficial: "https://conhecimento.fgv.br/concursos/dataprev26",
    isFavorite: true,
    notes:
      "Perfil 3, prova e lotação em Natal/RN. 20 vagas imediatas e 80 em cadastro de reserva na localidade. " +
      "Os pesos internos por assunto são neutros enquanto não houver distribuição oficial ou matriz FGV validada.",
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT
  };

  const edital: Edital = {
    id: "edital-dataprev-001-2026-p3",
    concursoId: DATAPREV_2026_PROFILE_3_ID,
    urlEdital: "https://conhecimento.fgv.br/concursos/dataprev26",
    resumoIA:
      "Dados estruturados do Edital 001/2026: prova objetiva com 70 questões e 115 pontos, " +
      "mínimo global de 57,5 pontos e eliminação ao zerar qualquer disciplina. " +
      "A distribuição de questões dentro dos assuntos não foi informada pelo edital.",
    datasImportantes: {
      inscricoes: "06/07/2026 a 06/08/2026",
      isencaoTaxa: "06/07/2026 a 08/07/2026",
      pagamentoTaxa: "07/08/2026",
      provaObjetiva: "11/10/2026"
    },
    bancaRegras: {
      tipoQuestao: "MULTIPLA_ESCOLHA",
      penalidadeErrada: false,
      critériosDesempate: [...pkg.officialRules.tieBreakCriteria]
    },
    parseStatus: ParseStatus.DONE,
    parsedAt: CREATED_AT,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT
  };

  const disciplinas: Disciplina[] = pkg.sde.disciplinas.map((item, index) => ({
    id: item.id,
    concursoId: DATAPREV_2026_PROFILE_3_ID,
    nome: item.nome,
    pesoPadrao: pkg.sde.edital.pontosPorQuestao[item.id],
    ordem: index + 1,
    percentualAcertosAlvo: null,
    totalQuestoesRespondidas: 0,
    totalQuestoesAcertadas: 0,
    tempoTotalEstudoMinutos: 0,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT
  }));

  const assuntos: Assunto[] = pkg.sde.assuntos.map((item) => {
    const disciplineTopics = pkg.sde.assuntos.filter(
      (candidate) => candidate.disciplinaId === item.disciplinaId
    );
    return {
      id: item.id,
      disciplinaId: item.disciplinaId,
      nome: item.nome,
      ordem: disciplineTopics.findIndex((candidate) => candidate.id === item.id) + 1,
      prioridadeEdital: "NAO_INFORMADA",
      metaQuestoesResolvidas: 0,
      questoesRespondidas: 0,
      questoesAcertadas: 0,
      tempoEstudadoMinutos: 0,
      progressoPorcentagem: 0,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT
    };
  });

  const subassuntos: Subassunto[] = pkg.sde.subassuntos.map((item) => {
    const siblings = pkg.sde.subassuntos.filter(
      (candidate) => candidate.assuntoId === item.assuntoId
    );
    return {
      id: item.id,
      assuntoId: item.assuntoId,
      nome: item.nome,
      ordem: siblings.findIndex((candidate) => candidate.id === item.id) + 1,
      completado: false,
      prioridadeRevisao: DifficultyLevel.MEDIUM,
      questoesRespondidas: 0,
      questoesAcertadas: 0,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT
    };
  });

  const estatisticas: Estatisticas = {
    id: "global_stats",
    desempenhoGeralPorDisciplina: Object.fromEntries(
      disciplinas.map((item) => [
        item.id,
        {
          nomeDisciplina: item.nome,
          questoesRespondidas: 0,
          questoesAcertadas: 0,
          tempoMinutosEstudo: 0
        }
      ])
    ),
    historicoAcertosQuestoes: [],
    streakDiasEstudo: 0,
    recordeStreakDias: 0,
    pomodoroSessoesCompletas: 0,
    tempoTotalGeralMinutos: 0,
    questoesRespondidas: 0,
    questoesAcertadas: 0,
    flashcardsRevisados: 0,
    updatedAt: CREATED_AT
  };

  const configuracao: CompetitionAppSeed["configuracao"] = {
    id: "global_config",
    estudanteNome: "Concurseiro",
    metaHorariaDiariaMinutos: 180,
    concursoAlvoId: DATAPREV_2026_PROFILE_3_ID,
    activeSdeVersion: "v2",
    localProva: "Natal/RN",
    localLotacao: "Natal/RN",
    disponibilidadeEstudo: createSixDayAvailability({
      minutesPerActiveDay: 180,
      restDay: 0,
      timeZone: "America/Fortaleza",
      includesBreaks: true
    }),
    duracaoSessaoPreferidaMinutos: {
      teoria: 40,
      questoes: 45,
      revisao: 25,
      flashcards: 15,
      simulado: 180
    },
    configuracoesPomodoro: {
      focoMinutos: 25,
      descansoCurtoMinutos: 5,
      descansoLongoMinutos: 15,
      intervaloSessoes: 4
    },
    notificacoesAtivas: true,
    temaVisual: "DARK",
    offlineSyncAtivo: true,
    idiomaApp: "pt-BR"
  };

  const bibliotecaBase: ItemBiblioteca[] = [
    {
      id: "lib-dataprev-edital-001-2026",
      concursoId: DATAPREV_2026_PROFILE_3_ID,
      titulo: "Edital DATAPREV 001/2026 — página oficial da FGV",
      descricao: "Fonte oficial das regras, datas, pesos, critérios eliminatórios e conteúdo programático.",
      categoria: "BIBLIOGRAFIA",
      linkAcesso: "https://conhecimento.fgv.br/concursos/dataprev26",
      isFavorito: true,
      tags: ["dataprev", "fgv", "edital", "perfil-3", "fonte-oficial"],
      tipoMaterial: "LINK",
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT
    },
    {
      id: "lib-dataprev-video-sprint-fgv",
      concursoId: DATAPREV_2026_PROFILE_3_ID,
      titulo: "DATAPREV pós-edital — sprint de questões FGV",
      descricao: "Fonte de opinião especializada. Pode apoiar hipóteses de estilo de cobrança, mas não altera incidência ou prioridade sem transcrição e validação.",
      categoria: "OUTROS",
      linkAcesso: "https://www.youtube.com/watch?v=sX_PfUwRIeM",
      isFavorito: true,
      tags: ["dataprev", "fgv", "video", "opiniao-especialista", "pendente-transcricao"],
      tipoMaterial: "VIDEO",
      dadosVideo: { linkUrl: "https://www.youtube.com/watch?v=sX_PfUwRIeM" },
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT
    },
    {
      id: "lib-dataprev-video-inicio-estudos",
      concursoId: DATAPREV_2026_PROFILE_3_ID,
      titulo: "Concurso DATAPREV — como iniciar os estudos",
      descricao: "Fonte de opinião especializada. Recomendações serão tratadas como hipóteses qualitativas até a extração de afirmações verificáveis.",
      categoria: "OUTROS",
      linkAcesso: "https://www.youtube.com/watch?v=06Yp78zc2Pw",
      isFavorito: true,
      tags: ["dataprev", "planejamento", "video", "opiniao-especialista", "pendente-transcricao"],
      tipoMaterial: "VIDEO",
      dadosVideo: { linkUrl: "https://www.youtube.com/watch?v=06Yp78zc2Pw" },
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT
    },
    {
      id: "lib-dataprev-video-plano-pos-edital-ti",
      concursoId: DATAPREV_2026_PROFILE_3_ID,
      titulo: "DATAPREV 2026 — plano pós-edital para TI",
      descricao: "Fonte de opinião especializada. O Coach pode citar a existência do material, mas não transformar recomendações do vídeo em fatos ou pesos matemáticos sem validação.",
      categoria: "OUTROS",
      linkAcesso: "https://www.youtube.com/watch?v=Nbsq1bsLPxE",
      isFavorito: true,
      tags: ["dataprev", "ti", "plano-pos-edital", "video", "pendente-transcricao"],
      tipoMaterial: "VIDEO",
      dadosVideo: { linkUrl: "https://www.youtube.com/watch?v=Nbsq1bsLPxE" },
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT
    }
  ];

  const biblioteca: ItemBiblioteca[] = [
    ...bibliotecaBase,
    ...buildPrivateStudyMaterialLibraryItems()
  ];

  return {
    concurso,
    edital,
    disciplinas,
    assuntos,
    subassuntos,
    estatisticas,
    configuracao,
    biblioteca
  };
}
