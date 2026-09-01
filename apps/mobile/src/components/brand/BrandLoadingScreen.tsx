import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { BrandLoadingLogo } from './BrandLoadingLogo';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';

interface BrandLoadingScreenProps {
  backgroundColor?: string;
  color?: string;
  style?: ViewStyle;
}

export function BrandLoadingScreen({
  backgroundColor = '#05070c',
  color,
  style,
}: BrandLoadingScreenProps) {
  const isDelayed = useDelayedLoading(true);
  return (
    <View accessibilityLiveRegion="polite" style={[styles.container, { backgroundColor }, style]}>
      <BrandLoadingLogo color={color} size={96} />
      {isDelayed ? <Text style={[styles.copy, { color }]}>Still getting things ready…</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  copy: { fontFamily: 'DMSans', fontSize: 13, lineHeight: 18 },
});
