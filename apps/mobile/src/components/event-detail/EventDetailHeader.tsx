import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AttendanceCtaState } from './eventDetailUtils';
import { useAppTheme } from '../../providers/ThemeProvider';

const HORIZONTAL_GUTTER = 24;

export function EventDetailHeader({
  title,
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

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: tokens.colors.shellElevated,
          borderBottomColor: tokens.colors.border,
          paddingTop: insets.top + 10,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.controls}>
          <Pressable
            accessibilityLabel="Back"
            onPress={onBack}
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: pressed ? tokens.colors.surfaceStrong : 'transparent' },
            ]}
          >
            <FontAwesome name="angle-left" size={20} color={tokens.colors.textSecondary} />
          </Pressable>

          <View style={styles.actions}>
            <Pressable
              accessibilityLabel={isBookmarked ? 'Remove saved event' : 'Save event'}
              disabled={isBookmarkPending}
              onPress={onToggleBookmark}
              style={({ pressed }) => [
                styles.iconButton,
                styles.iconStateButton,
                {
                  backgroundColor: isBookmarked
                    ? tokens.colors.warning
                    : pressed
                      ? tokens.colors.surfaceStrong
                      : tokens.colors.surface,
                  borderColor: isBookmarked ? tokens.colors.warning : 'transparent',
                  opacity: isBookmarkPending ? 0.45 : 1,
                },
              ]}
            >
              <FontAwesome
                name={isBookmarked ? 'bookmark' : 'bookmark-o'}
                size={15}
                color={isBookmarked ? tokens.colors.textInverse : tokens.colors.textSecondary}
              />
            </Pressable>

            <Pressable
              accessibilityLabel="More actions"
              onPress={onToggleMenu}
              style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: pressed ? tokens.colors.surfaceStrong : 'transparent' },
              ]}
            >
              <FontAwesome name="ellipsis-v" size={16} color={tokens.colors.textSecondary} />
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
            numberOfLines={2}
            style={[styles.title, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}
          >
            {title}
          </Text>

          <View style={styles.metaCluster}>
            {formatLabel ? (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: tokens.colors.accentSoft, borderColor: tokens.colors.border },
                ]}
              >
                <Text style={[styles.badgeText, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>
                  {formatLabel}
                </Text>
              </View>
            ) : null}
            {priceLabel ? (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: tokens.colors.surfaceMuted, borderColor: tokens.colors.border },
                ]}
              >
                <Text style={[styles.badgeText, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>
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
    paddingBottom: 24,
    paddingHorizontal: HORIZONTAL_GUTTER,
  },
  headerRow: {
    gap: 16,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 28,
    height: 28,
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
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconStateButton: {
    borderWidth: 1,
  },
  menu: {
    position: 'absolute',
    top: 40,
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
