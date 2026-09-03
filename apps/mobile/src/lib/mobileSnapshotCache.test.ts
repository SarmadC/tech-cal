import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  getAllKeys: vi.fn()
}));

vi.mock('expo-sqlite/kv-store', () => ({ default: mocks }));

import { removeItemsFromMobileSnapshot } from './mobileSnapshotCache';

describe('mobile snapshot item removal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setItem.mockResolvedValue(undefined);
  });

  it('removes only committed ids while preserving snapshot metadata', async () => {
    mocks.getItem.mockResolvedValue(
      JSON.stringify({
        cachedAt: new Date().toISOString(),
        value: {
          items: [{ id: 'one' }, { id: 'two' }],
          nextCursor: 'cursor'
        }
      })
    );

    await removeItemsFromMobileSnapshot(
      'user-id',
      'notifications',
      new Set(['one'])
    );

    expect(mocks.setItem).toHaveBeenCalledTimes(1);
    const stored = JSON.parse(mocks.setItem.mock.calls[0]?.[1] as string);
    expect(stored.value).toEqual({
      items: [{ id: 'two' }],
      nextCursor: 'cursor'
    });
  });
});
