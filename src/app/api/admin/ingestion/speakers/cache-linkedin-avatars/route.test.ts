import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  isAdminUser: vi.fn(),
  createServiceClient: vi.fn(),
  backfillLinkedInSpeakerAvatars: vi.fn(),
}));

const sessionClient = {
  auth: {
    getUser: (...args: unknown[]) => mocks.authGetUser(...args),
  },
};

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => sessionClient),
}));

vi.mock('@/utils/supabase/service', () => ({
  createServiceClient: (...args: unknown[]) => mocks.createServiceClient(...args),
}));

vi.mock('@/lib/adminAuth', () => ({
  isAdminUser: (...args: unknown[]) => mocks.isAdminUser(...args),
}));

vi.mock('@/services/speakerAvatarCacheService', () => ({
  SpeakerAvatarCacheService: {
    backfillLinkedInSpeakerAvatars: (...args: unknown[]) =>
      mocks.backfillLinkedInSpeakerAvatars(...args),
  },
}));

describe('POST /api/admin/ingestion/speakers/cache-linkedin-avatars', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mocks.createServiceClient.mockReturnValue({ kind: 'service-supabase' });
    mocks.isAdminUser.mockResolvedValue(true);
    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: 'admin-1' } },
      error: null,
    });
    mocks.backfillLinkedInSpeakerAvatars.mockResolvedValue({
      scanned: 12,
      eligible: 4,
      processed: 4,
      cached: 3,
      skipped: 0,
      failed: 1,
      results: [],
    });
  });

  it('returns 401 when no admin session is present', async () => {
    mocks.authGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await POST(
      new Request('http://localhost/api/admin/ingestion/speakers/cache-linkedin-avatars', {
        method: 'POST',
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Unauthorized');
  });

  it('returns 403 for non-admin users', async () => {
    mocks.isAdminUser.mockResolvedValue(false);

    const response = await POST(
      new Request('http://localhost/api/admin/ingestion/speakers/cache-linkedin-avatars', {
        method: 'POST',
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe('Admin access required');
  });

  it('runs the backfill with bounded options and returns the summary', async () => {
    const response = await POST(
      new Request('http://localhost/api/admin/ingestion/speakers/cache-linkedin-avatars', {
        method: 'POST',
        body: JSON.stringify({
          limit: 25,
          scanBatchSize: 50,
          concurrency: 4,
          dryRun: true,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.summary.cached).toBe(3);
    expect(mocks.createServiceClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'service-role-key'
    );
    expect(mocks.backfillLinkedInSpeakerAvatars).toHaveBeenCalledWith({
      supabaseClient: { kind: 'service-supabase' },
      limit: 25,
      scanBatchSize: 50,
      concurrency: 4,
      dryRun: true,
      forceRefresh: false,
    });
  });
});
