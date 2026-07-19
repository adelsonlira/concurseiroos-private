import { ChangeEvent, ReactNode, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Database,
  Download,
  Save,
  Settings2,
  ShieldAlert,
  Trash2,
  Upload
} from "lucide-react";
import OperationalScreenGuide from "./OperationalScreenGuide";
import { useConcurseiroStore } from "../store";
import { ConfigUsuario } from "../types";
import { useCloudAccountStore } from "../integrations/cloud/cloudStore";
import { clearAllPrivatePdfAssociations } from "../integrations/localFiles/privatePdfAccess";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function BackupSettingsView() {
  const cloud = useCloudAccountStore();
  const {
    configuracao,
    updateConfiguracao,
    setWeeklyAvailabilityDay,
    setAvailabilityOverride,
    removeAvailabilityOverride,
    exportBackup,
    importBackup,
    resetAllData
  } = useConcurseiroStore();

  const [studentName, setStudentName] = useState(configuracao.estudanteNome);
  const [studentEmail, setStudentEmail] = useState(configuracao.estudanteEmail ?? "");
  const [localProva, setLocalProva] = useState(configuracao.localProva ?? "Natal/RN");
  const [localLotacao, setLocalLotacao] = useState(configuracao.localLotacao ?? "Natal/RN");
  const [focoMinutos, setFocoMinutos] = useState(
    configuracao.configuracoesPomodoro.focoMinutos
  );
  const [durations, setDurations] = useState<ConfigUsuario["duracaoSessaoPreferidaMinutos"]>(
    structuredClone(configuracao.duracaoSessaoPreferidaMinutos)
  );
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideMinutes, setOverrideMinutes] = useState(120);
  const [overrideReason, setOverrideReason] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{
    success?: boolean;
    error?: string;
    message?: string;
  }>({});
  const [resetting, setResetting] = useState(false);

  const handleSaveConfig = () => {
    setFormError(null);
    const values = Object.values(durations) as number[];
    if (
      !Number.isInteger(focoMinutos) ||
      focoMinutos <= 0 ||
      values.some((value) => !Number.isInteger(value) || value <= 0)
    ) {
      setFormError("Pomodoro e durações das sessões devem ser inteiros positivos.");
      return;
    }

    updateConfiguracao({
      estudanteNome: studentName.trim() || "Concurseiro",
      estudanteEmail: studentEmail.trim() || undefined,
      localProva: localProva.trim() || undefined,
      localLotacao: localLotacao.trim() || undefined,
      duracaoSessaoPreferidaMinutos: durations,
      configuracoesPomodoro: {
        ...configuracao.configuracoesPomodoro,
        focoMinutos
      },
      ultimoSyncTimestamp: new Date().toISOString()
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const addOverride = () => {
    setFormError(null);
    if (!overrideDate) {
      setFormError("Informe a data da exceção de disponibilidade.");
      return;
    }
    if (!Number.isInteger(overrideMinutes) || overrideMinutes < 0) {
      setFormError("Os minutos da exceção devem ser um inteiro maior ou igual a zero.");
      return;
    }
    setAvailabilityOverride({
      date: overrideDate,
      totalMinutes: overrideMinutes,
      reason: overrideReason.trim() || undefined
    });
    setOverrideDate("");
    setOverrideMinutes(120);
    setOverrideReason("");
  };

  const triggerExport = () => {
    const backupObj = exportBackup();
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    const dateStr = new Date().toISOString().split("T")[0];
    downloadAnchor.setAttribute("download", `Backup_ConcurseiroOS_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const parsed = JSON.parse(loadEvent.target?.result as string);
        const result = importBackup(parsed);
        if (result.success) {
          setImportStatus({
            success: true,
            message: result.warnings?.includes("LEGACY_DEFAULT_AVAILABILITY_MIGRATED_180_TO_120")
              ? "Backup importado. LEGACY_DEFAULT_AVAILABILITY_MIGRATED_180_TO_120"
              : result.migrated
                ? "Backup antigo importado e migrado com segurança para o formato atual."
                : "Backup importado."
          });
          setTimeout(() => setImportStatus({}), 4000);
        } else {
          setImportStatus({
            success: false,
            error: result.error || "Erro no processamento do backup."
          });
        }
      } catch {
        setImportStatus({
          success: false,
          error: "Arquivo JSON corrompido ou malformado."
        });
      }
    };
    reader.readAsText(file);
  };

  const handleFullReset = async () => {
    const confirmed = window.confirm(
      "ATENÇÃO: isto restaurará apenas este dispositivo para a configuração inicial da DATAPREV. Um backup será baixado automaticamente, a cópia existente na nuvem será preservada e os vínculos locais com PDFs serão removidos sem apagar os arquivos. Deseja continuar?"
    );
    if (!confirmed) return;
    setResetting(true);
    try {
      triggerExport();
      await cloud.prepareForLocalReset();
      await clearAllPrivatePdfAssociations();
      resetAllData();
      window.location.reload();
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex items-center justify-between border-b border-zinc-900 pb-4">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
              Ajustes e backup
            </h2>
          </div>
          <span className="text-xs font-mono text-zinc-500">
            Armazenamento local do navegador
          </span>
        </header>

        <OperationalScreenGuide
          icon={Settings2}
          title="Configurações e backup"
          purpose="Ajuste disponibilidade, duração das sessões e segurança dos dados. Evite alterar parâmetros diariamente sem motivo real."
          whenToUse="quando sua rotina mudar ou antes de trocar de dispositivo"
          outcome="parâmetros operacionais e cópia de segurança"
        />

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-5">
            <div className="mb-5 flex items-center gap-2 border-b border-zinc-900 pb-3">
              <Settings2 className="h-4 w-4 text-blue-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
                Perfil e parâmetros operacionais
              </h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome do estudante">
                <input
                  value={studentName}
                  onChange={(event) => setStudentName(event.target.value)}
                  className="input-field"
                />
              </Field>
              <Field label="E-mail (opcional)">
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(event) => setStudentEmail(event.target.value)}
                  className="input-field"
                />
              </Field>
              <Field label="Local da prova">
                <input
                  value={localProva}
                  onChange={(event) => setLocalProva(event.target.value)}
                  className="input-field"
                />
              </Field>
              <Field label="Local de lotação">
                <input
                  value={localLotacao}
                  onChange={(event) => setLocalLotacao(event.target.value)}
                  className="input-field"
                />
              </Field>
              <Field label="Pomodoro — foco (min)">
                <input
                  type="number"
                  min={1}
                  value={focoMinutos}
                  onChange={(event) => setFocoMinutos(Number(event.target.value))}
                  className="input-field"
                />
              </Field>
            </div>

            <div className="mt-6">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                Duração operacional preferida por sessão
              </h4>
              <p className="mt-1 text-[11px] text-zinc-600">
                Esses valores dimensionam blocos do planner; não representam tempo para dominar o conteúdo.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
                {(
                  ["teoria", "questoes", "revisao", "flashcards", "simulado"] as const
                ).map((type) => (
                  <Field key={type} label={type === "questoes" ? "Questões" : type}>
                    <input
                      type="number"
                      min={1}
                      value={durations[type]}
                      onChange={(event) =>
                        setDurations((current) => ({
                          ...current,
                          [type]: Number(event.target.value)
                        }))
                      }
                      className="input-field"
                    />
                  </Field>
                ))}
              </div>
            </div>

            {formError && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}
            {saveSuccess && (
              <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Configurações salvas.
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveConfig}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500"
            >
              <Save className="h-4 w-4" />
              Salvar perfil e durações
            </button>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-5">
            <div className="mb-3 flex items-center gap-2 border-b border-zinc-900 pb-3">
              <Database className="h-4 w-4 text-emerald-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
                Backup local
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-zinc-500">
              Os dados ficam no armazenamento local do navegador. Exporte um JSON regularmente para reduzir o risco de perda ao limpar dados do site ou trocar de computador.
            </p>
            <button
              type="button"
              onClick={triggerExport}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-600"
            >
              <Download className="h-4 w-4 text-emerald-500" />
              Exportar backup JSON
            </button>
            <label className="relative mt-3 flex cursor-pointer flex-col items-center rounded-lg border border-dashed border-zinc-700 p-4 text-center hover:bg-zinc-900/50">
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <Upload className="mb-1 h-5 w-5 text-zinc-500" />
              <span className="text-[11px] text-zinc-400">Importar backup JSON</span>
            </label>
            {importStatus.success && (
              <div className="mt-3 text-xs text-emerald-400">{importStatus.message ?? "Backup importado."}</div>
            )}
            {importStatus.error && (
              <div className="mt-3 text-xs text-red-400">{importStatus.error}</div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-5">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-purple-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
              Disponibilidade semanal variável
            </h3>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            A configuração inicial é de 120 minutos, de segunda a sábado, com domingo livre. O saldo diário desconta automaticamente as sessões já concluídas.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            {configuracao.disponibilidadeEstudo.weekly.map((day) => (
              <div key={day.dayOfWeek} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-300">
                    {DAY_LABELS[day.dayOfWeek]}
                  </span>
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(event) =>
                      setWeeklyAvailabilityDay({
                        ...day,
                        enabled: event.target.checked,
                        totalMinutes: event.target.checked
                          ? Math.max(day.totalMinutes, 120)
                          : 0
                      })
                    }
                  />
                </div>
                <input
                  type="number"
                  min={0}
                  step={15}
                  disabled={!day.enabled}
                  value={day.totalMinutes}
                  onChange={(event) =>
                    setWeeklyAvailabilityDay({
                      ...day,
                      totalMinutes: Number(event.target.value)
                    })
                  }
                  className="input-field mt-3 disabled:cursor-not-allowed disabled:opacity-40"
                />
                <div className="mt-1 text-[9px] font-mono text-zinc-600">minutos</div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[0.7fr_0.5fr_1fr_auto] md:items-end">
            <Field label="Exceção em uma data">
              <input
                type="date"
                value={overrideDate}
                onChange={(event) => setOverrideDate(event.target.value)}
                className="input-field"
              />
            </Field>
            <Field label="Minutos">
              <input
                type="number"
                min={0}
                value={overrideMinutes}
                onChange={(event) => setOverrideMinutes(Number(event.target.value))}
                className="input-field"
              />
            </Field>
            <Field label="Motivo (opcional)">
              <input
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
                className="input-field"
                placeholder="Ex.: compromisso no período da tarde"
              />
            </Field>
            <button
              type="button"
              onClick={addOverride}
              className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/20"
            >
              Adicionar exceção
            </button>
          </div>

          {configuracao.disponibilidadeEstudo.overrides.length > 0 && (
            <div className="mt-4 space-y-2">
              {configuracao.disponibilidadeEstudo.overrides.map((override) => (
                <div
                  key={override.date}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2"
                >
                  <div className="text-xs text-zinc-400">
                    <span className="font-mono text-zinc-200">{override.date}</span>
                    {` · ${override.totalMinutes} min`}
                    {override.reason ? ` · ${override.reason}` : ""}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAvailabilityOverride(override.date)}
                    aria-label={`Remover exceção ${override.date}`}
                    className="text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            <span className="text-xs font-bold uppercase tracking-wide text-red-400">
              Zona crítica
            </span>
          </div>
          <p className="mt-3 max-w-3xl text-xs leading-relaxed text-zinc-500">
            Restaura somente este navegador para o pacote inicial da DATAPREV 2026 — Perfil 3. Antes do reset, o aplicativo baixa um backup, desconecta a conta, preserva a cópia da nuvem e remove apenas os vínculos locais com PDFs. Os arquivos PDF originais não são apagados.
          </p>
          <button
            type="button"
            onClick={handleFullReset}
            disabled={resetting}
            className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-xs font-semibold text-red-300 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resetting ? "Preparando restauração segura..." : "Baixar backup e restaurar este dispositivo"}
          </button>
        </section>
      </div>
    </div>
  );
}

function Field(props: { label: string; children: ReactNode; key?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-mono uppercase tracking-wide text-zinc-500">
        {props.label}
      </span>
      {props.children}
    </label>
  );
}
