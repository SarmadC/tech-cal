import { FontAwesome } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";

import { useAppTheme } from "../../providers/ThemeProvider";

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
  const { fontScale } = useWindowDimensions();
  const accessibilityHeight = Math.min(76, 44 + Math.max(0, fontScale - 1) * 16);

  return (
    <View
      style={[
        styles.toolbar,
        { minHeight: accessibilityHeight },
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
          placeholder="Search events, topics, or location"
          placeholderTextColor={tokens.colors.discoverTextMuted}
          returnKeyType="search"
          maxFontSizeMultiplier={2}
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

      <Pressable
        accessibilityLabel="Open filters"
        accessibilityRole="button"
        onPress={onOpenFilters}
        style={({ pressed }) => [
          styles.filterButton,
          compact && styles.filterButtonCompact,
          {
            backgroundColor:
              activeFilterCount > 0
                ? tokens.colors.discoverToolbarStrong
                : "transparent",
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
                fontWeight: "800",
              }}
            >
              {Math.min(activeFilterCount, 9)}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    borderRadius: 999,
    height: 14,
    justifyContent: "center",
    minWidth: 14,
    paddingHorizontal: 2,
    position: "absolute",
    right: 3,
    top: 3,
  },
  filterButton: {
    alignItems: "center",
    borderRadius: 4,
    justifyContent: "center",
    minHeight: 44,
    width: 44,
  },
  filterButtonCompact: {
    minHeight: 44,
    width: 44,
  },
  input: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    paddingVertical: 0,
  },
  inputCompact: {
    fontSize: 13,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchWrap: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
  },
  toolbar: {
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 44,
    paddingLeft: 10,
    paddingRight: 4,
  },
  toolbarCompact: {
    minHeight: 44,
    paddingLeft: 9,
    paddingRight: 4,
  },
});
