import type { SupabaseClientType } from '@/types';
import { sendPushToUser } from '@/services/pushNotificationService';

type NotificationType = 'post_reply' | 'comment_reply' | 'mention';

interface NotificationRow {
  id: string;
  recipient_id: string;
  type: NotificationType;
  post_id: string | null;
  comment_id: string | null;
  circle_id: string | null;
  circle_slug: string | null;
  actor_display_name: string | null;
  entity_preview: string | null;
}

const PUSH_TYPE_FOR_NOTIFICATION = {
  post_reply: 'community_post_reply',
  comment_reply: 'community_comment_reply',
  mention: 'community_mention',
} as const;

function titleFor(type: NotificationType): string {
  if (type === 'mention') return 'You were mentioned';
  if (type === 'comment_reply') return 'New reply';
  return 'New reply';
}

function bodyFor(row: NotificationRow): string {
  const who = row.actor_display_name?.trim() || 'Someone';
  if (row.type === 'mention') return `${who} mentioned you`;
  if (row.type === 'comment_reply') return `${who} replied to your comment`;
  return `${who} replied to your post`;
}

export class NotificationService {
  /**
   * Best-effort push dispatch after a notifications row has been written by
   * the RPC. Callers should invoke this with `void` so a push failure does
   * not propagate into the user-facing mutation.
   */
  static async dispatchPushForNotification(
    notificationId: string,
    supabase: SupabaseClientType
  ): Promise<void> {
    const { data, error } = await supabase
      .from('notifications')
      .select(
        'id, recipient_id, type, post_id, comment_id, circle_id, circle_slug, actor_display_name, entity_preview'
      )
      .eq('id', notificationId)
      .maybeSingle();

    if (error || !data) {
      if (error) {
        console.warn('[notifications] failed to load row for push', error);
      }
      return;
    }

    const row = data;
    await sendPushToUser(row.recipient_id, {
      title: titleFor(row.type),
      body: bodyFor(row),
      data: {
        type: PUSH_TYPE_FOR_NOTIFICATION[row.type],
        notificationId: row.id,
        slug: row.circle_slug,
        postId: row.post_id,
        commentId: row.comment_id,
      },
    });
  }
}
