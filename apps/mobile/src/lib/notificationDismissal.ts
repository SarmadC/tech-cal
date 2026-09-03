import type { MobileNotificationItem } from '@kurecal/domain';

export interface PendingNotificationDismissal {
  index: number;
  item: MobileNotificationItem;
}

export function beginNotificationDismissal(
  items: MobileNotificationItem[],
  notificationId: string
): {
  items: MobileNotificationItem[];
  pending: PendingNotificationDismissal | null;
} {
  const index = items.findIndex((item) => item.id === notificationId);
  if (index < 0) return { items, pending: null };

  return {
    items: items.filter((item) => item.id !== notificationId),
    pending: { index, item: items[index]! }
  };
}

export function restoreNotificationDismissal(
  items: MobileNotificationItem[],
  pending: PendingNotificationDismissal
): MobileNotificationItem[] {
  if (items.some((item) => item.id === pending.item.id)) return items;
  const index = Math.min(Math.max(0, pending.index), items.length);
  return [...items.slice(0, index), pending.item, ...items.slice(index)];
}

export function filterPendingNotification(
  items: MobileNotificationItem[],
  pendingId: string | null
): MobileNotificationItem[] {
  return pendingId ? items.filter((item) => item.id !== pendingId) : items;
}
