import { FontAwesome } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAppTheme } from '../../providers/ThemeProvider';

interface DiscoverSearchBarProps {
  activeFilterCount: number;
  compact?: boolean;
  onChangeText: (value: string) => void;
  onOpenFilters: () => void;
  value: string;
}

export function DiscoverSearchBar({
  activeFilterCount,
  compact = false,
  onChangeText,
  onOpenFilters,
  value,
}: DiscoverSearchBarProps) {
  const { tokens } = useAppTheme();

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.toolbar,
          compact && styles.toolbarCompact,
          {
            backgroundColor: tokens.colors.discoverToolbar,
            borderColor: tokens.colors.discoverToolbarBorder,
          },
        ]}
      >
        <View style={styles.searchWrap}>
          <FontAwesome
            color={tokens.colors.discoverTextMuted}
            name="search"
            size={13}
            style={styles.searchIcon}
          />
          <TextInput
            accessibilityLabel="Search discover feed"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={onChangeText}
            placeholder="Search events, topics, or teams"
            placeholderTextColor={tokens.colors.discoverTextMuted}
            returnKeyType="search"
            selectionColor={tokens.colors.accent}
            style={[
              styles.input,
              compact && styles.inputCompact,
              {
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
              },
            ]}
            value={value}
          />
        </View>

        <View
          style={[
            styles.divider,
            {
              backgroundColor: tokens.colors.discoverToolbarBorder,
            },
          ]}
        />

        <Pressable
          accessibilityLabel="Open filters"
          onPress={onOpenFilters}
          style={({ pressed }) => [
            styles.filterButton,
            compact && styles.filterButtonCompact,
            {
              backgroundColor:
                activeFilterCount > 0 ? tokens.colors.discoverToolbarStrong : 'transparent',
              opacity: pressed ? 0.82 : 1,
            },
          ]}
        >
          <FontAwesome
            color={
              activeFilterCount > 0
                ? tokens.colors.textPrimary
                : tokens.colors.discoverTextSoft
            }
            name="sliders"
            size={12}
          />
          {activeFilterCount > 0 ? (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: tokens.colors.accent,
                },
              ]}
            >
              <Text
                style={{
                  color: tokens.colors.textInverse,
                  fontFamily: tokens.typography.sans,
                  fontSize: 10,
                  fontWeight: '800',
                }}
              >
                {Math.min(activeFilterCount, 9)}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {!compact && activeFilterCount > 0 ? (
        <View style={styles.activeHint}>
          <View
            style={[
              styles.activeDot,
              {
                backgroundColor: tokens.colors.accent,
              },
            ]}
          />
          <Text
            style={{
              color: tokens.colors.discoverTextMuted,
              fontFamily: tokens.typography.sans,
              fontSize: 11,
              fontWeight: '600',
            }}
          >
            {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} applied
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  activeDot: {
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  activeHint: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 2,
  },
  badge: {
    alignItems: 'center',
    borderRadius: 999,
    height: 14,
    justifyContent: 'center',
    minWidth: 14,
    paddingHorizontal: 2,
    position: 'absolute',
    right: 3,
    top: 3,
  },
  divider: {
    alignSelf: 'stretch',
    marginVertical: 9,
    width: StyleSheet.hairlineWidth,
  },
  filterButton: {
    alignItems: 'center',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 34,
    width: 34,
  },
  filterButtonCompact: {
    borderRadius: 9,
    minHeight: 32,
    width: 32,
  },
  input: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
    paddingVertical: 0,
  },
  inputCompact: {
    fontSize: 12,
  },
  row: {
    gap: 5,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchWrap: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  toolbar: {
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 44,
    paddingLeft: 13,
    paddingRight: 6,
  },
  toolbarCompact: {
    borderRadius: 13,
    minHeight: 40,
    paddingLeft: 11,
    paddingRight: 5,
  },
});
