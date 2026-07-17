import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getCloudEnvironment } from "./environment";

let client: SupabaseClient | null | undefined;
let clientSignature = "";

export function resetSupabaseClient(): void {
  client = undefined;
  clientSignature = "";
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = getCloudEnvironment();
  const signature = `${config.supabaseUrl ?? ""}|${config.supabaseAnonKey ?? ""}`;
  if (signature !== clientSignature) {
    client = undefined;
    clientSignature = signature;
  }
  if (client !== undefined) return client;
  if (config.availability !== "CONFIGURED" || !config.supabaseUrl || !config.supabaseAnonKey) {
    client = null;
    return client;
  }
  client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  return client;
}
