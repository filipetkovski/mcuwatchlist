// Server-side only. The browser never talks to Supabase directly.
const rawUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// Tolerate a pasted API path like https://<ref>.supabase.co/rest/v1/ by keeping only the origin.
export const SUPABASE_URL = rawUrl ? new URL(rawUrl).origin : "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
