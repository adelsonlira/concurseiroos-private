import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getCloudEnvironment } from "./environment";

let client: SupabaseClient | null | undefined;

export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;

  const config = getCloudEnvironment();
  if (
    config.availability !== "CONFIGURED" ||
    !config.supabaseUrl ||
    !config.supabaseAnonKey
  ) {
    client = null;
    return client;
  }

  client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  return client;
}
