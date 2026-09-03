import { FontAwesome } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../hooks/useAnimation';
import { haptics } from '../../lib/haptics';
import { useAppTheme } from '../../providers/ThemeProvider';
import type { MobileNotificationItem } from '@kurecal/domain';

interface NotificationItemProps {
  anotherRowOpen: boolean;
  item: MobileNotificationItem;
  onDelete: (item: MobileNotificationItem) => void;
  onPress: (item: MobileNotificationItem) => void;
  onSwipeStateChange: (id: string, open: boolean) => void;
}

const ACTION_WIDTH = 80;
const OPEN_THRESHOLD = 40;
const DISMISS_POSITION_RATIO = 0.45;
const DISMISS_VELOCITY = -800;
const SPRING = { damping: 26, stiffness: 200 } as const;

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

export function NotificationItem({
  anotherRowOpen,
  item,
  onDelete,
  onPress,
  onSwipeStateChange,
}: NotificationItemProps) {
  const { tokens } = useAppTheme();
  const { fontScale, width: screenWidth } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const translateX = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const rawDragX = useSharedValue(0);
  const rowHeight = useSharedValue(0);
  const rowWidth = useSharedValue(screenWidth);
  const deleting = useSharedValue(false);
  const suppressPressRef = useRef(false);
  const pressReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unread = item.readAt == null;
  const avatar = item.actor?.avatarUrl;
  const initial = (item.actor?.displayName?.trim()?.[0] ?? '?').toUpperCase();
  const preview = item.preview?.trim();
  const previewText =
    preview ||
    (item.postId || item.commentId ? '' : 'Original deleted');
  const sourceMissing = !item.postId && !item.commentId;

  const suppressRowPress = useCallback(() => {
    suppressPressRef.current = true;
    if (pressReleaseTimerRef.current) {
      clearTimeout(pressReleaseTimerRef.current);
      pressReleaseTimerRef.current = null;
    }
  }, []);

  const releaseRowPress = useCallback(() => {
    if (pressReleaseTimerRef.current) clearTimeout(pressReleaseTimerRef.current);
    pressReleaseTimerRef.current = setTimeout(() => {
      suppressPressRef.current = false;
      pressReleaseTimerRef.current = null;
    }, 250);
  }, []);

  useEffect(() => {
    return () => {
      if (pressReleaseTimerRef.current) clearTimeout(pressReleaseTimerRef.current);
    };
  }, []);

  const finishDelete = useCallback(() => {
    haptics.warning();
    onSwipeStateChange(item.id, false);
    onDelete(item);
  }, [item, onDelete, onSwipeStateChange]);

  const commitDelete = useCallback(() => {
    if (deleting.value) return;
    deleting.value = true;
    if (reduceMotion) {
      finishDelete();
      return;
    }

    translateX.value = withSpring(
      -Math.max(rowWidth.value, screenWidth),
      SPRING,
      (finished) => {
        if (!finished) return;
        rowHeight.value = withTiming(0, { duration: 150 }, (collapsed) => {
          if (collapsed) runOnJS(finishDelete)();
        });
      },
    );
  }, [
    deleting,
    finishDelete,
    reduceMotion,
    rowHeight,
    rowWidth,
    screenWidth,
    translateX,
  ]);

  useEffect(() => {
    if (!anotherRowOpen || deleting.value) return;
    translateX.value = reduceMotion ? 0 : withSpring(0, SPRING);
  }, [anotherRowOpen, deleting, reduceMotion, translateX]);

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-8, 8])
    .onBegin(() => {
      dragStartX.value = translateX.value;
      rawDragX.value = translateX.value;
    })
    .onStart(() => {
      runOnJS(suppressRowPress)();
    })
    .onUpdate((event) => {
      const raw = dragStartX.value + event.translationX;
      rawDragX.value = raw;
      if (raw > 0) {
        translateX.value = raw * 0.3;
      } else if (raw < -ACTION_WIDTH) {
        translateX.value = -ACTION_WIDTH + (raw + ACTION_WIDTH) * 0.3;
      } else {
        translateX.value = raw;
      }
    })
    .onEnd((event) => {
      const shouldDelete =
        event.velocityX <= DISMISS_VELOCITY ||
        rawDragX.value <= -rowWidth.value * DISMISS_POSITION_RATIO;
      if (shouldDelete) {
        runOnJS(commitDelete)();
        return;
      }

      const shouldOpen = rawDragX.value <= -OPEN_THRESHOLD;
      translateX.value = withSpring(shouldOpen ? -ACTION_WIDTH : 0, SPRING);
      runOnJS(onSwipeStateChange)(item.id, shouldOpen);
    })
    .onFinalize(() => {
      runOnJS(releaseRowPress)();
    });

  const rowStyle = useAnimatedStyle(() => ({
    height: rowHeight.value > 0 ? rowHeight.value : undefined,
    opacity: rowHeight.value === 0 && deleting.value ? 0 : 1,
  }));
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View
      onLayout={(event) => {
        if (rowHeight.value === 0 && !deleting.value) {
          rowHeight.value = event.nativeEvent.layout.height;
        }
        rowWidth.value = event.nativeEvent.layout.width;
      }}
      style={[styles.swipeContainer, rowStyle]}
    >
      <View
        style={[
          styles.deleteBackground,
          { backgroundColor: tokens.colors.danger },
        ]}
      >
        <Pressable
          accessibilityLabel="Delete notification"
          accessibilityRole="button"
          hitSlop={8}
          onPress={commitDelete}
          style={({ pressed }) => [
            styles.deleteAction,
            { opacity: pressed ? 0.78 : 1 },
          ]}
        >
          <FontAwesome
            name="trash-o"
            size={16}
            color={tokens.colors.textInverse}
          />
          <Text
            style={[styles.deleteLabel, { color: tokens.colors.textInverse }]}
          >
            Delete
          </Text>
        </Pressable>
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={contentStyle}>
          <Pressable
            accessibilityActions={[
              { name: 'delete', label: 'Delete notification' },
            ]}
            accessibilityLabel={verbFor(item)}
            accessibilityRole="button"
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === 'delete') commitDelete();
            }}
            onPress={() => {
              if (!suppressPressRef.current && !deleting.value) onPress(item);
            }}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: unread
                  ? tokens.colors.accentSoft
                  : tokens.colors.shell,
                borderBottomColor: tokens.colors.divider,
                opacity: pressed ? 0.85 : 1,
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
              <Text
                style={[styles.time, { color: tokens.colors.textTertiary }]}
              >
                {timeAgo(item.createdAt)}
              </Text>
              {unread ? (
                <View
                  style={[
                    styles.unreadDot,
                    { backgroundColor: tokens.colors.accent },
                  ]}
                />
              ) : null}
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    overflow: 'hidden',
  },
  deleteBackground: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  deleteAction: {
    width: ACTION_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteLabel: {
    fontFamily: 'DMSans',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
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
