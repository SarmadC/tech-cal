import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import type { MobileDiscoverDateRange } from '@kurecal/domain';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  applyRangeSelection,
  applySingleSelection,
  buildCalendarWeeks,
  formatAccessibilityLabel,
  formatDateLabel,
  formatMonthLabel,
  formatRangeSummary,
  parseLocalDateKey,
  resolveInitialMonthFromDate,
  resolveInitialMonthFromRange,
  shiftMonth,
} from '@/components/calendar/calendarDateUtils';
import { useAppTheme } from '@/providers/ThemeProvider';

type CalendarQuickDatePickerBaseProps = {
  visible: boolean;
  onClose: () => void;
  presentation?: 'modal' | 'inline';
  title?: string;
  clearLabel?: string;
  applyLabel?: string;
};

type CalendarQuickDatePickerRangeProps = CalendarQuickDatePickerBaseProps & {
  mode: 'range';
  value: MobileDiscoverDateRange;
  onApply: (value: MobileDiscoverDateRange) => void;
};

type CalendarQuickDatePickerSingleProps = CalendarQuickDatePickerBaseProps & {
  mode: 'single';
  value: string | null;
  onApply: (value: string | null) => void;
};

export type CalendarQuickDatePickerProps =
  | CalendarQuickDatePickerRangeProps
  | CalendarQuickDatePickerSingleProps;

export function CalendarQuickDatePicker(props: CalendarQuickDatePickerProps) {
  const {
    visible,
    onClose,
    presentation = 'modal',
    title,
    clearLabel = 'Clear',
    applyLabel,
  } = props;
  const { tokens } = useAppTheme();
  const [draftRange, setDraftRange] = useState<MobileDiscoverDateRange>(
    props.mode === 'range' ? props.value : { start: null, end: null }
  );
  const [draftDate, setDraftDate] = useState<string | null>(props.mode === 'single' ? props.value : null);
  const [displayMonth, setDisplayMonth] = useState(() =>
    props.mode === 'range'
      ? resolveInitialMonthFromRange(props.value)
      : resolveInitialMonthFromDate(props.value)
  );
  const weeks = useMemo(() => buildCalendarWeeks(displayMonth), [displayMonth]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (props.mode === 'range') {
      setDraftRange(props.value);
      setDisplayMonth(resolveInitialMonthFromRange(props.value));
      return;
    }

    setDraftDate(props.value);
    setDisplayMonth(resolveInitialMonthFromDate(props.value));
  }, [props.mode, props.value, visible]);

  if (!visible) {
    return null;
  }

  const headerTitle =
    title ??
    (props.mode === 'range' ? 'Select date range' : 'Jump to date');
  const summary =
    props.mode === 'range'
      ? formatRangeSummary(draftRange)
      : draftDate
        ? formatDateLabel(draftDate)
        : 'Any date';

  const content = (
    <>
      <Pressable
        style={[styles.overlay, { backgroundColor: tokens.colors.overlay }]}
        onPress={onClose}
      />
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: tokens.colors.discoverShell,
              borderColor: tokens.colors.discoverToolbarBorderStrong,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text
                style={{
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                  fontSize: 18,
                  fontWeight: '800',
                }}
              >
                {headerTitle}
              </Text>
              <Text
                style={{
                  color: tokens.colors.discoverTextMuted,
                  fontFamily: tokens.typography.sans,
                  fontSize: 13,
                  fontWeight: '500',
                }}
              >
                {summary}
              </Text>
            </View>

            <Pressable
              accessibilityLabel="Close date picker"
              onPress={onClose}
              style={({ pressed }) => [
                styles.iconButton,
                {
                  backgroundColor: tokens.colors.discoverToolbar,
                  borderColor: tokens.colors.discoverToolbarBorder,
                  opacity: pressed ? 0.84 : 1,
                },
              ]}
            >
              <FontAwesome name="close" size={14} color={tokens.colors.discoverTextSoft} />
            </Pressable>
          </View>

          <View style={styles.monthRow}>
            <Pressable
              accessibilityLabel="Previous month"
              onPress={() => setDisplayMonth((current) => shiftMonth(current, -1))}
              style={({ pressed }) => [
                styles.monthButton,
                {
                  backgroundColor: tokens.colors.discoverToolbar,
                  borderColor: tokens.colors.discoverToolbarBorder,
                  opacity: pressed ? 0.84 : 1,
                },
              ]}
            >
              <FontAwesome name="angle-left" size={16} color={tokens.colors.discoverTextSoft} />
            </Pressable>

            <Text
              style={{
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
                fontSize: 15,
                fontWeight: '700',
              }}
            >
              {formatMonthLabel(displayMonth)}
            </Text>

            <Pressable
              accessibilityLabel="Next month"
              onPress={() => setDisplayMonth((current) => shiftMonth(current, 1))}
              style={({ pressed }) => [
                styles.monthButton,
                {
                  backgroundColor: tokens.colors.discoverToolbar,
                  borderColor: tokens.colors.discoverToolbarBorder,
                  opacity: pressed ? 0.84 : 1,
                },
              ]}
            >
              <FontAwesome name="angle-right" size={16} color={tokens.colors.discoverTextSoft} />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <Text
                key={day}
                style={[
                  styles.weekdayText,
                  {
                    color: tokens.colors.textTertiary,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              >
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.calendarWrap}>
            {weeks.map((week, weekIndex) => (
              <View key={`week-${weekIndex}`} style={styles.weekRow}>
                {week.map((day) => {
                  const isSelected =
                    props.mode === 'range'
                      ? day.key === draftRange.start || day.key === draftRange.end
                      : day.key === draftDate;
                  const isInRange =
                    props.mode === 'range' &&
                    Boolean(
                      draftRange.start &&
                        draftRange.end &&
                        day.key > draftRange.start &&
                        day.key < draftRange.end
                    );

                  return (
                    <View key={day.key} style={styles.dayCell}>
                      <Pressable
                        accessibilityLabel={`Choose ${formatAccessibilityLabel(day.date)}`}
                        onPress={() => {
                          if (props.mode === 'range') {
                            setDraftRange((current) => applyRangeSelection(current, day.key));
                            return;
                          }

                          setDraftDate((current) => applySingleSelection(current, day.key));
                        }}
                        style={({ pressed }) => [
                          styles.dayButton,
                          {
                            backgroundColor: isSelected
                              ? tokens.colors.textPrimary
                              : isInRange
                                ? tokens.colors.accentSoft
                                : 'transparent',
                            borderColor: isSelected
                              ? tokens.colors.textPrimary
                              : isInRange
                                ? tokens.colors.accentSoft
                                : 'transparent',
                            opacity: pressed ? 0.88 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: isSelected
                              ? tokens.colors.textInverse
                              : day.inCurrentMonth
                                ? day.isToday
                                  ? tokens.colors.accent
                                  : tokens.colors.textPrimary
                                : tokens.colors.textTertiary,
                            fontFamily: tokens.typography.sans,
                            fontSize: 13,
                            fontWeight: isSelected || day.isToday ? '700' : '500',
                            opacity: day.inCurrentMonth ? 1 : 0.54,
                          }}
                        >
                          {day.date.getDate()}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <Pressable
              onPress={() => {
                if (props.mode === 'range') {
                  setDraftRange({ start: null, end: null });
                  return;
                }

                setDraftDate(null);
              }}
              style={[
                styles.footerButton,
                {
                  backgroundColor: 'transparent',
                  borderColor: tokens.colors.discoverToolbarBorderStrong,
                },
              ]}
            >
              <Text
                style={{
                  color: tokens.colors.discoverTextSoft,
                  fontFamily: tokens.typography.sans,
                  fontSize: 14,
                  fontWeight: '700',
                }}
              >
                {clearLabel}
              </Text>
            </Pressable>

            <Pressable
              onPress={onClose}
              style={[
                styles.footerButton,
                {
                  backgroundColor: 'transparent',
                  borderColor: tokens.colors.discoverToolbarBorderStrong,
                },
              ]}
            >
              <Text
                style={{
                  color: tokens.colors.discoverTextSoft,
                  fontFamily: tokens.typography.sans,
                  fontSize: 14,
                  fontWeight: '700',
                }}
              >
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (props.mode === 'range') {
                  props.onApply(draftRange);
                } else {
                  props.onApply(draftDate);
                }
                onClose();
              }}
              style={[
                styles.footerButton,
                {
                  backgroundColor: tokens.colors.textPrimary,
                  borderColor: tokens.colors.textPrimary,
                },
              ]}
            >
              <Text
                style={{
                  color: tokens.colors.textInverse,
                  fontFamily: tokens.typography.sans,
                  fontSize: 14,
                  fontWeight: '800',
                }}
              >
                {applyLabel ?? (props.mode === 'range' ? 'Apply range' : 'Go to date')}
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </>
  );

  if (presentation === 'inline') {
    return content;
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  monthButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  calendarWrap: {
    gap: 6,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dayCell: {
    flex: 1,
  },
  dayButton: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
