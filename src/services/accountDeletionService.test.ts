import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getConnectionWithTokens: vi.fn(),
  revokeRetainedAppleAuthorization: vi.fn(),
}));

vi.mock('@/services/appleAuthorizationService', () => ({
  revokeRetainedAppleAuthorization: (...args: unknown[]) =>
    mocks.revokeRetainedAppleAuthorization(...args),
}));

vi.mock('@/services/calendarConnectionService', () => ({
  CalendarConnectionService: {
    getConnectionWithTokens: (...args: unknown[]) =>
      mocks.getConnectionWithTokens(...args),
  },
}));

import { deleteUserAccount } from './accountDeletionService';

function buildClient(
  subscription: unknown = null,
  listResults: unknown[] = [{ data: [], error: null }]
) {
  const list = vi.fn();
  for (const result of listResults) {
    list.mockResolvedValueOnce(result);
  }
  list.mockResolvedValue({ data: [], error: null });
  const remove = vi.fn().mockResolvedValue({ error: null });
  const rpc = vi.fn().mockResolvedValue({ error: null });
  const maybeSingle = vi.fn().mockResolvedValue({ data: subscription, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));

  return {
    client: {
      from: vi.fn(() => ({ select })),
      rpc,
      storage: { from: vi.fn(() => ({ list, remove })) },
    },
    list,
    remove,
    rpc,
  };
}

describe('deleteUserAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    mocks.getConnectionWithTokens.mockResolvedValue(null);
    mocks.revokeRetainedAppleAuthorization.mockResolvedValue(false);
  });

  it('removes storage data before invoking the transactional deletion RPC', async () => {
    const { client, list, rpc } = buildClient();
    await deleteUserAccount(client as never, 'user-1');

    expect(list).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenCalledWith('delete_user_account', {
      p_user_id: 'user-1',
    });
    expect(list.mock.invocationCallOrder[1]).toBeLessThan(
      rpc.mock.invocationCallOrder[0]
    );
  });

  it('requires server-side RevenueCat deletion credentials for RevenueCat users', async () => {
    const { client, rpc } = buildClient({
      billing_provider: 'revenuecat',
      revenuecat_customer_id: 'customer-1',
    });

    await expect(deleteUserAccount(client as never, 'user-1')).rejects.toThrow(
      'RevenueCat account deletion is not configured.'
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it('accepts queued RevenueCat deletion and continues local deletion', async () => {
    vi.stubEnv('REVENUECAT_PROJECT_ID', 'project-1');
    vi.stubEnv('REVENUECAT_V2_SECRET_API_KEY', 'secret-1');
    const fetchMock = vi.fn().mockResolvedValue({ status: 202 });
    vi.stubGlobal('fetch', fetchMock);
    const { client, rpc } = buildClient({
      billing_provider: 'revenuecat',
      revenuecat_customer_id: 'customer-1',
    });

    await deleteUserAccount(client as never, 'user-1');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.revenuecat.com/v2/projects/project-1/customers/customer-1',
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(rpc).toHaveBeenCalledOnce();
  });

  it('re-lists a full page after deleting it and then terminates', async () => {
    const fullPage = Array.from({ length: 100 }, (_, index) => ({
      id: `file-${index}`,
      name: `file-${index}.jpg`,
    }));
    const { client, list, remove, rpc } = buildClient(null, [
      { data: fullPage, error: null },
      { data: [], error: null },
      { data: [], error: null },
    ]);

    await deleteUserAccount(client as never, 'user-1');

    expect(list).toHaveBeenCalledTimes(3);
    expect(remove).toHaveBeenCalledWith(
      fullPage.map((item) => `user-1/${item.name}`)
    );
    expect(rpc).toHaveBeenCalledOnce();
  });

  it('recursively removes files contained in storage folders', async () => {
    const { client, list, remove, rpc } = buildClient(null, [
      { data: [{ id: null, name: 'nested' }], error: null },
      { data: [{ id: 'nested-file', name: 'photo.jpg' }], error: null },
      { data: [], error: null },
    ]);

    await deleteUserAccount(client as never, 'user-1');

    expect(list).toHaveBeenCalledWith('user-1/nested', expect.objectContaining({
      offset: 0,
    }));
    expect(remove).toHaveBeenCalledWith(['user-1/nested/photo.jpg']);
    expect(rpc).toHaveBeenCalledOnce();
  });
});
