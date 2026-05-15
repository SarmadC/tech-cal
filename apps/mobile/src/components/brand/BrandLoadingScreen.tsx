import { StyleSheet, View, type ViewStyle } from 'react-native';

import { BrandLoadingLogo } from './BrandLoadingLogo';

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
  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      <BrandLoadingLogo color={color} size={96} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
