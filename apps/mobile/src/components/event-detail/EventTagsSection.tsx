import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../providers/ThemeProvider';

const VISIBLE_COUNT = 6;

export function EventTagsSection({ tags }: { tags: string[] }) {
  const { tokens } = useAppTheme();
  const visible = tags.slice(0, VISIBLE_COUNT);
  const hiddenCount = Math.max(tags.length - visible.length, 0);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
          Tags
        </Text>
      </View>
      <View style={styles.tagWrap}>
        {visible.map((tag) => (
          <View
            key={tag}
            style={[
              styles.badge,
              { backgroundColor: tokens.colors.surfaceMuted, borderColor: tokens.colors.border },
            ]}
          >
            <Text style={[styles.badgeText, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
              {tag}
            </Text>
          </View>
        ))}
        {hiddenCount > 0 ? (
          <View
            style={[
              styles.badge,
              { backgroundColor: tokens.colors.accentSoft, borderColor: tokens.colors.border },
            ]}
          >
            <Text style={[styles.badgeText, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>
              +{hiddenCount} more
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 14,
  },
  sectionHeader: {
    gap: 2,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.18,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 6,
    rowGap: 10,
  },
  badge: {
    minHeight: 26,
    borderRadius: 3,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
