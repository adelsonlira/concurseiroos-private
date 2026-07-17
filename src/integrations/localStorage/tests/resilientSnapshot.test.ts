import { describe, expect, it } from "vitest";
import { persistSnapshotAtomically, readRecoverableSnapshot } from "../resilientSnapshot";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe("resilient local snapshots", () => {
  it("keeps the previous valid snapshot as recovery", () => {
    const storage = new MemoryStorage();
    persistSnapshotAtomically(storage, "state", JSON.stringify({ version: 1 }));
    persistSnapshotAtomically(storage, "state", JSON.stringify({ version: 2 }));
    expect(JSON.parse(storage.getItem("state_RECOVERY")!)).toEqual({ version: 1 });
  });

  it("falls back to recovery when the primary JSON is corrupted", () => {
    const storage = new MemoryStorage();
    storage.setItem("state", "{broken");
    storage.setItem("state_RECOVERY", JSON.stringify({ safe: true }));
    expect(readRecoverableSnapshot<{ safe: boolean }>(storage, "state")).toMatchObject({
      source: "RECOVERY",
      value: { safe: true }
    });
  });
});
