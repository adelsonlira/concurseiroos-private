import { getSupabaseClient } from "./supabaseClient";

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers ?? {});
  const client = getSupabaseClient();

  if (client) {
    const { data } = await client.auth.getSession();
    const accessToken = data.session?.access_token;
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return fetch(input, {
    ...init,
    headers
  });
}
