// Runtime environment validation via Zod with Phase 1 silent Supabase fallback
import { z } from 'zod';

const DEFAULT_SEED_COLOR = '#7B5E3B';

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected 6-digit hex color');
const urlSchema = z.url();

export interface AppEnv {
  readonly supabaseUrl: string | undefined;
  readonly supabaseAnonKey: string | undefined;
  readonly seedColor: string;
}

function loadEnv(): AppEnv {
  const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
  const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
  const rawSeed = import.meta.env.VITE_TANEPACK_SEED_COLOR?.trim() ?? '';

  let supabaseUrl: string | undefined;
  let supabaseAnonKey: string | undefined;

  const hasUrl = rawUrl.length > 0;
  const hasKey = rawKey.length > 0;

  if (hasUrl !== hasKey) {
    console.warn('Supabase config is partial; ignoring.');
  } else if (hasUrl && hasKey) {
    const parsedUrl = urlSchema.safeParse(rawUrl);
    if (parsedUrl.success) {
      supabaseUrl = parsedUrl.data;
      supabaseAnonKey = rawKey;
    } else {
      console.warn('Supabase URL is invalid; ignoring.');
    }
  }

  const parsedSeed = hexColorSchema.safeParse(rawSeed);
  const seedColor = parsedSeed.success ? parsedSeed.data : DEFAULT_SEED_COLOR;

  return {
    supabaseUrl,
    supabaseAnonKey,
    seedColor,
  };
}

export const env: AppEnv = loadEnv();
