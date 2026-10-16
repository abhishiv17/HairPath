// Whether this build has a Supabase project. NEXT_PUBLIC_* values are inlined at build time, so this
// is the same on the server and in the browser (safe to branch on during render).
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const cloudConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);
