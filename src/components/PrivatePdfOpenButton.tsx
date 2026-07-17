import { Cloud, ExternalLink, FileKey2, HardDrive, Loader2, RotateCcw, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MaterialLocatorRecommendation } from "../core/materials/types";
import { useConcurseiroStore } from "../store";
import { useCloudAccountStore } from "../integrations/cloud/cloudStore";
import { normalizeMaterialFileName } from "../integrations/cloud/privateDocumentPolicy";
import {
  chooseAndAssociatePrivatePdf,
  choosePdfTemporarilyAndOpen,
  loadPrivatePdfAssociation,
  openAssociatedPrivatePdf,
  PrivatePdfAccessError,
  removePrivatePdfAssociation,
  supportsPersistentPrivatePdfAccess,
  type StoredPrivatePdfAssociation
} from "../integrations/localFiles/privatePdfAccess";

interface PrivatePdfOpenButtonProps {
  material: MaterialLocatorRecommendation;
  compact?: boolean;
}

function errorMessage(error: unknown): string {
  if (error instanceof PrivatePdfAccessError) {
    if (error.code === "USER_CANCELLED") return "";
    return error.message;
  }
  return error instanceof Error ? error.message : "Não foi possível abrir o PDF.";
}

function withPdfPage(url: string, page: number): string {
  return `${url.replace(/#.*$/, "")}#page=${Math.max(1, Math.trunc(page))}`;
}

export default function PrivatePdfOpenButton({ material, compact = false }: PrivatePdfOpenButtonProps) {
  const persistentSupported = supportsPersistentPrivatePdfAccess();
  const biblioteca = useConcurseiroStore((state) => state.biblioteca);
  const cloud = useCloudAccountStore();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [association, setAssociation] = useState<StoredPrivatePdfAssociation | null>(null);
  const [loadingAssociation, setLoadingAssociation] = useState(persistentSupported);
  const [opening, setOpening] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const libraryItem = useMemo(() => {
    const expected = normalizeMaterialFileName(material.sourceFileName);
    return biblioteca.find((item) => {
      const privateMaterial = item.privateMaterial;
      if (!privateMaterial) return false;
      return privateMaterial.catalogMaterialId === material.materialId ||
        normalizeMaterialFileName(privateMaterial.sourceFileName) === expected;
    }) ?? null;
  }, [biblioteca, material.materialId, material.sourceFileName]);

  const cloudPath = libraryItem?.privateMaterial?.storageStatus === "AVAILABLE"
    ? libraryItem.privateMaterial.storagePath ?? null
    : null;
  const cloudAvailable = cloud.authStatus === "SIGNED_IN" && Boolean(cloudPath);
  const canUploadCloud = cloud.authStatus === "SIGNED_IN" && cloud.environment.availability === "CONFIGURED";

  useEffect(() => {
    let active = true;
    if (!persistentSupported) {
      setLoadingAssociation(false);
      return () => { active = false; };
    }

    setLoadingAssociation(true);
    loadPrivatePdfAssociation(material.materialId)
      .then((result) => { if (active) setAssociation(result); })
      .finally(() => { if (active) setLoadingAssociation(false); });

    return () => { active = false; };
  }, [material.materialId, persistentSupported]);

  const openCloudCopy = async () => {
    if (!cloudPath) throw new Error("Cópia em nuvem não localizada.");
    const url = await cloud.openPrivateDocument(cloudPath);
    if (!url) throw new Error("Não foi possível gerar o acesso temporário ao PDF.");
    const opened = window.open(withPdfPage(url, material.startPage), "_blank", "noopener,noreferrer");
    if (!opened) throw new Error("O navegador bloqueou a nova aba. Autorize pop-ups e tente novamente.");
  };

  const openLocalCopy = async () => {
    if (!persistentSupported) {
      await choosePdfTemporarilyAndOpen({
        expectedFileName: material.sourceFileName,
        startPage: material.startPage
      });
      return;
    }

    let current = association;
    if (!current) {
      current = await chooseAndAssociatePrivatePdf({
        materialId: material.materialId,
        expectedFileName: material.sourceFileName
      });
      setAssociation(current);
    }
    await openAssociatedPrivatePdf({ association: current, startPage: material.startPage });
  };

  const handleOpen = async () => {
    setOpening(true);
    setMessage("");
    try {
      if (cloudAvailable) await openCloudCopy();
      else await openLocalCopy();
    } catch (error) {
      const text = errorMessage(error);
      if (text) setMessage(text);
      if (
        error instanceof PrivatePdfAccessError &&
        ["FILE_UNAVAILABLE", "FILE_MISMATCH", "PERMISSION_DENIED"].includes(error.code)
      ) {
        await removePrivatePdfAssociation(material.materialId).catch(() => undefined);
        setAssociation(null);
      }
    } finally {
      setOpening(false);
    }
  };

  const handleRelink = async () => {
    await removePrivatePdfAssociation(material.materialId).catch(() => undefined);
    setAssociation(null);
    setMessage("Vínculo local removido. Selecione o PDF correto na próxima abertura.");
  };

  const handleCloudUpload = async (file: File | undefined) => {
    if (!file) return;
    const expected = normalizeMaterialFileName(material.sourceFileName);
    if (normalizeMaterialFileName(file.name) !== expected) {
      setMessage(`Selecione '${material.sourceFileName}' para evitar vincular o material errado.`);
      return;
    }
    setUploading(true);
    setMessage("");
    try {
      const result = await cloud.uploadPrivateDocuments([file]);
      if (result.duplicates.length === 1) {
        setMessage("Este mesmo PDF já existe no cofre; nenhuma cópia adicional foi criada.");
        return;
      }
      if (result.uploaded !== 1) {
        throw new Error(result.failed[0]?.error ?? "O PDF não foi enviado ao cofre.");
      }
      setMessage("PDF enviado ao cofre privado. Ele estará disponível nos seus dispositivos autenticados.");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setUploading(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  };

  const label = opening
    ? "Abrindo…"
    : cloudAvailable
      ? `Abrir da nuvem na página ${material.startPage}`
      : loadingAssociation
        ? "Verificando PDF…"
        : association
          ? `Abrir PDF local na página ${material.startPage}`
          : persistentSupported
            ? `Vincular PDF local e abrir na página ${material.startPage}`
            : `Selecionar PDF e abrir na página ${material.startPage}`;

  return (
    <div className={compact ? "mt-3" : "mt-4"}>
      <input
        ref={uploadInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => void handleCloudUpload(event.target.files?.[0])}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleOpen}
          disabled={opening || loadingAssociation}
          className="inline-flex items-center gap-2 rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-100 transition hover:border-indigo-300/50 hover:bg-indigo-500/15 disabled:cursor-wait disabled:opacity-60"
        >
          {opening || loadingAssociation ? <Loader2 className="h-4 w-4 animate-spin" /> : cloudAvailable ? <Cloud className="h-4 w-4" /> : association ? <ExternalLink className="h-4 w-4" /> : <FileKey2 className="h-4 w-4" />}
          {label}
        </button>

        {cloudAvailable && (
          <button type="button" onClick={() => void openLocalCopy()} className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-2.5 py-2 text-[10px] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200">
            <HardDrive className="h-3.5 w-3.5" /> Usar cópia local
          </button>
        )}

        {!cloudAvailable && canUploadCloud && (
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-2 text-[10px] text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
            Enviar ao cofre
          </button>
        )}

        {association && (
          <button type="button" onClick={handleRelink} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300" title="Trocar o PDF local vinculado">
            <RotateCcw className="h-3.5 w-3.5" /> Trocar local
          </button>
        )}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
        {cloudAvailable
          ? "A cópia privada do Supabase abre por link temporário. O Coach e o Gemini não recebem o conteúdo do PDF."
          : canUploadCloud
            ? "Use o cofre para acessar em outros dispositivos ou mantenha somente uma cópia local neste navegador."
            : "O vínculo local fica neste navegador. Para acesso fora de casa, configure o Supabase, faça login e envie o PDF ao cofre privado."}
      </p>
      {message && <p className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[10px] leading-relaxed text-amber-200">{message}</p>}
    </div>
  );
}
