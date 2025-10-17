// src/app/(protected)/layout.tsx
import { ReactNode } from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { enforceOnboarding } from '@/utils/onboarding';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Auth required for all protected routes
  if (!user) {
    redirect('/login');
  }

  // Centralized onboarding guard
  await enforceOnboarding(supabase, user.id, 'protected');

  return <>{children}</>;
}
