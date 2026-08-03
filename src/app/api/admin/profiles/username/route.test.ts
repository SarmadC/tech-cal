import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PATCH } from './route';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
  requireAdmin: vi.fn(),
  rpc: vi.fn(),
  validateSameOriginRequest: vi.fn(),
}));

vi.mock('@/utils/supabase/server', () => ({ createClient: () => mocks.createClient() }));
vi.mock('@/utils/supabase/service', () => ({ createServiceClient: (...args: unknown[]) => mocks.createServiceClient(...args) }));
vi.mock('@/lib/adminAuth', () => ({ requireAdmin: (...args: unknown[]) => mocks.requireAdmin(...args) }));
vi.mock('@/lib/requestSecurity', () => ({ validateSameOriginRequest: (...args: unknown[]) => mocks.validateSameOriginRequest(...args) }));

describe('PATCH /api/admin/profiles/username', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    mocks.createClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) } });
    mocks.createServiceClient.mockReturnValue({ rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({ error: null });
    mocks.validateSameOriginRequest.mockReturnValue(null);
  });

  it('requires admin access and records a reason through the override RPC', async () => {
    const response = await PATCH(new Request('http://localhost/api/admin/profiles/username', { method: 'PATCH', body: JSON.stringify({ profileId: '11111111-1111-4111-8111-111111111111', username: 'ada', reason: 'Account recovery' }) }));
    expect(response.status).toBe(200);
    expect(mocks.requireAdmin).toHaveBeenCalledWith('admin-1', expect.anything());
    expect(mocks.rpc).toHaveBeenCalledWith('support_override_username', expect.objectContaining({ p_next_username: 'ada', p_reason: 'Account recovery' }));
  });

  it('rejects reserved usernames before the support override runs', async () => {
    const response = await PATCH(new Request('http://localhost/api/admin/profiles/username', { method: 'PATCH', body: JSON.stringify({ profileId: '11111111-1111-4111-8111-111111111111', username: 'admin', reason: 'Account recovery' }) }));
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
