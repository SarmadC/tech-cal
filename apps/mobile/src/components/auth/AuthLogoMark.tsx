import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Polygon, Rect } from 'react-native-svg';

import { useAppTheme } from '../../providers/ThemeProvider';

interface AuthLogoMarkProps {
  size: number;
  style?: StyleProp<ViewStyle>;
}

export function AuthLogoMark({ size, style }: AuthLogoMarkProps) {
  const { resolvedTheme } = useAppTheme();
  const isDark = resolvedTheme === 'dark';
  const markColor = isDark ? '#FFFFFF' : '#000000';
  const backgroundColor = isDark ? '#000000' : '#FFFFFF';

  return (
    <Svg
      accessibilityLabel="KureCal logo"
      height={size}
      style={style}
      viewBox="0 0 120 120"
      width={size}
    >
      <Rect fill={backgroundColor} height="120" width="120" />

      <Polygon fill={markColor} opacity={0.3} points="60,60 52,56 28,68 36,72" />
      <Polygon fill={markColor} opacity={0.3} points="36,72 28,68 28,76 36,80" />
      <Polygon fill={markColor} opacity={0.5} points="60,60 36,72 36,80 60,68" />

      <Polygon fill={markColor} opacity={0.7} points="60,60 68,56 92,68 84,72" />
      <Polygon fill={markColor} opacity={0.5} points="84,72 92,68 92,76 84,80" />
      <Polygon fill={markColor} opacity={0.7} points="60,60 84,72 84,80 60,68" />

      <Polygon fill={markColor} opacity={0.5} points="52,64 60,68 60,100 52,96" />
      <Polygon fill={markColor} opacity={0.3} points="68,64 60,68 60,100 68,96" />
      <Polygon fill={markColor} opacity={0.3} points="52,96 60,100 68,96 60,92" />

      <Polygon fill={markColor} opacity={0.85} points="60,60 52,64 28,52 36,48" />
      <Polygon fill={markColor} opacity={0.7} points="36,48 28,52 28,44 36,40" />
      <Polygon fill={markColor} opacity={0.85} points="60,60 36,48 36,40 60,52" />

      <Polygon fill={markColor} points="60,60 68,64 92,52 84,48" />
      <Polygon fill={markColor} opacity={0.85} points="84,48 92,52 92,44 84,40" />
      <Polygon fill={markColor} points="60,60 84,48 84,40 60,52" />

      <Polygon fill={markColor} points="52,56 60,52 60,20 52,24" />
      <Polygon fill={markColor} points="68,56 60,52 60,20 68,24" />
      <Polygon fill={markColor} points="52,24 60,20 68,24 60,28" />

      <Polygon fill={markColor} points="52,56 60,52 68,56 60,60" />
    </Svg>
  );
}
