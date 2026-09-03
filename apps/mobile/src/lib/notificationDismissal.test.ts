import { describe, expect, it } from 'vitest';

import type { MobileNotificationItem } from '@kurecal/domain';
import {
  beginNotificationDismissal,
  filterPendingNotification,
  restoreNotificationDismissal
} from './notificationDismissal';

function notification(
  id: string,
  readAt: string | null = null
): MobileNotificationItem {
  return {
    id,
    type: 'post_reply',
    createdAt: '2026-09-03T12:00:00.000Z',
    readAt,
    actor: null,
    circle: null,
    postId: null,
    commentId: null,
    preview: null
  };
}

describe('notification dismissal state', () => {
  const first = notification('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  const second = notification('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

  it('removes a notification and records its original position', () => {
    const result = beginNotificationDismissal([first, second], first.id);

    expect(result.items).toEqual([second]);
    expect(result.pending).toEqual({ item: first, index: 0 });
  });

  it('restores a notification at its original position without duplicates', () => {
    const pending = { item: first, index: 0 };

    expect(restoreNotificationDismissal([second], pending)).toEqual([
      first,
      second
    ]);
    expect(restoreNotificationDismissal([first, second], pending)).toEqual([
      first,
      second
    ]);
  });

  it('keeps a pending notification out of refreshed results', () => {
    expect(filterPendingNotification([first, second], first.id)).toEqual([
      second
    ]);
    expect(filterPendingNotification([first, second], null)).toEqual([
      first,
      second
    ]);
  });
});
