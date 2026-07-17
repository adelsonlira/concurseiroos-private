import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../../../supabase/001_online_foundation.sql", import.meta.url), "utf8");

describe("Supabase RLS migration", () => {
  it("mantém snapshots privados por usuário autenticado", () => {
    expect(migration).toContain("alter table public.user_snapshots enable row level security");
    expect(migration).toContain("revoke all on public.user_snapshots from anon");
    expect(migration).toContain("(select auth.uid()) = user_id");
  });

  it("mantém o bucket de materiais privado", () => {
    expect(migration).toMatch(/'private-study-materials'[\s\S]*false/);
    expect(migration).toContain("allowed_mime_types");
    expect(migration).toContain("array['application/pdf']");
  });

  it("limita operações do cofre à pasta do próprio usuário", () => {
    const ownFolderPolicy = "(storage.foldername(name))[1] = (select auth.uid())::text";
    expect(migration.split(ownFolderPolicy)).toHaveLength(6);
    expect(migration).toContain("to authenticated");
  });
});
