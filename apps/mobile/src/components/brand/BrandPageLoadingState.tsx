import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '../../providers/ThemeProvider';
import { BrandLoadingLogo } from './BrandLoadingLogo';

interface BrandPageLoadingStateProps {
  style?: StyleProp<ViewStyle>;
}

/**
 * The shared visual treatment for blocking, page-level loading states.
 * Compact action feedback should continue to use its local indicator.
 */
export function BrandPageLoadingState({ style }: BrandPageLoadingStateProps) {
  const { tokens } = useAppTheme();

  return (
    <View accessibilityLiveRegion="polite" style={[styles.root, style]}>
      <BrandLoadingLogo color={tokens.colors.textPrimary} label="Loading" size={68} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 240,
    paddingVertical: 28,
  },
});
