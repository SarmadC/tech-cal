import { FontAwesome } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../providers/ThemeProvider';

interface CalendarToolbarProps {
  monthLabel: string;
  isCollapsed: boolean;
  activeFilterCount: number;
  onToggleCalendar: () => void;
  onOpenMonthPicker: () => void;
  onOpenFilters: () => void;
}

export function CalendarToolbar({
  monthLabel,
  isCollapsed,
  activeFilterCount,
  onToggleCalendar,
  onOpenMonthPicker,
  onOpenFilters,
}: CalendarToolbarProps) {
  const { tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.toolbarShell,
        {
          backgroundColor: tokens.colors.discoverToolbar,
          borderColor: tokens.colors.discoverToolbarBorderStrong,
          shadowColor: tokens.colors.textPrimary,
          shadowOpacity: tokens.mode === 'light' ? 0.06 : 0,
        },
      ]}
    >
      <Pressable
        accessibilityHint="Long press to jump to a date"
        accessibilityLabel={isCollapsed ? 'Expand calendar' : 'Collapse calendar'}
        delayLongPress={320}
        onLongPress={onOpenMonthPicker}
        onPress={onToggleCalendar}
        style={({ pressed }) => [
          styles.monthButton,
          {
            backgroundColor: pressed ? tokens.colors.discoverToolbarStrong : 'transparent',
            opacity: pressed ? 0.86 : 1,
          },
        ]}
      >
        <Text
          style={{
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
            fontSize: 17,
            fontWeight: '800',
          }}
        >
          {monthLabel}
        </Text>
        <FontAwesome
          name={isCollapsed ? 'angle-down' : 'angle-up'}
          size={15}
          color={tokens.colors.discoverTextSoft}
        />
      </Pressable>

      <View
        style={[
          styles.divider,
          {
            backgroundColor: tokens.colors.discoverToolbarBorderStrong,
          },
        ]}
      />

      <Pressable
        accessibilityLabel="Open calendar filters"
        onPress={onOpenFilters}
        style={({ pressed }) => [
          styles.filterButton,
          {
            backgroundColor:
              pressed || activeFilterCount > 0
                ? tokens.colors.discoverToolbarStrong
                : 'transparent',
            opacity: pressed ? 0.86 : 1,
          },
        ]}
      >
        <FontAwesome
          name="sliders"
          size={14}
          color={
            activeFilterCount > 0
              ? tokens.colors.textPrimary
              : tokens.colors.discoverTextSoft
          }
        />
        {activeFilterCount > 0 ? (
          <View
            style={[
              styles.filterBadge,
              {
                backgroundColor: tokens.colors.textPrimary,
              },
            ]}
          >
            <Text
              style={{
                color: tokens.colors.textInverse,
                fontFamily: tokens.typography.mono,
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              {activeFilterCount}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbarShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 48,
    padding: 4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  monthButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: 8,
  },
  filterButton: {
    minWidth: 40,
    height: 40,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
});
