import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../providers/ThemeProvider';
import { CommunityAvatar } from '../community/CommunityAvatar';

export function ProfileCompactHeader({
  avatarUrl,
  displayName,
  username,
  action,
  visible,
}: {
  avatarUrl: string | null;
  displayName: string;
  username: string;
  action: ReactNode;
  visible: boolean;
}) {
  const { tokens } = useAppTheme();

  if (!visible) {
    return null;
  }

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: tokens.colors.shell,
          borderBottomColor: tokens.colors.divider,
        },
      ]}
    >
      <CommunityAvatar avatarUrl={avatarUrl} name={displayName} size={28} />
      <View style={styles.copy}>
        <Text
          numberOfLines={1}
          style={{
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
            fontSize: 15,
            fontWeight: '800',
            lineHeight: 19,
            letterSpacing: -0.2,
          }}
        >
          {displayName || `@${username}`}
        </Text>
      </View>
      <View style={styles.action}>{action}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    flexShrink: 0,
  },
  bar: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 50,
  },
  copy: {
    flex: 1,
  },
});
