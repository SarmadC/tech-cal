import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { KureCard } from './KureCard';
import { SectionHeading } from './SectionHeading';

interface SectionCardProps extends PropsWithChildren {
  eyebrow?: string;
  title?: string;
  detail?: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export function SectionCard({
  eyebrow,
  title,
  detail,
  action,
  children,
  style,
  contentStyle,
}: SectionCardProps) {
  return (
    <KureCard style={style}>
      {title ? (
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          detail={detail}
          action={action}
        />
      ) : null}
      {children ? <View style={[styles.content, contentStyle]}>{children}</View> : null}
    </KureCard>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
});
