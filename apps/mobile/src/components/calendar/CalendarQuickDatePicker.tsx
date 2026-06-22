import { FontAwesome } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type {
  LocalCalendarDateKey,
  MobileDiscoverDateRange,
} from "@kurecal/domain";

import { useAppTheme } from "../../providers/ThemeProvider";
import {
  applyRangeSelection,
  applySingleSelection,
  buildCalendarWeeks,
  formatAccessibilityLabel,
  formatDateLabel,
  formatMonthLabel,
  formatRangeSummary,
  resolveInitialMonthFromDate,
  resolveInitialMonthFromRange,
  shiftMonth,
} from "../../lib/calendarDateUtils";

type CalendarQuickDatePickerBaseProps = {
  applyLabel?: string;
  clearLabel?: string;
  onClose: () => void;
  presentation?: "modal" | "inline";
  title?: string;
  visible: boolean;
};

type CalendarQuickDatePickerRangeProps = CalendarQuickDatePickerBaseProps & {
  mode: "range";
  onApply: (value: MobileDiscoverDateRange) => void;
  value: MobileDiscoverDateRange;
};

type CalendarQuickDatePickerSingleProps = CalendarQuickDatePickerBaseProps & {
  mode: "single";
  onApply: (value: LocalCalendarDateKey | null) => void;
  value: LocalCalendarDateKey | null;
};

export type CalendarQuickDatePickerProps =
  | CalendarQuickDatePickerRangeProps
  | CalendarQuickDatePickerSingleProps;

export function CalendarQuickDatePicker(props: CalendarQuickDatePickerProps) {
  const {
    applyLabel,
    clearLabel = "Clear",
    onClose,
    presentation = "modal",
    title,
    visible,
  } = props;
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [draftRange, setDraftRange] = useState<MobileDiscoverDateRange>(
    props.mode === "range" ? props.value : { start: null, end: null },
  );
  const [draftDate, setDraftDate] = useState<LocalCalendarDateKey | null>(
    props.mode === "single" ? props.value : null,
  );
  const [displayMonth, setDisplayMonth] = useState(() =>
    props.mode === "range"
      ? resolveInitialMonthFromRange(props.value)
      : resolveInitialMonthFromDate(props.value),
  );
  const rangeStart = props.mode === "range" ? props.value.start : null;
  const rangeEnd = props.mode === "range" ? props.value.end : null;
  const singleValue = props.mode === "single" ? props.value : null;
  const weeks = useMemo(() => buildCalendarWeeks(displayMonth), [displayMonth]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (props.mode === "range") {
      const nextRange = {
        start: props.value.start,
        end: props.value.end,
      };

      setDraftRange(nextRange);
      setDisplayMonth(resolveInitialMonthFromRange(nextRange));
      return;
    }

    setDraftDate(props.value);
    setDisplayMonth(resolveInitialMonthFromDate(props.value));
  }, [props.mode, rangeEnd, rangeStart, singleValue, visible]);

  if (!visible) {
    return null;
  }

  const headerTitle =
    title ?? (props.mode === "range" ? "Select date range" : "Jump to date");
  const summary =
    props.mode === "range"
      ? formatRangeSummary(draftRange)
      : draftDate
        ? formatDateLabel(draftDate)
        : "Any date";

  const content = (
    <>
      <Pressable
        style={[styles.overlay, { backgroundColor: tokens.colors.overlay }]}
        onPress={onClose}
      />
      <View style={[styles.safeArea, { paddingBottom: insets.bottom }]}>
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
                  fontWeight: "800",
                }}
              >
                {headerTitle}
              </Text>
              <Text
                style={{
                  color: tokens.colors.discoverTextMuted,
                  fontFamily: tokens.typography.sans,
                  fontSize: 13,
                  fontWeight: "500",
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
              <FontAwesome
                color={tokens.colors.discoverTextSoft}
                name="close"
                size={14}
              />
            </Pressable>
          </View>

          <View style={styles.monthRow}>
            <Pressable
              accessibilityLabel="Previous month"
              onPress={() =>
                setDisplayMonth((current) => shiftMonth(current, -1))
              }
              style={({ pressed }) => [
                styles.monthButton,
                {
                  backgroundColor: tokens.colors.discoverToolbar,
                  borderColor: tokens.colors.discoverToolbarBorder,
                  opacity: pressed ? 0.84 : 1,
                },
              ]}
            >
              <FontAwesome
                color={tokens.colors.discoverTextSoft}
                name="angle-left"
                size={16}
              />
            </Pressable>

            <Text
              style={{
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
                fontSize: 15,
                fontWeight: "700",
              }}
            >
              {formatMonthLabel(displayMonth)}
            </Text>

            <Pressable
              accessibilityLabel="Next month"
              onPress={() =>
                setDisplayMonth((current) => shiftMonth(current, 1))
              }
              style={({ pressed }) => [
                styles.monthButton,
                {
                  backgroundColor: tokens.colors.discoverToolbar,
                  borderColor: tokens.colors.discoverToolbarBorder,
                  opacity: pressed ? 0.84 : 1,
                },
              ]}
            >
              <FontAwesome
                color={tokens.colors.discoverTextSoft}
                name="angle-right"
                size={16}
              />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
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
                    props.mode === "range"
                      ? day.key === draftRange.start ||
                        day.key === draftRange.end
                      : day.key === draftDate;
                  const isInRange =
                    props.mode === "range" &&
                    Boolean(
                      draftRange.start &&
                        draftRange.end &&
                        day.key > draftRange.start &&
                        day.key < draftRange.end,
                    );

                  return (
                    <View key={day.key} style={styles.dayCell}>
                      <Pressable
                        accessibilityLabel={`Choose ${formatAccessibilityLabel(day.date)}`}
                        onPress={() => {
                          if (props.mode === "range") {
                            setDraftRange((current) =>
                              applyRangeSelection(current, day.key),
                            );
                            return;
                          }

                          setDraftDate((current) =>
                            applySingleSelection(current, day.key),
                          );
                        }}
                        style={({ pressed }) => [
                          styles.dayButton,
                          {
                            backgroundColor: isSelected
                              ? tokens.colors.textPrimary
                              : isInRange
                                ? tokens.colors.accentSoft
                                : "transparent",
                            borderColor: isSelected
                              ? tokens.colors.textPrimary
                              : isInRange
                                ? tokens.colors.accentSoft
                                : "transparent",
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
                            fontWeight:
                              isSelected || day.isToday ? "700" : "500",
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
                if (props.mode === "range") {
                  setDraftRange({ start: null, end: null });
                  return;
                }

                setDraftDate(null);
              }}
              style={[
                styles.footerButton,
                {
                  backgroundColor: "transparent",
                  borderColor: tokens.colors.discoverToolbarBorderStrong,
                },
              ]}
            >
              <Text
                style={{
                  color: tokens.colors.discoverTextSoft,
                  fontFamily: tokens.typography.sans,
                  fontSize: 14,
                  fontWeight: "700",
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
                  backgroundColor: "transparent",
                  borderColor: tokens.colors.discoverToolbarBorderStrong,
                },
              ]}
            >
              <Text
                style={{
                  color: tokens.colors.discoverTextSoft,
                  fontFamily: tokens.typography.sans,
                  fontSize: 14,
                  fontWeight: "700",
                }}
              >
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (props.mode === "range") {
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
                  fontWeight: "800",
                }}
              >
                {applyLabel ??
                  (props.mode === "range" ? "Apply range" : "Apply date")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );

  if (presentation === "inline") {
    return content;
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  calendarWrap: {
    gap: 6,
  },
  dayButton: {
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
  },
  dayCell: {
    flex: 1,
    paddingHorizontal: 2,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
  },
  footerButton: {
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 32,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  iconButton: {
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  monthButton: {
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  monthRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderTopWidth: 1,
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  weekDayText: {
    fontSize: 12,
  },
  weekRow: {
    flexDirection: "row",
  },
  weekdayRow: {
    flexDirection: "row",
  },
  weekdayText: {
    flex: 1,
    fontSize: 12,
    textAlign: "center",
  },
});
