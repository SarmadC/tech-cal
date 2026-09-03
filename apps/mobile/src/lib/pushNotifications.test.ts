import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPresentedNotificationsAsync: vi.fn(),
  dismissNotificationAsync: vi.fn()
}));

vi.mock('./mobileApi', () => ({
  registerPushToken: vi.fn(),
  unregisterPushToken: vi.fn()
}));
vi.mock('./sessionStorage', () => ({
  sessionStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn()
  }
}));

import { dismissPresentedNotificationByInboxIdWithModule } from './pushNotifications';

const notificationsModule = {
  getPresentedNotificationsAsync: (...args: unknown[]) =>
    mocks.getPresentedNotificationsAsync(...args),
  dismissNotificationAsync: (...args: unknown[]) =>
    mocks.dismissNotificationAsync(...args)
};

describe('presented notification dismissal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.dismissNotificationAsync.mockResolvedValue(undefined);
  });

  it('dismisses only Notification Center entries matching the inbox id', async () => {
    mocks.getPresentedNotificationsAsync.mockResolvedValue([
      {
        request: {
          identifier: 'native-match',
          content: { data: { notificationId: 'inbox-one' } }
        }
      },
      {
        request: {
          identifier: 'native-other',
          content: { data: { notificationId: 'inbox-two' } }
        }
      }
    ]);

    await dismissPresentedNotificationByInboxIdWithModule(
      notificationsModule,
      'inbox-one'
    );

    expect(mocks.dismissNotificationAsync).toHaveBeenCalledTimes(1);
    expect(mocks.dismissNotificationAsync).toHaveBeenCalledWith('native-match');
  });

  it('keeps native cleanup best-effort', async () => {
    mocks.getPresentedNotificationsAsync.mockRejectedValue(
      new Error('unavailable')
    );
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(
      dismissPresentedNotificationByInboxIdWithModule(
        notificationsModule,
        'inbox-one'
      )
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      '[push] Failed to dismiss a presented notification.',
      expect.any(Error)
    );
  });
});
