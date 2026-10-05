import { createClient } from '@supabase/supabase-js';
import { authStorage } from './authStorage';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const createSupabaseClient = () => createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: authStorage },
});

// Fast Refresh should reuse the browser client instead of creating auth timers
// and subscriptions for multiple clients with the same storage key.
const browserCache = globalThis as typeof globalThis & {
  gymProgressionSupabase?: ReturnType<typeof createSupabaseClient>;
};

export const supabase = process.env.NODE_ENV === 'development' && typeof window !== 'undefined'
  ? (browserCache.gymProgressionSupabase ??= createSupabaseClient())
  : createSupabaseClient();
