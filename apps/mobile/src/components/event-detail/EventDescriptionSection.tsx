import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../providers/ThemeProvider';

const TRUNCATE_THRESHOLD = 280;

export function EventDescriptionSection({ description }: { description: string }) {
  const { tokens } = useAppTheme();
  const [showFull, setShowFull] = useState(false);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
          What this event is about
        </Text>
      </View>
      <Text
        selectable
        numberOfLines={showFull ? undefined : 5}
        style={[styles.body, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}
      >
        {description}
      </Text>
      {description.length > TRUNCATE_THRESHOLD ? (
        <Pressable onPress={() => setShowFull((v) => !v)}>
          <Text style={[styles.link, { color: tokens.colors.link, fontFamily: tokens.typography.sans }]}>
            {showFull ? 'Show less' : 'Read more'}
          </Text>
        </Pressable>
      ) : null}
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
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  link: {
    fontSize: 13,
    fontWeight: '700',
  },
});
