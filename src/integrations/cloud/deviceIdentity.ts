const DEVICE_ID_KEY = "CONCURSEIRO_OS_DEVICE_ID";

export function createDeviceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getOrCreateDeviceId(storage?: Storage): string {
  const target = storage ?? (typeof localStorage !== "undefined" ? localStorage : undefined);
  if (!target) return createDeviceId();

  const existing = target.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const created = createDeviceId();
  target.setItem(DEVICE_ID_KEY, created);
  return created;
}
