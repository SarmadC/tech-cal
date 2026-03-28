import { FontAwesome } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/providers/ThemeProvider';

interface DiscoverSearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  onOpenFilters: () => void;
  activeFilterCount: number;
  compact?: boolean;
}

export function DiscoverSearchBar({
  value,
  onChangeText,
  onOpenFilters,
  activeFilterCount,
  compact = false,
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
            name="search"
            size={13}
            color={tokens.colors.discoverTextMuted}
            style={styles.searchIcon}
          />
          <TextInput
            accessibilityLabel="Search discover feed"
            autoCapitalize="none"
            autoCorrect={false}
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
            onChangeText={onChangeText}
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
            name="sliders"
            size={12}
            color={activeFilterCount > 0 ? tokens.colors.textPrimary : tokens.colors.discoverTextSoft}
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
  row: {
    gap: 5,
  },
  toolbar: {
    minHeight: 44,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 13,
    paddingRight: 6,
  },
  toolbarCompact: {
    minHeight: 40,
    borderRadius: 13,
    paddingLeft: 11,
    paddingRight: 5,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 8,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: 9,
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
  filterButton: {
    width: 34,
    minHeight: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonCompact: {
    width: 32,
    minHeight: 32,
    borderRadius: 9,
  },
  badge: {
    position: 'absolute',
    top: 3,
    right: 3,
    minWidth: 14,
    height: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  activeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
});
