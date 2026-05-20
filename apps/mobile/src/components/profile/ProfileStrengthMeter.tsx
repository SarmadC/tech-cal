import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../providers/ThemeProvider';
import { KureButton } from '../chrome/KureButton';

export interface ProfileStrengthItem {
  label: string;
  state: 'done' | 'open';
}

export function ProfileStrengthMeter({
  items,
  onEdit,
}: {
  items: ProfileStrengthItem[];
  onEdit: () => void;
}) {
  const { tokens } = useAppTheme();
  const total = items.length;
  const done = items.filter((item) => item.state === 'done').length;

  return (
    <View style={styles.block}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text
            style={[
              styles.eyebrow,
              { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans },
            ]}
          >
            PROFILE STRENGTH
          </Text>
          <Text
            style={[
              styles.score,
              { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
            ]}
          >
            {done} / {total}
          </Text>
        </View>
        <View style={styles.segments}>
          {items.map((item, index) => (
            <View
              key={`${item.label}-${index}`}
              style={[
                styles.segment,
                {
                  backgroundColor:
                    item.state === 'done'
                      ? tokens.colors.accent
                      : tokens.colors.border,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.chipRail}>
        {items.map((item) => {
          const isDone = item.state === 'done';
          return (
            <View
              key={item.label}
              style={[
                styles.chip,
                {
                  backgroundColor: isDone
                    ? tokens.colors.accentSoft
                    : tokens.colors.surfaceStrong,
                  borderColor: isDone ? tokens.colors.accent : tokens.colors.border,
                  borderRadius: tokens.radius.xs,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipGlyph,
                  {
                    color: isDone ? tokens.colors.accent : tokens.colors.textTertiary,
                    fontFamily: tokens.typography.mono,
                  },
                ]}
              >
                {isDone ? '✓' : '+'}
              </Text>
              <Text
                style={[
                  styles.chipLabel,
                  {
                    color: isDone
                      ? tokens.colors.textPrimary
                      : tokens.colors.textTertiary,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              >
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.actionRow}>
        <KureButton variant="secondary" onPress={onEdit}>
          Improve profile
        </KureButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  block: {
    gap: 10,
  },
  chip: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipGlyph: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  chipRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 12,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    lineHeight: 14,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  score: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 999,
  },
  segments: {
    flexDirection: 'row',
    gap: 4,
    width: 96,
  },
});
