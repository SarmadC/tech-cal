import { FontAwesome } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import type {
  MobileDiscoverCost,
  MobileDiscoverDateRange,
  MobileDiscoverFeed,
} from '@kurecal/domain';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DiscoverQuickDatePicker } from '@/components/discover/DiscoverQuickDatePicker';
import { resolveCurrentLocationLabel } from '@/components/discover/discoverLocationUtils';
import { useAppTheme } from '@/providers/ThemeProvider';

export interface DiscoverDraftFilters {
  tags: string[];
  location: string;
  dateRange: MobileDiscoverDateRange;
  cost: MobileDiscoverCost;
}

interface DiscoverFilterSheetProps {
  visible: boolean;
  value: DiscoverDraftFilters;
  tags: MobileDiscoverFeed['availableFilters']['tags'];
  counts: MobileDiscoverFeed['counts'];
  resultCount: number;
  activeFilterCount: number;
  profileTimezone?: string | null;
  isPreviewLoading?: boolean;
  onChange: (value: DiscoverDraftFilters) => void;
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
    return '';
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateRangeLabel(value: MobileDiscoverDateRange) {
  if (!value.start && !value.end) {
    return 'Any date';
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
              backgroundColor: checked ? tokens.colors.textPrimary : 'transparent',
              borderColor: checked ? tokens.colors.textPrimary : tokens.colors.discoverToolbarBorderStrong,
            },
          ]}
        >
          <View
            style={[
              styles.radioDot,
              {
                backgroundColor: checked ? tokens.colors.textInverse : 'transparent',
              },
            ]}
          />
        </View>

        <Text
          style={{
            color: checked ? tokens.colors.textPrimary : tokens.colors.discoverTextSoft,
            fontFamily: tokens.typography.sans,
            fontSize: 14,
            fontWeight: checked ? '700' : '500',
          }}
        >
          {label}
        </Text>
      </View>

      {typeof count === 'number' ? (
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

export function DiscoverFilterSheet({
  visible,
  value,
  tags,
  counts,
  resultCount,
  activeFilterCount,
  profileTimezone = null,
  isPreviewLoading = false,
  onChange,
  onApply,
  onClose,
  onReset,
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
  const dateRangeLabel = formatDateRangeLabel(value.dateRange);

  function update<K extends keyof DiscoverDraftFilters>(key: K, nextValue: DiscoverDraftFilters[K]) {
    onChange({
      ...value,
      [key]: nextValue,
    });
  }

  async function handleUseCurrentLocation() {
    setIsDetectingLocation(true);

    try {
      const detectedLocation = await resolveCurrentLocationLabel(profileTimezone);
      if (detectedLocation) {
        update('location', detectedLocation);
      }
    } finally {
      setIsDetectingLocation(false);
    }
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={[styles.overlay, { backgroundColor: tokens.colors.overlay }]} onPress={onClose} />
        <SafeAreaView edges={['bottom']} style={styles.sheetSafeArea}>
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
                    fontWeight: '800',
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
                    fontWeight: '700',
                  }}
                >
                  Close
                </Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
              {activeFilterCount > 0 ? (
                <View style={styles.activeRow}>
                  <Text
                    style={{
                      color: tokens.colors.discoverTextMuted,
                      fontFamily: tokens.typography.sans,
                      fontSize: 12,
                      fontWeight: '500',
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
                        fontWeight: '600',
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
                        color: value.dateRange.start || value.dateRange.end
                          ? tokens.colors.textPrimary
                          : tokens.colors.discoverTextMuted,
                        fontFamily: tokens.typography.sans,
                        fontSize: 15,
                        fontWeight: '500',
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
                      placeholder={isDetectingLocation ? 'Finding nearby events...' : 'City or region'}
                      placeholderTextColor={tokens.colors.discoverTextMuted}
                      style={[
                        styles.input,
                        {
                          color: tokens.colors.textPrimary,
                          fontFamily: tokens.typography.sans,
                        },
                      ]}
                      value={value.location}
                      onChangeText={(nextValue) => update('location', nextValue)}
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
                        color: isDetectingLocation ? tokens.colors.discoverTextMuted : tokens.colors.discoverTextSoft,
                        fontFamily: tokens.typography.sans,
                        fontSize: 13,
                        fontWeight: '600',
                      }}
                    >
                      {isDetectingLocation ? 'Detecting location...' : 'Use current location'}
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
                      { id: 'all', label: 'Any' },
                      { id: 'free', label: 'Free', count: costCounts.free },
                      { id: 'paid', label: 'Paid', count: costCounts.paid },
                    ].map((option, index, options) => (
                      <View key={option.id}>
                        <FilterChoice
                          label={option.label}
                          count={option.count}
                          checked={value.cost === option.id}
                          onPress={() => update('cost', option.id as MobileDiscoverCost)}
                        />
                        {index < options.length - 1 ? (
                          <View
                            style={[
                              styles.divider,
                              {
                                backgroundColor: tokens.colors.discoverToolbarBorder,
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
                          onPress={() => update('tags', toggleSelection(selectedTags, tag.value))}
                          style={[
                            styles.filterPill,
                            {
                              backgroundColor: active ? tokens.colors.discoverToolbarStrong : tokens.colors.discoverToolbar,
                              borderColor: active
                                ? tokens.colors.discoverToolbarBorderStrong
                                : tokens.colors.discoverToolbarBorder,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: active ? tokens.colors.textPrimary : tokens.colors.discoverTextSoft,
                              fontFamily: tokens.typography.sans,
                              fontSize: 13,
                              fontWeight: '600',
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
                  Reset all
                </Text>
              </Pressable>

              <Pressable
                onPress={onApply}
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
                  {isPreviewLoading ? 'Updating…' : `Show ${resultCount}`}
                </Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>

        <DiscoverQuickDatePicker
          visible={isDatePickerOpen}
          presentation="inline"
          value={value.dateRange}
          onApply={(nextRange) => update('dateRange', nextRange)}
          onClose={() => setIsDatePickerOpen(false)}
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
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  sheetHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  sheetContent: {
    gap: 18,
    paddingBottom: 8,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  group: {
    gap: 14,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.15,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  listCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  filterPill: {
    minHeight: 36,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 42,
  },
  choiceRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
  },
  choiceCopy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  inputWrap: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  input: {
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: 0,
  },
  dateField: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
