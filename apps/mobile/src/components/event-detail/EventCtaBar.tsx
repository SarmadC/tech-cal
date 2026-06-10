import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AttendanceCtaState } from './eventDetailUtils';
import { KureButton } from '../chrome/KureButton';
import { useAppTheme } from '../../providers/ThemeProvider';

const HORIZONTAL_GUTTER = 24;
const CTA_HEIGHT = 46;

export function EventCtaBar({
  primaryLabel,
  attendanceCta,
  isAttendancePending,
  onPrimaryAction,
  onToggleAttendance,
}: {
  primaryLabel: string;
  attendanceCta: AttendanceCtaState;
  isAttendancePending: boolean;
  onPrimaryAction: () => void;
  onToggleAttendance: () => void;
}) {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: tokens.colors.shellElevated,
          borderTopColor: tokens.colors.border,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <KureButton onPress={onPrimaryAction} style={styles.primaryButton}>
            {primaryLabel}
          </KureButton>
        </View>
        <Pressable
          accessibilityLabel={attendanceCta.accessibilityLabel}
          disabled={isAttendancePending}
          onPress={onToggleAttendance}
          style={({ pressed }) => [
            styles.attendanceButton,
            {
              backgroundColor: attendanceCta.active
                ? tokens.colors.accentSoft
                : pressed
                  ? tokens.colors.surfaceMuted
                  : tokens.colors.surface,
              borderColor: attendanceCta.active
                ? tokens.colors.accent
                : tokens.colors.borderStrong,
              opacity: isAttendancePending ? 0.45 : 1,
            },
          ]}
        >
          <FontAwesome
            name={attendanceCta.icon}
            size={13}
            color={attendanceCta.active ? tokens.colors.accent : tokens.colors.textSecondary}
          />
          <Text
            style={[
              styles.attendanceLabel,
              {
                color: attendanceCta.active ? tokens.colors.accent : tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {attendanceCta.label}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    paddingHorizontal: HORIZONTAL_GUTTER,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },
  primaryButton: {
    minHeight: CTA_HEIGHT,
    height: CTA_HEIGHT,
  },
  attendanceButton: {
    minWidth: 118,
    minHeight: CTA_HEIGHT,
    height: CTA_HEIGHT,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  attendanceLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
