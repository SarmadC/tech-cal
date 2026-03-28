import type { PropsWithChildren, ReactNode } from 'react';
import { MobilePage } from '@/components/chrome/MobilePage';

export function KureScreen({
  title,
  subtitle,
  action,
  children,
}: PropsWithChildren<{ title: string; subtitle?: string; action?: ReactNode }>) {
  return (
    <MobilePage eyebrow="KureCal mobile" title={title} subtitle={subtitle} action={action} footerInset={40}>
      {children}
    </MobilePage>
  );
}
