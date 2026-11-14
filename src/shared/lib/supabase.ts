// Lazy singleton factory returning a Supabase client or null when unconfigured
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@shared/config/env';

let cachedClient: SupabaseClient | null = null;

export function createSupabaseClient(): SupabaseClient | null {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient(env.supabaseUrl, env.supabaseAnonKey);
  }

  return cachedClient;
}
