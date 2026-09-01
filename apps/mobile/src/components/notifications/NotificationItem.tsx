import { Image as ExpoImage } from 'expo-image';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useAppTheme } from '../../providers/ThemeProvider';
import type { MobileNotificationItem } from '@kurecal/domain';

interface NotificationItemProps {
  item: MobileNotificationItem;
  onPress: (item: MobileNotificationItem) => void;
}

function verbFor(item: MobileNotificationItem): string {
  const who = item.actor?.displayName?.trim() || 'Someone';
  if (item.type === 'mention') return `${who} mentioned you`;
  if (item.type === 'comment_reply') return `${who} replied to your comment`;
  return `${who} replied to your post`;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.round((now - then) / 1000));
  if (diffSec < 60) return 'now';
  const min = Math.round(diffSec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d`;
  const wk = Math.round(day / 7);
  if (wk < 5) return `${wk}w`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationItem({ item, onPress }: NotificationItemProps) {
  const { tokens } = useAppTheme();
  const { fontScale } = useWindowDimensions();
  const unread = item.readAt == null;
  const avatar = item.actor?.avatarUrl;
  const initial = (item.actor?.displayName?.trim()?.[0] ?? '?').toUpperCase();
  const preview = item.preview?.trim();
  const previewText =
    preview ||
    (item.postId || item.commentId ? '' : 'Original deleted');
  const sourceMissing = !item.postId && !item.commentId;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={verbFor(item)}
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: unread
            ? tokens.colors.accentSoft
            : 'transparent',
          opacity: pressed ? 0.85 : 1,
          borderBottomColor: tokens.colors.divider,
        },
      ]}
    >
      <View style={styles.avatarWrap}>
        {avatar ? (
          <ExpoImage
            source={{ uri: avatar }}
            style={styles.avatar}
            cachePolicy="memory-disk"
            contentFit="cover"
            recyclingKey={avatar}
            transition={120}
          />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.avatarFallback,
              { backgroundColor: tokens.colors.surfaceStrong },
            ]}
          >
            <Text
              style={{
                color: tokens.colors.textPrimary,
                fontFamily: 'DMSans',
                fontWeight: '600',
              }}
            >
              {initial}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text
          style={[
            styles.verb,
            {
              color: tokens.colors.textPrimary,
              fontWeight: unread ? '700' : '500',
            },
          ]}
          numberOfLines={fontScale >= 1.8 ? 4 : 2}
        >
          {verbFor(item)}
        </Text>
        {previewText ? (
          <Text
            numberOfLines={fontScale >= 1.8 ? 4 : 2}
            style={[
              styles.preview,
              {
                color: sourceMissing
                  ? tokens.colors.textTertiary
                  : tokens.colors.textSecondary,
                fontStyle: sourceMissing ? 'italic' : 'normal',
              },
            ]}
          >
            {previewText}
          </Text>
        ) : null}
      </View>
      <View style={styles.meta}>
        <Text style={[styles.time, { color: tokens.colors.textTertiary }]}>
          {timeAgo(item.createdAt)}
        </Text>
        {unread ? (
          <View
            style={[styles.unreadDot, { backgroundColor: tokens.colors.accent }]}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  avatarWrap: {
    width: 40,
    height: 40,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 4,
  },
  verb: {
    fontFamily: 'DMSans',
    fontSize: 14,
    lineHeight: 18,
  },
  preview: {
    fontFamily: 'DMSans',
    fontSize: 13,
    lineHeight: 17,
  },
  meta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  time: {
    fontFamily: 'DMSans',
    fontSize: 11,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
