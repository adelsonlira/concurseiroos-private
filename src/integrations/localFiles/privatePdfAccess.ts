export interface StoredPrivatePdfAssociation {
  materialId: string;
  expectedFileName: string;
  actualFileName: string;
  linkedAt: string;
  handle: FileSystemFileHandleLike;
}

interface FileSystemFileHandleLike {
  kind: "file";
  name: string;
  getFile(): Promise<File>;
  queryPermission?(descriptor?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
  requestPermission?(descriptor?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
}

interface FilePickerWindow extends Window {
  showOpenFilePicker?: (options?: {
    multiple?: boolean;
    excludeAcceptAllOption?: boolean;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<FileSystemFileHandleLike[]>;
}

const DATABASE_NAME = "concurseiroos-private-local-files";
const STORE_NAME = "private-pdf-handles";
const DATABASE_VERSION = 1;

export type PrivatePdfOpenFailureCode =
  | "UNSUPPORTED"
  | "USER_CANCELLED"
  | "PERMISSION_DENIED"
  | "FILE_MISMATCH"
  | "FILE_UNAVAILABLE"
  | "POPUP_BLOCKED"
  | "UNKNOWN";

export class PrivatePdfAccessError extends Error {
  constructor(
    public readonly code: PrivatePdfOpenFailureCode,
    message: string
  ) {
    super(message);
    this.name = "PrivatePdfAccessError";
  }
}

export function normalizeComparableFileName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

export function fileNameMatchesExpected(actualFileName: string, expectedFileName: string): boolean {
  return normalizeComparableFileName(actualFileName) === normalizeComparableFileName(expectedFileName);
}

export function buildPdfPageUrl(baseUrl: string, page: number): string {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1;
  const withoutFragment = baseUrl.split("#", 1)[0];
  return `${withoutFragment}#page=${safePage}`;
}

export function supportsPersistentPrivatePdfAccess(): boolean {
  if (typeof window === "undefined") return false;
  const pickerWindow = window as FilePickerWindow;
  return typeof pickerWindow.showOpenFilePicker === "function" && typeof indexedDB !== "undefined";
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new PrivatePdfAccessError("UNSUPPORTED", "Este navegador não oferece armazenamento local de vínculos de arquivo."));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "materialId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Não foi possível abrir o armazenamento local."));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Falha no armazenamento do vínculo local."));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Falha na transação do vínculo local."));
    };
  });
}

export async function loadPrivatePdfAssociation(
  materialId: string
): Promise<StoredPrivatePdfAssociation | null> {
  if (!supportsPersistentPrivatePdfAccess()) return null;
  try {
    const result = await withStore<StoredPrivatePdfAssociation | undefined>("readonly", (store) => store.get(materialId));
    return result ?? null;
  } catch {
    return null;
  }
}

export async function removePrivatePdfAssociation(materialId: string): Promise<void> {
  if (!supportsPersistentPrivatePdfAccess()) return;
  await withStore<undefined>("readwrite", (store) => store.delete(materialId));
}

/**
 * Removes only the local browser associations with private PDFs.
 *
 * The PDF files themselves are never deleted or uploaded by this operation;
 * only the File System Access API handles stored in IndexedDB are cleared.
 * This is used by the device reset flow so a restored device cannot retain
 * orphaned links to materials that no longer exist in the reset snapshot.
 */
export async function clearAllPrivatePdfAssociations(): Promise<void> {
  if (!supportsPersistentPrivatePdfAccess()) return;
  await withStore<undefined>("readwrite", (store) => store.clear());
}

function classifyPickerError(error: unknown): PrivatePdfAccessError {
  if (error instanceof PrivatePdfAccessError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new PrivatePdfAccessError("USER_CANCELLED", "Seleção do PDF cancelada.");
  }
  return new PrivatePdfAccessError("UNKNOWN", "Não foi possível selecionar o PDF.");
}

export async function chooseAndAssociatePrivatePdf(input: {
  materialId: string;
  expectedFileName: string;
}): Promise<StoredPrivatePdfAssociation> {
  if (!supportsPersistentPrivatePdfAccess()) {
    throw new PrivatePdfAccessError("UNSUPPORTED", "O navegador não permite manter um vínculo persistente com arquivos locais.");
  }

  try {
    const pickerWindow = window as FilePickerWindow;
    const handles = await pickerWindow.showOpenFilePicker?.({
      multiple: false,
      excludeAcceptAllOption: true,
      types: [
        {
          description: "Documento PDF",
          accept: { "application/pdf": [".pdf"] }
        }
      ]
    });
    const handle = handles?.[0];
    if (!handle) {
      throw new PrivatePdfAccessError("USER_CANCELLED", "Nenhum PDF foi selecionado.");
    }

    const file = await handle.getFile();
    if (!fileNameMatchesExpected(file.name, input.expectedFileName)) {
      throw new PrivatePdfAccessError(
        "FILE_MISMATCH",
        `O arquivo selecionado é '${file.name}', mas o coach indicou '${input.expectedFileName}'. Se você renomeou o arquivo, restaure o nome original para evitar abrir o material errado.`
      );
    }

    const association: StoredPrivatePdfAssociation = {
      materialId: input.materialId,
      expectedFileName: input.expectedFileName,
      actualFileName: file.name,
      linkedAt: new Date().toISOString(),
      handle
    };

    await withStore<IDBValidKey>("readwrite", (store) => store.put(association));
    return association;
  } catch (error) {
    throw classifyPickerError(error);
  }
}

async function ensureReadPermission(handle: FileSystemFileHandleLike): Promise<void> {
  if (!handle.queryPermission && !handle.requestPermission) return;

  const current = handle.queryPermission
    ? await handle.queryPermission({ mode: "read" })
    : "prompt";
  if (current === "granted") return;

  const requested = handle.requestPermission
    ? await handle.requestPermission({ mode: "read" })
    : current;
  if (requested !== "granted") {
    throw new PrivatePdfAccessError("PERMISSION_DENIED", "O navegador não recebeu permissão para ler este PDF.");
  }
}

function openPendingTab(): Window {
  const popup = window.open("about:blank", "_blank");
  if (!popup) {
    throw new PrivatePdfAccessError("POPUP_BLOCKED", "O navegador bloqueou a nova aba. Autorize pop-ups para este site e tente novamente.");
  }
  popup.document.title = "Abrindo PDF…";
  popup.document.body.innerHTML = "<p style='font-family:system-ui;padding:24px'>Abrindo PDF local…</p>";
  return popup;
}

function navigatePopupToFile(popup: Window, file: File, page: number): void {
  const objectUrl = URL.createObjectURL(file);
  popup.location.replace(buildPdfPageUrl(objectUrl, page));
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10 * 60 * 1000);
}

export async function openAssociatedPrivatePdf(input: {
  association: StoredPrivatePdfAssociation;
  startPage: number;
}): Promise<void> {
  const popup = openPendingTab();
  try {
    await ensureReadPermission(input.association.handle);
    const file = await input.association.handle.getFile();
    if (!fileNameMatchesExpected(file.name, input.association.expectedFileName)) {
      throw new PrivatePdfAccessError("FILE_MISMATCH", "O arquivo vinculado não corresponde mais ao material indicado.");
    }
    navigatePopupToFile(popup, file, input.startPage);
  } catch (error) {
    popup.close();
    if (error instanceof DOMException && error.name === "NotFoundError") {
      throw new PrivatePdfAccessError("FILE_UNAVAILABLE", "O PDF foi movido, renomeado ou removido. Vincule-o novamente.");
    }
    throw error;
  }
}

export async function choosePdfTemporarilyAndOpen(input: {
  expectedFileName: string;
  startPage: number;
}): Promise<void> {
  const popup = openPendingTab();
  try {
    const file = await new Promise<File>((resolve, reject) => {
      const picker = document.createElement("input");
      picker.type = "file";
      picker.accept = "application/pdf,.pdf";
      picker.style.display = "none";
      picker.addEventListener("change", () => {
        const selected = picker.files?.[0];
        picker.remove();
        if (selected) resolve(selected);
        else reject(new PrivatePdfAccessError("USER_CANCELLED", "Seleção do PDF cancelada."));
      });
      picker.addEventListener("cancel", () => {
        picker.remove();
        reject(new PrivatePdfAccessError("USER_CANCELLED", "Seleção do PDF cancelada."));
      });
      document.body.appendChild(picker);
      picker.click();
    });

    if (!fileNameMatchesExpected(file.name, input.expectedFileName)) {
      throw new PrivatePdfAccessError(
        "FILE_MISMATCH",
        `O arquivo selecionado é '${file.name}', mas o coach indicou '${input.expectedFileName}'.`
      );
    }
    navigatePopupToFile(popup, file, input.startPage);
  } catch (error) {
    popup.close();
    throw classifyPickerError(error);
  }
}
