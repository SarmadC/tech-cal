import { FontAwesome } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import Animated from "react-native-reanimated";
import { useState, type ReactNode } from "react";
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

import type { MobileDiscoverCost, MobileDiscoverFeed } from "@kurecal/domain";

import {
  buildDiscoverDateRangeLabel,
  toggleDiscoverSelection,
  type DiscoverDraftFilters as DiscoverDraftFiltersValue,
} from "../../lib/discoverState";
import { resolveCurrentLocationLabel } from "../../lib/discoverLocationUtils";
import { haptics } from "../../lib/haptics";
import { useAppTheme } from "../../providers/ThemeProvider";
import { useScalePress } from "../../hooks/useAnimation";
import { DiscoverQuickDatePicker } from "./DiscoverQuickDatePicker";

export type DiscoverDraftFilters = DiscoverDraftFiltersValue;

interface DiscoverFilterSheetProps {
  activeFilterCount: number;
  counts: MobileDiscoverFeed["counts"];
  isPreviewLoading?: boolean;
  onApply: () => void;
  onChange: (value: DiscoverDraftFilters) => void;
  onClose: () => void;
  onReset: () => void;
  profileTimezone?: string | null;
  resultCount: number;
  tags: MobileDiscoverFeed["availableFilters"]["tags"];
  value: DiscoverDraftFilters;
  visible: boolean;
}

function FilterSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
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
  checked,
  count,
  label,
  onPress,
}: {
  checked: boolean;
  count?: number;
  label: string;
  onPress: () => void;
}) {
  const { tokens } = useAppTheme();
  const { scale, onPressIn, onPressOut } = useScalePress();

  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={styles.choiceRow}
    >
      <Animated.View style={[styles.choiceInner, { transform: [{ scale }] }]}>
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
      </Animated.View>
    </Pressable>
  );
}

export function DiscoverFilterSheet({
  activeFilterCount,
  counts,
  isPreviewLoading = false,
  onApply,
  onChange,
  onClose,
  onReset,
  profileTimezone = null,
  resultCount,
  tags,
  value,
  visible,
}: DiscoverFilterSheetProps) {
  const { tokens } = useAppTheme();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const selectedTags = Array.isArray(value?.tags) ? value.tags : [];
  const availableTags = Array.isArray(tags) ? tags : [];
  const costCounts = {
    free: counts?.cost?.free ?? 0,
    paid: counts?.cost?.paid ?? 0,
  };
  const dateRangeLabel = buildDiscoverDateRangeLabel(value.dateRange);

  function update<K extends keyof DiscoverDraftFilters>(
    key: K,
    nextValue: DiscoverDraftFilters[K],
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
        animationType="slide"
        onRequestClose={onClose}
        transparent
        visible={visible}
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <BlurView
            intensity={28}
            tint={
              tokens.mode === "dark"
                ? "systemThickMaterialDark"
                : "systemThinMaterialLight"
            }
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: tokens.colors.overlay },
            ]}
          />
        </Pressable>
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
                  Discover filters
                </Text>
                <Text
                  style={{
                    color: tokens.colors.discoverTextMuted,
                    fontFamily: tokens.typography.sans,
                    fontSize: 13,
                    fontWeight: "500",
                  }}
                >
                  Refine the feed without losing the current ranking mode.
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
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
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
                  style={{
                    color: tokens.colors.textPrimary,
                    fontFamily: tokens.typography.sans,
                    fontSize: 16,
                    fontWeight: "700",
                  }}
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
                      color={tokens.colors.discoverTextMuted}
                      name="angle-right"
                      size={15}
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
                      onChangeText={(nextValue) =>
                        update("location", nextValue)
                      }
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
                        color: tokens.colors.discoverTextSoft,
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
                  style={{
                    color: tokens.colors.textPrimary,
                    fontFamily: tokens.typography.sans,
                    fontSize: 16,
                    fontWeight: "700",
                  }}
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
                          checked={value.cost === option.id}
                          count={option.count}
                          label={option.label}
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
                              toggleDiscoverSelection(selectedTags, tag.value),
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

            <View style={styles.footer}>
              <Pressable
                onPress={onReset}
                style={[
                  styles.secondaryButton,
                  {
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
                onPress={onApply}
                style={[
                  styles.primaryButton,
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
                  {isPreviewLoading ? "Updating…" : `Show ${resultCount}`}
                </Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      <DiscoverQuickDatePicker
        onApply={(nextRange) => update("dateRange", nextRange)}
        onClose={() => setIsDatePickerOpen(false)}
        value={value.dateRange}
        visible={isDatePickerOpen}
      />
    </>
  );
}

const styles = StyleSheet.create({
  activeRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  choiceCopy: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  choiceInner: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    flex: 1,
  },
  choiceRow: {
    minHeight: 36,
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: "center",
  },
  dateField: {
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 36,
    paddingHorizontal: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
  },
  filterPill: {
    borderRadius: 2,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 28,
    paddingHorizontal: 8,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 10,
  },
  group: {
    gap: 10,
  },
  input: {
    fontSize: 14,
    paddingVertical: 0,
  },
  inputWrap: {
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 10,
  },
  listCard: {
    borderRadius: 4,
    borderWidth: 1,
    overflow: "hidden",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 32,
  },
  radio: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 18,
    justifyContent: "center",
    width: 18,
  },
  radioDot: {
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 32,
    minWidth: 88,
    paddingHorizontal: 12,
  },
  sheet: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  sheetContent: {
    gap: 14,
    paddingBottom: 12,
  },
  sheetHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingBottom: 12,
  },
  sheetHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  sheetSafeArea: {
    flex: 1,
    justifyContent: "flex-end",
  },
  wrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
