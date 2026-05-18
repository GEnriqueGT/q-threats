import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient | null {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  // Vercel + integración Supabase suele exponer SUPABASE_SECRET_KEY (service role)
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
