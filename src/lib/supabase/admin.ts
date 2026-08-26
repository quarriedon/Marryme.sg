import { createClient as createRawClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses row-level security.
 * Server-only: never import this from a Client Component, and never
 * expose SUPABASE_SERVICE_ROLE_KEY to the browser. Used by the
 * matching engine, which needs to read across every user's rows to
 * build batches and detect mutual interest.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createRawClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
