import { useEffect, useState } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgUri } from 'react-native-svg';
import type { AttendanceCtaState } from './eventDetailUtils';
import { useAppTheme } from '../../providers/ThemeProvider';

const HORIZONTAL_GUTTER = 24;

function isSvgUrl(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith('.svg');
  } catch {
    return url.toLowerCase().includes('.svg');
  }
}

export function EventDetailHeader({
  title,
  imageUrl,
  formatLabel,
  priceLabel,
  isBookmarked,
  isBookmarkPending,
  isAttending,
  isAttended,
  isAttendancePending,
  canOpenEventPage,
  attendanceCta,
  showMenu,
  onBack,
  onToggleBookmark,
  onToggleMenu,
  onMenuClose,
  onToggleAttendance,
  onRemoveAttendance,
  onOpenEventPage,
  onShareEvent,
  onAddToCalendar,
}: {
  title: string;
  imageUrl?: string | null;
  formatLabel?: string | null;
  priceLabel?: string | null;
  isBookmarked: boolean;
  isBookmarkPending: boolean;
  isAttending: boolean;
  isAttended: boolean;
  isAttendancePending: boolean;
  canOpenEventPage: boolean;
  attendanceCta: AttendanceCtaState;
  showMenu: boolean;
  onBack: () => void;
  onToggleBookmark: () => void;
  onToggleMenu: () => void;
  onMenuClose: () => void;
  onToggleAttendance: () => void;
  onRemoveAttendance: () => void;
  onOpenEventPage: () => void;
  onShareEvent: () => void;
  onAddToCalendar: () => void;
}) {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const [imageUri, setImageUri] = useState<string | null>(imageUrl?.trim() || null);
  const hasHeaderImage = Boolean(imageUri);
  const primaryTextColor = hasHeaderImage ? '#F8FAFC' : tokens.colors.textPrimary;
  const secondaryTextColor = hasHeaderImage ? '#E5E7EB' : tokens.colors.textSecondary;
  const iconSurfaceColor = hasHeaderImage ? 'rgba(15, 23, 42, 0.28)' : tokens.colors.surface;
  const pressedSurfaceColor = hasHeaderImage
    ? 'rgba(255, 255, 255, 0.16)'
    : tokens.colors.surfaceStrong;
  const badgeBackgroundColor = hasHeaderImage
    ? 'rgba(15, 23, 42, 0.42)'
    : tokens.colors.surfaceMuted;
  const badgeBorderColor = hasHeaderImage
    ? 'rgba(255, 255, 255, 0.18)'
    : tokens.colors.border;

  useEffect(() => {
    setImageUri(imageUrl?.trim() || null);
  }, [imageUrl]);

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: tokens.colors.shellElevated,
          borderBottomColor: hasHeaderImage
            ? 'rgba(255, 255, 255, 0.12)'
            : tokens.colors.border,
        },
      ]}
    >
      {imageUri ? (
        isSvgUrl(imageUri) ? (
          <SvgUri
            uri={imageUri}
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid slice"
            style={styles.headerImage}
            onError={() => setImageUri(null)}
          />
        ) : (
          <ExpoImage
            source={{ uri: imageUri }}
            style={styles.headerImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={imageUri}
            transition={150}
            onError={() => setImageUri(null)}
          />
        )
      ) : null}

      {hasHeaderImage ? (
        <LinearGradient
          colors={['rgba(5, 7, 10, 0.18)', 'rgba(5, 7, 10, 0.78)']}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      ) : null}

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 10,
          },
        ]}
      >
        <View style={styles.controls}>
          <Pressable
            accessibilityLabel="Back"
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: pressed ? pressedSurfaceColor : 'transparent' },
            ]}
          >
            <FontAwesome name="angle-left" size={20} color={secondaryTextColor} />
          </Pressable>

          <View style={styles.actions}>
            <Pressable
              accessibilityLabel={isBookmarked ? 'Remove saved event' : 'Save event'}
              accessibilityRole="button"
              accessibilityState={{ checked: isBookmarked, disabled: isBookmarkPending }}
              disabled={isBookmarkPending}
              onPress={onToggleBookmark}
              style={({ pressed }) => [
                styles.iconButton,
                styles.iconStateButton,
                {
                  backgroundColor: isBookmarked
                    ? tokens.colors.warning
                    : pressed
                      ? pressedSurfaceColor
                      : iconSurfaceColor,
                  borderColor: isBookmarked ? tokens.colors.warning : 'transparent',
                  opacity: isBookmarkPending ? 0.45 : 1,
                },
              ]}
            >
              <FontAwesome
                name={isBookmarked ? 'bookmark' : 'bookmark-o'}
                size={15}
                color={isBookmarked ? tokens.colors.textInverse : secondaryTextColor}
              />
            </Pressable>

            <Pressable
              accessibilityLabel="More actions"
              accessibilityRole="button"
              onPress={onToggleMenu}
              style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: pressed ? pressedSurfaceColor : 'transparent' },
              ]}
            >
              <FontAwesome name="ellipsis-v" size={16} color={secondaryTextColor} />
            </Pressable>

            {showMenu ? (
              <View
                style={[
                  styles.menu,
                  { backgroundColor: tokens.colors.surface, borderColor: tokens.colors.borderStrong },
                ]}
              >
                <Pressable
                  onPress={() => { onMenuClose(); onShareEvent(); }}
                  style={({ pressed }) => [
                    styles.menuItem,
                    { backgroundColor: pressed ? tokens.colors.surfaceMuted : 'transparent' },
                  ]}
                >
                  <FontAwesome name="share-alt" size={14} color={tokens.colors.textSecondary} />
                  <Text style={[styles.menuLabel, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                    Share event
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => { onMenuClose(); onAddToCalendar(); }}
                  style={({ pressed }) => [
                    styles.menuItem,
                    { backgroundColor: pressed ? tokens.colors.surfaceMuted : 'transparent' },
                  ]}
                >
                  <FontAwesome name="calendar-plus-o" size={14} color={tokens.colors.textSecondary} />
                  <Text style={[styles.menuLabel, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                    Add to calendar
                  </Text>
                </Pressable>

                {canOpenEventPage ? (
                  <Pressable
                    onPress={() => { onMenuClose(); onOpenEventPage(); }}
                    style={({ pressed }) => [
                      styles.menuItem,
                      { backgroundColor: pressed ? tokens.colors.surfaceMuted : 'transparent' },
                    ]}
                  >
                    <FontAwesome name="external-link" size={13} color={tokens.colors.textSecondary} />
                    <Text style={[styles.menuLabel, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                      Visit event page
                    </Text>
                  </Pressable>
                ) : null}

                {isAttended ? (
                  <Pressable
                    disabled={isAttendancePending}
                    onPress={() => { onMenuClose(); onRemoveAttendance(); }}
                    style={({ pressed }) => [
                      styles.menuItem,
                      {
                        backgroundColor: pressed ? tokens.colors.surfaceMuted : 'transparent',
                        opacity: isAttendancePending ? 0.45 : 1,
                      },
                    ]}
                  >
                    <FontAwesome name="times-circle-o" size={14} color={tokens.colors.textSecondary} />
                    <Text style={[styles.menuLabel, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                      Remove attendance
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    disabled={isAttendancePending}
                    onPress={() => { onMenuClose(); onToggleAttendance(); }}
                    style={({ pressed }) => [
                      styles.menuItem,
                      {
                        backgroundColor: pressed ? tokens.colors.surfaceMuted : 'transparent',
                        opacity: isAttendancePending ? 0.45 : 1,
                      },
                    ]}
                  >
                    <FontAwesome name="check-circle-o" size={14} color={tokens.colors.textSecondary} />
                    <Text style={[styles.menuLabel, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                      {isAttending ? 'Remove RSVP' : attendanceCta.label}
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.copy}>
          <Text
            testID="event-detail-title"
            numberOfLines={fontScale >= 1.8 ? 5 : 2}
            style={[styles.title, { color: primaryTextColor, fontFamily: tokens.typography.sans }]}
          >
            {title}
          </Text>

          <View style={styles.metaCluster}>
            {formatLabel ? (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: hasHeaderImage
                      ? badgeBackgroundColor
                      : tokens.colors.accentSoft,
                    borderColor: badgeBorderColor,
                  },
                ]}
              >
                <Text style={[styles.badgeText, { color: hasHeaderImage ? primaryTextColor : tokens.colors.accent, fontFamily: tokens.typography.sans }]}>
                  {formatLabel}
                </Text>
              </View>
            ) : null}
            {priceLabel ? (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: badgeBackgroundColor, borderColor: badgeBorderColor },
                ]}
              >
                <Text style={[styles.badgeText, { color: secondaryTextColor, fontFamily: tokens.typography.sans }]}>
                  {priceLabel}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    position: 'relative',
  },
  headerImage: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    gap: 16,
    paddingBottom: 24,
    paddingHorizontal: HORIZONTAL_GUTTER,
    position: 'relative',
    zIndex: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    position: 'relative',
    flexDirection: 'row',
    gap: 6,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconStateButton: {
    borderWidth: 1,
  },
  menu: {
    position: 'absolute',
    top: 50,
    right: 0,
    width: 188,
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 4,
    zIndex: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  copy: {
    gap: 10,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.18,
  },
  metaCluster: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    borderRadius: 3,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
