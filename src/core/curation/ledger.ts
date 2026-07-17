import type {
  CurationActor,
  CurationEvent,
  CurationLedgerState,
  CurationPayload,
  CurationTargetKind,
} from "./types";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`);
  return `{${entries.join(",")}}`;
}

function fnv1a64(input: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (const char of input) {
    hash ^= BigInt(char.codePointAt(0) ?? 0);
    hash = BigInt.asUintN(64, hash * prime);
  }
  return hash.toString(16).padStart(16, "0");
}

function eventBody(event: Omit<CurationEvent, "eventHash">): string {
  return stableStringify(event);
}

export function computeCurationEventHash(event: Omit<CurationEvent, "eventHash">): string {
  return `fnv1a64:${fnv1a64(eventBody(event))}`;
}

export function appendCurationEvent(params: {
  events: readonly CurationEvent[];
  targetKind: CurationTargetKind;
  targetId: string;
  actor: CurationActor;
  occurredAt: string;
  payload: CurationPayload;
  id?: string;
}): CurationEvent[] {
  if (!params.targetId.trim()) throw new Error("targetId é obrigatório.");
  if (!params.actor.id.trim()) throw new Error("actor.id é obrigatório.");
  if (!params.payload.reason.trim()) throw new Error("A decisão de curadoria exige justificativa.");
  if (params.payload.sourceIds.length === 0) throw new Error("A decisão exige ao menos uma fonte.");
  if (!Number.isFinite(Date.parse(params.occurredAt))) throw new Error("occurredAt deve ser ISO válido.");

  const last = params.events.at(-1) ?? null;
  const withoutHash: Omit<CurationEvent, "eventHash"> = {
    id: params.id ?? `curation-${params.events.length + 1}-${params.targetKind.toLowerCase()}-${params.targetId}`,
    schemaVersion: "1.0.0",
    sequence: params.events.length + 1,
    targetKind: params.targetKind,
    targetId: params.targetId,
    actor: { ...params.actor },
    occurredAt: params.occurredAt,
    previousEventHash: last?.eventHash ?? null,
    payload: {
      ...params.payload,
      sourceIds: [...new Set(params.payload.sourceIds)].sort(),
      patch: params.payload.patch ? structuredClone(params.payload.patch) : undefined,
    },
  };

  return [...params.events, { ...withoutHash, eventHash: computeCurationEventHash(withoutHash) }];
}

export function replayCurationLedger(events: readonly CurationEvent[]): CurationLedgerState {
  const errors: string[] = [];
  const currentByTarget: Record<string, CurationEvent> = {};
  let previousHash: string | null = null;

  events.forEach((event, index) => {
    const expectedSequence = index + 1;
    if (event.sequence !== expectedSequence) errors.push(`Sequência inválida no evento ${event.id}.`);
    if (event.previousEventHash !== previousHash) errors.push(`Encadeamento inválido no evento ${event.id}.`);
    const { eventHash, ...withoutHash } = event;
    const expectedHash = computeCurationEventHash(withoutHash);
    if (eventHash !== expectedHash) errors.push(`Hash inválido no evento ${event.id}.`);
    previousHash = eventHash;
    currentByTarget[`${event.targetKind}:${event.targetId}`] = event;
  });

  return {
    events: events.map((event) => structuredClone(event)),
    currentByTarget,
    integrity: { valid: errors.length === 0, errors },
  };
}
