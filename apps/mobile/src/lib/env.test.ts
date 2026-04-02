import { afterEach, describe, expect, it } from 'vitest';

import {
  getMobileApiBaseUrl,
  getMobileRuntimeMetadata,
  getRequiredMobileEnv,
  getSupabaseRuntimeConfig,
} from './env';

const ORIGINAL_ENV = { ...process.env };

describe('mobile env helpers', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('normalizes the mobile API base URL', () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.kurecal.test/';

    expect(getMobileApiBaseUrl()).toBe('https://api.kurecal.test');
  });

  it('throws when a required env var is missing', () => {
    delete process.env.EXPO_PUBLIC_API_URL;

    expect(() => getRequiredMobileEnv('EXPO_PUBLIC_API_URL')).toThrow(
      'EXPO_PUBLIC_API_URL is missing from the mobile environment.'
    );
  });

  it('returns the current Supabase runtime config', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://supabase.example.test';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    expect(getSupabaseRuntimeConfig()).toEqual({
      anonKey: 'anon-key',
      url: 'https://supabase.example.test',
    });
  });

  it('reads runtime metadata from the committed Expo app config', () => {
    expect(getMobileRuntimeMetadata()).toEqual({
      appName: 'KureCal Dev',
      easProjectId: '788fd018-fbcd-4809-9760-9fed5af7d221',
      slug: 'kurecal-mobile',
    });
  });
});
