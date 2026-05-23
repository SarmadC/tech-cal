import type { MobilePublicProfile } from '@kurecal/domain';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../providers/ThemeProvider';

const MAX_VISIBLE_CHIPS = 4;

type SharedCircle = NonNullable<MobilePublicProfile['sharedCircles']>[number];
type Recommender = NonNullable<MobilePublicProfile['recommendedBy']>[number];

export function ProfileMutualGround({
  mutualCount,
  sharedEventsCount,
  sharedTopics,
  sharedCircles,
  sharedCirclesCount,
  recommendedBy,
  sharedCareerGoals,
}: {
  mutualCount: number;
  sharedEventsCount: number;
  sharedTopics: string[];
  sharedCircles?: SharedCircle[];
  sharedCirclesCount?: number;
  recommendedBy?: Recommender[];
  sharedCareerGoals?: string[];
}) {
  const { tokens } = useAppTheme();

  const chips: string[] = [];

  // Most-trust-first order
  if (recommendedBy && recommendedBy.length > 0) {
    const top = recommendedBy[0];
    const name = top.fullName?.trim() || `@${top.username}`;
    chips.push(`${name} follows them`);
  }
  if (mutualCount > 0) {
    chips.push(`${mutualCount} mutual${mutualCount === 1 ? '' : 's'}`);
  }
  if (sharedEventsCount > 0) {
    chips.push(
      `${sharedEventsCount} shared event${sharedEventsCount === 1 ? '' : 's'}`
    );
  }
  const circleCount = sharedCirclesCount ?? sharedCircles?.length ?? 0;
  if (circleCount > 0) {
    const firstName = sharedCircles?.[0]?.name;
    chips.push(
      circleCount === 1 && firstName
        ? `Both in ${firstName}`
        : `Both in ${circleCount} communities`
    );
  }
  if (sharedTopics.length > 0) {
    chips.push(`Both into ${sharedTopics.slice(0, 2).join(', ')}`);
  }
  if (sharedCareerGoals && sharedCareerGoals.length > 0) {
    chips.push(`Both targeting ${sharedCareerGoals[0].toLocaleLowerCase()}`);
  }

  if (chips.length === 0) {
    return null;
  }

  const visible = chips.slice(0, MAX_VISIBLE_CHIPS);

  return (
    <View style={styles.row}>
      {visible.map((label) => (
        <View
          key={label}
          style={[
            styles.chip,
            {
              backgroundColor: tokens.colors.accentSoft,
              borderRadius: tokens.radius.xs,
            },
          ]}
        >
          <Text
            style={{
              color: tokens.colors.accent,
              fontFamily: tokens.typography.mono,
              fontSize: 11,
              fontWeight: '700',
              lineHeight: 14,
              letterSpacing: 0.2,
            }}
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
});
