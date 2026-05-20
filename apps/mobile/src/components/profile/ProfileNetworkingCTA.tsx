import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../providers/ThemeProvider';
import { KureButton } from '../chrome/KureButton';

export type NetworkingStatus = 'none' | 'requested' | 'connected';

const STATUS_LABELS: Record<NetworkingStatus, string> = {
  none: 'Not tracked',
  requested: 'Request logged',
  connected: 'Connected',
};

export function ProfileNetworkingCTA({
  status,
  pendingAction,
  onMarkRequest,
  onConfirm,
}: {
  status: NetworkingStatus;
  pendingAction: 'request' | 'confirm' | null;
  onMarkRequest: () => void;
  onConfirm: () => void;
}) {
  const { tokens } = useAppTheme();
  const isConnected = status === 'connected';
  const isRequested = status === 'requested';
  const dotColor = isConnected
    ? tokens.colors.accent
    : isRequested
      ? tokens.colors.accent
      : tokens.colors.borderStrong;

  return (
    <View style={styles.block}>
      <View style={styles.row}>
        <View style={styles.statusGroup}>
          <View
            style={[
              styles.dot,
              { backgroundColor: dotColor, opacity: isRequested && !isConnected ? 0.6 : 1 },
            ]}
          />
          <Text
            style={[
              styles.statusLabel,
              { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
            ]}
          >
            {STATUS_LABELS[status]}
          </Text>
        </View>
        <View style={styles.primaryActionWrap}>
          <KureButton
            onPress={onConfirm}
            disabled={Boolean(pendingAction) || isConnected}
          >
            {pendingAction === 'confirm'
              ? 'Saving...'
              : isConnected
                ? 'Confirmed'
                : 'Confirm connection'}
          </KureButton>
        </View>
      </View>
      {isRequested ? (
        <View style={styles.secondaryActionWrap}>
          <KureButton
            variant="secondary"
            onPress={onMarkRequest}
            disabled={Boolean(pendingAction)}
          >
            {pendingAction === 'request' ? 'Saving...' : 'Re-log request'}
          </KureButton>
        </View>
      ) : null}
      {status === 'none' ? (
        <View style={styles.secondaryActionWrap}>
          <KureButton
            variant="secondary"
            onPress={onMarkRequest}
            disabled={Boolean(pendingAction)}
          >
            {pendingAction === 'request' ? 'Saving...' : 'Mark request sent'}
          </KureButton>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 8,
    paddingHorizontal: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  primaryActionWrap: {
    flexShrink: 0,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 36,
  },
  secondaryActionWrap: {
    width: '100%',
  },
  statusGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: 8,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
});
