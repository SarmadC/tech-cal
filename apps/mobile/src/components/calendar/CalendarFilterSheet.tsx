import { FontAwesome } from "@expo/vector-icons";
import { useEffect, useState, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type {
  MobileCalendarFeed,
  MobileDiscoverCost,
  MobileDiscoverDateRange,
} from "@kurecal/domain";

import { resolveCurrentLocationLabel } from "../../lib/discoverLocationUtils";
import { useAppTheme } from "../../providers/ThemeProvider";
import { CalendarQuickDatePicker } from "./CalendarQuickDatePicker";

export interface CalendarDraftFilters {
  tags: string[];
  location: string;
  dateRange: MobileDiscoverDateRange;
  cost: MobileDiscoverCost;
}

interface CalendarFilterSheetProps {
  visible: boolean;
  value: CalendarDraftFilters;
  tags: MobileCalendarFeed["availableFilters"]["tags"];
  counts: MobileCalendarFeed["counts"];
  resultCount: number | null;
  activeFilterCount: number;
  profileTimezone?: string | null;
  isPreviewLoading?: boolean;
  previewError?: string | null;
  disableApply?: boolean;
  onChange: (value: CalendarDraftFilters) => void;
  onApply: () => void;
  onClose: () => void;
  onReset: () => void;
}

function toggleSelection(values: string[], value: string) {
  if (values.includes(value)) {
    return values.filter((entry) => entry !== value);
  }

  return [...values, value];
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return "";
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateRangeLabel(value: MobileDiscoverDateRange) {
  if (!value.start && !value.end) {
    return "Any date";
  }

  if (value.start && value.end) {
    return `${formatDateLabel(value.start)} - ${formatDateLabel(value.end)}`;
  }

  if (value.start) {
    return `From ${formatDateLabel(value.start)}`;
  }

  return `Until ${formatDateLabel(value.end)}`;
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { tokens } = useAppTheme();

  return (
    <View style={styles.section}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: tokens.colors.discoverTextMuted,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function FilterChoice({
  label,
  count,
  checked,
  onPress,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onPress: () => void;
}) {
  const { tokens } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceRow,
        {
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <View style={styles.choiceCopy}>
        <View
          style={[
            styles.radio,
            {
              backgroundColor: checked
                ? tokens.colors.textPrimary
                : "transparent",
              borderColor: checked
                ? tokens.colors.textPrimary
                : tokens.colors.discoverToolbarBorderStrong,
            },
          ]}
        >
          <View
            style={[
              styles.radioDot,
              {
                backgroundColor: checked
                  ? tokens.colors.textInverse
                  : "transparent",
              },
            ]}
          />
        </View>

        <Text
          style={{
            color: checked
              ? tokens.colors.textPrimary
              : tokens.colors.discoverTextSoft,
            fontFamily: tokens.typography.sans,
            fontSize: 14,
            fontWeight: checked ? "700" : "500",
          }}
        >
          {label}
        </Text>
      </View>

      {typeof count === "number" ? (
        <Text
          style={{
            color: tokens.colors.discoverTextMuted,
            fontFamily: tokens.typography.mono,
            fontSize: 12,
          }}
        >
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function CalendarFilterSheet({
  visible,
  value,
  tags,
  counts,
  resultCount,
  activeFilterCount,
  profileTimezone = null,
  isPreviewLoading = false,
  previewError = null,
  disableApply = false,
  onChange,
  onApply,
  onClose,
  onReset,
}: CalendarFilterSheetProps) {
  const { tokens } = useAppTheme();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const selectedTags = Array.isArray(value?.tags) ? value.tags : [];
  const availableTags = Array.isArray(tags) ? tags : [];
  const costCounts = {
    free: counts?.cost?.free ?? 0,
    paid: counts?.cost?.paid ?? 0,
  };
  const dateRangeLabel = formatDateRangeLabel(value.dateRange);

  useEffect(() => {
    if (!visible) {
      setIsDatePickerOpen(false);
    }
  }, [visible]);

  function update<K extends keyof CalendarDraftFilters>(
    key: K,
    nextValue: CalendarDraftFilters[K],
  ) {
    onChange({
      ...value,
      [key]: nextValue,
    });
  }

  async function handleUseCurrentLocation() {
    setIsDetectingLocation(true);

    try {
      const detectedLocation =
        await resolveCurrentLocationLabel(profileTimezone);
      if (detectedLocation) {
        update("location", detectedLocation);
      }
    } finally {
      setIsDetectingLocation(false);
    }
  }

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <Pressable
          style={[styles.overlay, { backgroundColor: tokens.colors.overlay }]}
          onPress={onClose}
        />
        <SafeAreaView edges={["bottom"]} style={styles.sheetSafeArea}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: tokens.colors.discoverShell,
                borderTopColor: tokens.colors.discoverToolbarBorderStrong,
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderCopy}>
                <Text
                  style={{
                    color: tokens.colors.textPrimary,
                    fontFamily: tokens.typography.sans,
                    fontSize: 20,
                    fontWeight: "800",
                  }}
                >
                  Calendar filters
                </Text>
              </View>

              <Pressable accessibilityLabel="Close filters" onPress={onClose}>
                <Text
                  style={{
                    color: tokens.colors.discoverTextSoft,
                    fontFamily: tokens.typography.sans,
                    fontSize: 14,
                    fontWeight: "700",
                  }}
                >
                  Close
                </Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetContent}
            >
              {activeFilterCount > 0 ? (
                <View style={styles.activeRow}>
                  <Text
                    style={{
                      color: tokens.colors.discoverTextMuted,
                      fontFamily: tokens.typography.sans,
                      fontSize: 12,
                      fontWeight: "500",
                    }}
                  >
                    {activeFilterCount} active
                  </Text>
                  <Pressable onPress={onReset}>
                    <Text
                      style={{
                        color: tokens.colors.discoverTextSoft,
                        fontFamily: tokens.typography.sans,
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      Reset filters
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.group}>
                <Text
                  style={[
                    styles.groupTitle,
                    {
                      color: tokens.colors.textPrimary,
                      fontFamily: tokens.typography.sans,
                    },
                  ]}
                >
                  When and where
                </Text>

                <FilterSection title="Date range">
                  <Pressable
                    accessibilityLabel="Choose date range"
                    onPress={() => setIsDatePickerOpen(true)}
                    style={[
                      styles.dateField,
                      {
                        backgroundColor: tokens.colors.discoverToolbar,
                        borderColor: tokens.colors.discoverToolbarBorderStrong,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color:
                          value.dateRange.start || value.dateRange.end
                            ? tokens.colors.textPrimary
                            : tokens.colors.discoverTextMuted,
                        fontFamily: tokens.typography.sans,
                        fontSize: 15,
                        fontWeight: "500",
                      }}
                    >
                      {dateRangeLabel}
                    </Text>
                    <FontAwesome
                      name="angle-right"
                      size={15}
                      color={tokens.colors.discoverTextMuted}
                    />
                  </Pressable>
                </FilterSection>

                <FilterSection title="Location">
                  <View
                    style={[
                      styles.inputWrap,
                      {
                        backgroundColor: tokens.colors.discoverToolbar,
                        borderColor: tokens.colors.discoverToolbarBorderStrong,
                      },
                    ]}
                  >
                    <TextInput
                      accessibilityLabel="Location filter"
                      autoCapitalize="words"
                      autoCorrect={false}
                      maxLength={100}
                      placeholder={
                        isDetectingLocation
                          ? "Finding nearby events..."
                          : "City or region"
                      }
                      placeholderTextColor={tokens.colors.discoverTextMuted}
                      style={[
                        styles.input,
                        {
                          color: tokens.colors.textPrimary,
                          fontFamily: tokens.typography.sans,
                        },
                      ]}
                      value={value.location}
                      onChangeText={(nextValue) =>
                        update("location", nextValue)
                      }
                    />
                  </View>

                  <Pressable
                    accessibilityLabel="Use current location"
                    disabled={isDetectingLocation}
                    onPress={() => {
                      void handleUseCurrentLocation();
                    }}
                  >
                    <Text
                      style={{
                        color: isDetectingLocation
                          ? tokens.colors.discoverTextMuted
                          : tokens.colors.discoverTextSoft,
                        fontFamily: tokens.typography.sans,
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      {isDetectingLocation
                        ? "Detecting location..."
                        : "Use current location"}
                    </Text>
                  </Pressable>
                </FilterSection>
              </View>

              <View style={styles.group}>
                <Text
                  style={[
                    styles.groupTitle,
                    {
                      color: tokens.colors.textPrimary,
                      fontFamily: tokens.typography.sans,
                    },
                  ]}
                >
                  More filters
                </Text>

                <FilterSection title="Cost">
                  <View
                    style={[
                      styles.listCard,
                      {
                        backgroundColor: tokens.colors.discoverToolbar,
                        borderColor: tokens.colors.discoverToolbarBorder,
                      },
                    ]}
                  >
                    {[
                      { id: "all", label: "Any" },
                      { id: "free", label: "Free", count: costCounts.free },
                      { id: "paid", label: "Paid", count: costCounts.paid },
                    ].map((option, index, options) => (
                      <View key={option.id}>
                        <FilterChoice
                          label={option.label}
                          count={option.count}
                          checked={value.cost === option.id}
                          onPress={() =>
                            update("cost", option.id as MobileDiscoverCost)
                          }
                        />
                        {index < options.length - 1 ? (
                          <View
                            style={[
                              styles.divider,
                              {
                                backgroundColor:
                                  tokens.colors.discoverToolbarBorder,
                              },
                            ]}
                          />
                        ) : null}
                      </View>
                    ))}
                  </View>
                </FilterSection>

                <FilterSection title="Popular tags">
                  <View style={styles.wrapRow}>
                    {availableTags.map((tag) => {
                      const active = selectedTags.includes(tag.value);

                      return (
                        <Pressable
                          key={tag.value}
                          onPress={() =>
                            update(
                              "tags",
                              toggleSelection(selectedTags, tag.value),
                            )
                          }
                          style={[
                            styles.filterPill,
                            {
                              backgroundColor: active
                                ? tokens.colors.discoverToolbarStrong
                                : tokens.colors.discoverToolbar,
                              borderColor: active
                                ? tokens.colors.discoverToolbarBorderStrong
                                : tokens.colors.discoverToolbarBorder,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: active
                                ? tokens.colors.textPrimary
                                : tokens.colors.discoverTextSoft,
                              fontFamily: tokens.typography.sans,
                              fontSize: 13,
                              fontWeight: "600",
                            }}
                          >
                            {tag.label} {tag.count}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </FilterSection>
              </View>
            </ScrollView>

            {previewError ? (
              <View
                style={[
                  styles.previewErrorBanner,
                  {
                    backgroundColor: tokens.colors.discoverToolbar,
                    borderColor: tokens.colors.warning,
                  },
                ]}
              >
                <Text
                  style={{
                    color: tokens.colors.warning,
                    fontFamily: tokens.typography.sans,
                    fontSize: 12,
                    fontWeight: "800",
                    textTransform: "uppercase",
                  }}
                >
                  Preview unavailable
                </Text>
                <Text
                  style={{
                    color: tokens.colors.discoverTextSoft,
                    fontFamily: tokens.typography.sans,
                    fontSize: 13,
                    fontWeight: "500",
                  }}
                >
                  {previewError}
                </Text>
              </View>
            ) : null}

            <View style={styles.footer}>
              <Pressable
                onPress={onReset}
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
                  Reset all
                </Text>
              </Pressable>

              <Pressable
                disabled={disableApply}
                onPress={onApply}
                style={({ pressed }) => [
                  styles.footerButton,
                  {
                    backgroundColor: disableApply
                      ? tokens.colors.discoverToolbarStrong
                      : tokens.colors.textPrimary,
                    borderColor: disableApply
                      ? tokens.colors.discoverToolbarBorderStrong
                      : tokens.colors.textPrimary,
                    opacity: disableApply ? 0.62 : pressed ? 0.88 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: disableApply
                      ? tokens.colors.discoverTextMuted
                      : tokens.colors.textInverse,
                    fontFamily: tokens.typography.sans,
                    fontSize: 14,
                    fontWeight: "800",
                  }}
                >
                  {previewError
                    ? "Preview unavailable"
                    : isPreviewLoading
                      ? "Updating…"
                      : `Show ${resultCount ?? 0}`}
                </Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>

        <CalendarQuickDatePicker
          mode="range"
          visible={isDatePickerOpen}
          presentation="inline"
          value={value.dateRange}
          onApply={(nextRange) => update("dateRange", nextRange)}
          onClose={() => setIsDatePickerOpen(false)}
          title="Select date range"
          applyLabel="Apply range"
          clearLabel="Clear"
        />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetSafeArea: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  sheetHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  sheetContent: {
    gap: 14,
    paddingBottom: 8,
  },
  activeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  group: {
    gap: 10,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.15,
  },
  wrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  listCard: {
    borderRadius: 4,
    borderWidth: 1,
    overflow: "hidden",
  },
  filterPill: {
    minHeight: 28,
    borderRadius: 2,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 42,
  },
  choiceRow: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 10,
  },
  choiceCopy: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  inputWrap: {
    minHeight: 36,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  input: {
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 0,
  },
  dateField: {
    minHeight: 36,
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 10,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  previewErrorBanner: {
    borderRadius: 4,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  footerButton: {
    flex: 1,
    minHeight: 32,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
});
