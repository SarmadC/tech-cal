import { StyleSheet, View } from 'react-native';

import { CommunityAvatar } from './CommunityAvatar';

interface CommunityAvatarStackPerson {
  id?: string;
  fullName?: string | null;
  avatarUrl?: string | null;
}

export function CommunityAvatarStack({
  people,
  max = 3,
  size = 28,
}: {
  people: CommunityAvatarStackPerson[];
  max?: number;
  size?: number;
}) {
  const visiblePeople = people.slice(0, max);

  return (
    <View style={styles.stack}>
      {visiblePeople.map((person, index) => (
        <View
          key={person.id ?? `${person.fullName ?? 'person'}-${index}`}
          style={[
            styles.avatarWrap,
            {
              marginLeft: index === 0 ? 0 : Math.max(-10, Math.round(size * -0.34)),
            },
          ]}
        >
          <CommunityAvatar
            name={person.fullName}
            avatarUrl={person.avatarUrl}
            size={size}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
  },
});
