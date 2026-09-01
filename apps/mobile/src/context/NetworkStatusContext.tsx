import { useNetworkState } from 'expo-network';
import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../providers/ThemeProvider';

type NetworkStatusValue = {
  isOffline: boolean;
};

const NetworkStatusContext = createContext<NetworkStatusValue>({
  isOffline: false,
});

export function NetworkStatusProvider({ children }: PropsWithChildren) {
  const state = useNetworkState();
  const insets = useSafeAreaInsets();
  const { tokens } = useAppTheme();
  const isOffline =
    state.isConnected === false || state.isInternetReachable === false;
  const value = useMemo(() => ({ isOffline }), [isOffline]);

  return (
    <NetworkStatusContext.Provider value={value}>
      {children}
      {isOffline ? (
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={[
            styles.banner,
            {
              backgroundColor: tokens.colors.warning,
              top: insets.top + 4,
            },
          ]}
        >
          <Text
            style={[
              styles.label,
              {
                color: tokens.colors.textInverse,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            Offline · showing saved content where available
          </Text>
        </View>
      ) : null}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatus() {
  return useContext(NetworkStatusContext);
}

const styles = StyleSheet.create({
  banner: {
    alignSelf: 'center',
    borderRadius: 4,
    left: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    position: 'absolute',
    right: 20,
    zIndex: 2000,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
