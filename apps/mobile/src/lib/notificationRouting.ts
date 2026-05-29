// Shared deep-link resolver used by both push-tap handling (_layout.tsx)
// and in-app notification list taps.

export function routeForNotificationData(
  data: Record<string, unknown> | undefined | null
): string | null {
  if (!data || typeof data !== 'object') return null;
  const type = typeof data.type === 'string' ? data.type : null;
  if (!type) return null;

  if (type === 'thread_reply') {
    const eventId = typeof data.eventId === 'string' ? data.eventId : null;
    if (eventId) return `/event/${encodeURIComponent(eventId)}`;
  }

  if (
    type === 'community_post_reply' ||
    type === 'community_comment_reply' ||
    type === 'community_mention'
  ) {
    const slug = typeof data.slug === 'string' ? data.slug : null;
    const postId = typeof data.postId === 'string' ? data.postId : null;
    if (slug && postId) {
      return `/community/${encodeURIComponent(slug)}/post/${encodeURIComponent(postId)}`;
    }
    if (slug) {
      return `/community/${encodeURIComponent(slug)}`;
    }
  }

  return null;
}

// Build the same push-payload shape from a notifications row so the inbox
// row tap can reuse `routeForNotificationData`.
export function pushPayloadForNotification(item: {
  type: 'post_reply' | 'comment_reply' | 'mention';
  postId: string | null;
  commentId: string | null;
  circle: { slug: string | null } | null;
}): Record<string, unknown> {
  const pushType =
    item.type === 'post_reply'
      ? 'community_post_reply'
      : item.type === 'comment_reply'
        ? 'community_comment_reply'
        : 'community_mention';
  return {
    type: pushType,
    slug: item.circle?.slug ?? null,
    postId: item.postId,
    commentId: item.commentId,
  };
}
