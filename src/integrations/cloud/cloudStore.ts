import { create } from "zustand";
import { describeAuthError, normalizeAuthEmail } from "./authPolicy";
import type { Session } from "@supabase/supabase-js";
import { useConcurseiroStore } from "../../store";
import type { ItemBiblioteca } from "../../types";
import { getCloudEnvironment } from "./environment";
import { getOrCreateDeviceId } from "./deviceIdentity";
import {
  buildPrivateStoragePath,
  isAllowedPrivateDocument,
  normalizeMaterialFileName
} from "./privateDocumentPolicy";
import {
  createPrivateDocumentSignedUrl,
  deletePrivateDocument,
  getCurrentSession,
  listPrivateDocuments,
  loadCloudSnapshot,
  onAuthStateChange,
  saveCloudSnapshot,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  requestPasswordReset,
  updateAccountPassword,
  uploadPrivateDocument
} from "./cloudRepository";
import {
  detectSyncConflict,
  fingerprintSnapshot,
  readSyncMetadata,
  validateBackupSnapshot,
  writeSyncMetadata
} from "./snapshotPolicy";
import type {
  CloudAuthStatus,
  CloudEnvironmentConfig,
  CloudSyncPhase,
  CloudUserSummary,
  LocalSyncMetadata,
  PrivateCloudDocument,
  SyncConflict
} from "./types";

interface UploadResult {
  uploaded: number;
  rejected: string[];
  failed: Array<{ name: string; error: string }>;
}

interface CloudAccountState {
  environment: CloudEnvironmentConfig;
  authStatus: CloudAuthStatus;
  phase: CloudSyncPhase;
  user: CloudUserSummary | null;
  metadata: LocalSyncMetadata;
  conflict: SyncConflict | null;
  privateDocuments: PrivateCloudDocument[];
  error: string | null;
  notice: string | null;
  initialized: boolean;
  passwordRecoveryActive: boolean;

  initialize: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  completePasswordRecovery: (password: string) => Promise<boolean>;
  syncNow: (force?: boolean) => Promise<boolean>;
  restoreFromCloud: () => Promise<boolean>;
  resolveConflictWithLocal: () => Promise<boolean>;
  resolveConflictWithCloud: () => Promise<boolean>;
  refreshPrivateDocuments: () => Promise<void>;
  uploadPrivateDocuments: (files: File[]) => Promise<UploadResult>;
  openPrivateDocument: (storagePath: string) => Promise<string | null>;
  removePrivateDocument: (storagePath: string) => Promise<boolean>;
  clearNotice: () => void;
}

let unsubscribeAuth: (() => void) | null = null;
let localSaveListenerInstalled = false;
let autoSyncTimer: number | null = null;

function toUserSummary(session: Session | null): CloudUserSummary | null {
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? null
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function findMatchingPrivateItem(items: readonly ItemBiblioteca[], fileName: string): ItemBiblioteca | null {
  const normalized = normalizeMaterialFileName(fileName);
  return (
    items.find(
      (item) =>
        item.privateMaterial &&
        normalizeMaterialFileName(item.privateMaterial.sourceFileName) === normalized
    ) ?? null
  );
}

function scheduleAutoSync(): void {
  if (typeof window === "undefined") return;
  if (autoSyncTimer !== null) window.clearTimeout(autoSyncTimer);
  autoSyncTimer = window.setTimeout(() => {
    const cloud = useCloudAccountStore.getState();
    const app = useConcurseiroStore.getState();
    if (
      cloud.authStatus === "SIGNED_IN" &&
      cloud.phase === "IDLE" &&
      !cloud.conflict &&
      app.configuracao.offlineSyncAtivo
    ) {
      const currentFingerprint = fingerprintSnapshot(app.exportBackup());
      if (currentFingerprint !== cloud.metadata.localFingerprint) {
        void cloud.syncNow(false);
      }
    }
  }, 1200);
}

export const useCloudAccountStore = create<CloudAccountState>((set, get) => {
  const environment = getCloudEnvironment();
  const deviceId = getOrCreateDeviceId();

  return {
    environment,
    authStatus: "UNKNOWN",
    phase: "IDLE",
    user: null,
    metadata: readSyncMetadata(deviceId),
    conflict: null,
    privateDocuments: [],
    error: null,
    notice: null,
    initialized: false,
    passwordRecoveryActive: false,

    initialize: async () => {
      if (get().initialized) return;
      set({ initialized: true, phase: "INITIALIZING", error: null });

      if (environment.availability !== "CONFIGURED") {
        set({ authStatus: "SIGNED_OUT", phase: "IDLE" });
        return;
      }

      try {
        const session = await getCurrentSession();
        set({
          authStatus: session ? "SIGNED_IN" : "SIGNED_OUT",
          user: toUserSummary(session),
          phase: "IDLE"
        });

        unsubscribeAuth?.();
        unsubscribeAuth = onAuthStateChange((event, nextSession) => {
          const recoveryActive =
            event === "PASSWORD_RECOVERY"
              ? true
              : event === "SIGNED_OUT"
                ? false
                : get().passwordRecoveryActive;
          set({
            authStatus: nextSession ? "SIGNED_IN" : "SIGNED_OUT",
            user: toUserSummary(nextSession),
            conflict: null,
            error: null,
            phase: "IDLE",
            passwordRecoveryActive: recoveryActive,
            notice:
              event === "PASSWORD_RECOVERY"
                ? "Link de recuperação validado. Defina uma nova senha para concluir."
                : get().notice
          });
          if (nextSession) {
            void get().refreshPrivateDocuments();
          } else {
            set({ privateDocuments: [] });
          }
        });

        if (!localSaveListenerInstalled && typeof window !== "undefined") {
          window.addEventListener("concurseiroos:local-save", scheduleAutoSync);
          localSaveListenerInstalled = true;
        }

        if (session) {
          await get().refreshPrivateDocuments();
          const remote = await loadCloudSnapshot(session.user.id);
          if (!remote) {
            await get().syncNow(true);
          } else {
            const conflict = detectSyncConflict(remote, get().metadata);
            if (conflict) {
              set({ phase: "CONFLICT", conflict });
            }
          }
        }
      } catch (error) {
        set({ phase: "ERROR", error: errorMessage(error), authStatus: "SIGNED_OUT" });
      }
    },

    signUp: async (email, password) => {
      set({ phase: "AUTHENTICATING", error: null, notice: null });
      try {
        const user = await signUpWithPassword(normalizeAuthEmail(email), password);
        set({
          phase: "IDLE",
          notice: user
            ? "Conta criada. Caso a confirmação de e-mail esteja ativa, confirme a mensagem antes de entrar."
            : "Solicitação de cadastro enviada."
        });
        return true;
      } catch (error) {
        set({ phase: "ERROR", error: describeAuthError(error) });
        return false;
      }
    },

    signIn: async (email, password) => {
      set({ phase: "AUTHENTICATING", error: null, notice: null });
      try {
        const user = await signInWithPassword(normalizeAuthEmail(email), password);
        set({
          authStatus: "SIGNED_IN",
          user: { id: user.id, email: user.email ?? null },
          phase: "IDLE"
        });
        await get().refreshPrivateDocuments();
        const remote = await loadCloudSnapshot(user.id);
        if (!remote) {
          return get().syncNow(true);
        }
        const conflict = detectSyncConflict(remote, get().metadata);
        if (conflict) {
          set({ phase: "CONFLICT", conflict });
          return true;
        }
        return get().syncNow(false);
      } catch (error) {
        set({ phase: "ERROR", error: describeAuthError(error), authStatus: "SIGNED_OUT" });
        return false;
      }
    },

    requestPasswordReset: async (email) => {
      set({ phase: "AUTHENTICATING", error: null, notice: null });
      try {
        const redirectTo = typeof window === "undefined" ? "" : `${window.location.origin}/`;
        await requestPasswordReset(normalizeAuthEmail(email), redirectTo);
        set({
          phase: "IDLE",
          notice: "E-mail de recuperação solicitado. Abra a mensagem no mesmo dispositivo e defina uma nova senha."
        });
        return true;
      } catch (error) {
        set({ phase: "ERROR", error: describeAuthError(error) });
        return false;
      }
    },

    completePasswordRecovery: async (password) => {
      set({ phase: "AUTHENTICATING", error: null, notice: null });
      try {
        const user = await updateAccountPassword(password);
        set({
          phase: "IDLE",
          authStatus: "SIGNED_IN",
          user: { id: user.id, email: user.email ?? null },
          passwordRecoveryActive: false,
          notice: "Senha atualizada. Esta conta permanece conectada neste dispositivo."
        });
        return true;
      } catch (error) {
        set({ phase: "ERROR", error: describeAuthError(error) });
        return false;
      }
    },

    signOut: async () => {
      set({ phase: "AUTHENTICATING", error: null });
      try {
        await signOut();
      } finally {
        set({
          phase: "IDLE",
          authStatus: "SIGNED_OUT",
          user: null,
          conflict: null,
          privateDocuments: [],
          passwordRecoveryActive: false
        });
      }
    },

    syncNow: async (force = false) => {
      const user = get().user;
      if (!user) {
        set({ error: "AUTH_REQUIRED", phase: "ERROR" });
        return false;
      }

      set({ phase: "SYNCING", error: null, notice: null });
      try {
        const remote = await loadCloudSnapshot(user.id);
        const currentMetadata = get().metadata;
        const conflict = force ? null : detectSyncConflict(remote, currentMetadata);
        if (conflict) {
          set({ phase: "CONFLICT", conflict });
          return false;
        }

        const snapshot = useConcurseiroStore.getState().exportBackup();
        const saved = await saveCloudSnapshot({
          userId: user.id,
          snapshot,
          expectedRevision: remote?.revision ?? 0,
          deviceId: currentMetadata.deviceId
        });
        const nextMetadata: LocalSyncMetadata = {
          ...currentMetadata,
          baseRevision: saved.revision,
          remoteUpdatedAt: saved.updated_at,
          lastSuccessfulSyncAt: new Date().toISOString(),
          localFingerprint: fingerprintSnapshot(snapshot)
        };
        writeSyncMetadata(nextMetadata);
        set({
          phase: "IDLE",
          metadata: nextMetadata,
          conflict: null,
          notice: "Dados sincronizados com a nuvem."
        });
        return true;
      } catch (error) {
        const message = errorMessage(error);
        if (message.includes("REVISION_CONFLICT")) {
          try {
            const remote = await loadCloudSnapshot(user.id);
            if (remote) {
              set({
                phase: "CONFLICT",
                conflict: {
                  reason: "REMOTE_NEWER_THAN_LOCAL_BASE",
                  remoteRevision: remote.revision,
                  remoteUpdatedAt: remote.updated_at
                },
                error: null
              });
              return false;
            }
          } catch {
            // Fall through to the original synchronization error.
          }
        }
        set({ phase: "ERROR", error: message });
        return false;
      }
    },

    restoreFromCloud: async () => {
      const user = get().user;
      if (!user) return false;
      set({ phase: "SYNCING", error: null, notice: null });
      try {
        const remote = await loadCloudSnapshot(user.id);
        if (!remote || !validateBackupSnapshot(remote.snapshot)) {
          throw new Error("REMOTE_SNAPSHOT_INVALID_OR_MISSING");
        }
        const imported = useConcurseiroStore.getState().importBackup(remote.snapshot);
        if (!imported.success) throw new Error(imported.error || "IMPORT_FAILED");

        const nextMetadata: LocalSyncMetadata = {
          ...get().metadata,
          baseRevision: remote.revision,
          remoteUpdatedAt: remote.updated_at,
          lastSuccessfulSyncAt: new Date().toISOString(),
          localFingerprint: fingerprintSnapshot(remote.snapshot)
        };
        writeSyncMetadata(nextMetadata);
        set({
          phase: "IDLE",
          metadata: nextMetadata,
          conflict: null,
          notice: "Este dispositivo foi restaurado com os dados da nuvem."
        });
        return true;
      } catch (error) {
        set({ phase: "ERROR", error: errorMessage(error) });
        return false;
      }
    },

    resolveConflictWithLocal: async () => get().syncNow(true),
    resolveConflictWithCloud: async () => get().restoreFromCloud(),

    refreshPrivateDocuments: async () => {
      const user = get().user;
      if (!user) return;
      try {
        const documents = await listPrivateDocuments(user.id);
        set({ privateDocuments: documents });
      } catch (error) {
        set({ error: errorMessage(error) });
      }
    },

    uploadPrivateDocuments: async (files) => {
      const user = get().user;
      if (!user) {
        set({ phase: "ERROR", error: "AUTH_REQUIRED" });
        return { uploaded: 0, rejected: files.map((file) => file.name), failed: [] };
      }

      set({ phase: "UPLOADING", error: null, notice: null });
      const rejected: string[] = [];
      const failed: Array<{ name: string; error: string }> = [];
      let uploaded = 0;

      for (const file of files) {
        if (!isAllowedPrivateDocument(file)) {
          rejected.push(file.name);
          continue;
        }
        const path = buildPrivateStoragePath(user.id, file.name);
        try {
          await uploadPrivateDocument(user.id, path, file);
          uploaded += 1;

          const app = useConcurseiroStore.getState();
          const matching = findMatchingPrivateItem(app.biblioteca, file.name);
          if (matching?.privateMaterial) {
            app.updateBibliotecaItem(matching.id, {
              privateMaterial: {
                ...matching.privateMaterial,
                accessMode: "USER_PRIVATE_CLOUD_COPY",
                storageProvider: "SUPABASE",
                storageBucket: environment.privateBucket,
                storagePath: path,
                storageStatus: "AVAILABLE",
                sourceSizeBytes: file.size,
                sourceMimeType: file.type || "application/pdf",
                uploadedAt: new Date().toISOString()
              },
              linkAcesso: `private-cloud://${path}`
            });
          } else {
            const now = new Date().toISOString();
            app.addBibliotecaItem({
              id: `lib-private-cloud-${Date.now()}-${uploaded}`,
              concursoId: app.configuracao.concursoAlvoId ?? app.activeConcursoId ?? undefined,
              titulo: file.name.replace(/\.pdf$/i, ""),
              descricao: "PDF privado enviado pelo usuário para o cofre individual. Conteúdo não compartilhável.",
              categoria: "BIBLIOGRAFIA",
              linkAcesso: `private-cloud://${path}`,
              isFavorito: false,
              tags: ["material-privado", "cofre-online", "pdf"],
              tipoMaterial: "PDF",
              privateMaterial: {
                catalogMaterialId: `user-upload-${Date.now()}-${uploaded}`,
                accessMode: "USER_PRIVATE_CLOUD_COPY",
                rightsClassification: "PRIVATE_LICENSED_USER_COPY",
                sharingAllowed: false,
                contentExportAllowed: false,
                metadataExportAllowed: true,
                strategicUse: "PEDAGOGICAL_ROUTING_ONLY",
                sourceFileName: file.name,
                sourceGroup: "Envio privado do usuário",
                courseTitle: "Material privado",
                lessonLabel: "Não classificado",
                storageProvider: "SUPABASE",
                storageBucket: environment.privateBucket,
                storagePath: path,
                storageStatus: "AVAILABLE",
                sourceSizeBytes: file.size,
                sourceMimeType: file.type || "application/pdf",
                uploadedAt: now
              },
              createdAt: now,
              updatedAt: now
            });
          }
        } catch (error) {
          failed.push({ name: file.name, error: errorMessage(error) });
        }
      }

      await get().refreshPrivateDocuments();
      set({
        phase: "IDLE",
        notice: `${uploaded} PDF(s) armazenado(s) no cofre privado.`
      });
      if (uploaded > 0) await get().syncNow(false);
      return { uploaded, rejected, failed };
    },

    openPrivateDocument: async (storagePath) => {
      const user = get().user;
      if (!user) return null;
      try {
        return await createPrivateDocumentSignedUrl(user.id, storagePath, 600);
      } catch (error) {
        set({ phase: "ERROR", error: errorMessage(error) });
        return null;
      }
    },

    removePrivateDocument: async (storagePath) => {
      const user = get().user;
      if (!user) return false;
      set({ phase: "UPLOADING", error: null });
      try {
        await deletePrivateDocument(user.id, storagePath);
        const app = useConcurseiroStore.getState();
        const item = app.biblioteca.find(
          (candidate) => candidate.privateMaterial?.storagePath === storagePath
        );
        if (item?.privateMaterial) {
          const cleaned = { ...item.privateMaterial };
          delete cleaned.storagePath;
          delete cleaned.storageBucket;
          delete cleaned.storageProvider;
          delete cleaned.uploadedAt;
          cleaned.storageStatus = "NOT_UPLOADED";
          cleaned.accessMode = "USER_PRIVATE_LOCAL_COPY";
          app.updateBibliotecaItem(item.id, {
            privateMaterial: cleaned,
            linkAcesso: `private-material://${cleaned.catalogMaterialId}`
          });
        }
        await get().refreshPrivateDocuments();
        set({ phase: "IDLE", notice: "Documento removido do cofre privado." });
        await get().syncNow(false);
        return true;
      } catch (error) {
        set({ phase: "ERROR", error: errorMessage(error) });
        return false;
      }
    },

    clearNotice: () => set({ notice: null, error: null })
  };
});
