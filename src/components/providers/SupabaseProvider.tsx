// src/components/providers/SupabaseProvider.tsx
'use client';

import { createContext, useContext, ReactNode, useState } from 'react';
import { createClient, type SupabaseClient } from '@/utils/supabase/client';

interface SupabaseContextType {
  supabase: SupabaseClient | null;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

interface SupabaseProviderProps {
  children: ReactNode;
}

export function SupabaseProvider({ children }: SupabaseProviderProps) {
  const [supabase] = useState<SupabaseClient | null>(() => {
    // Only create the client in the browser
    if (typeof window !== 'undefined') {
      try {
        return createClient();
      } catch (error) {
        console.warn('Failed to create Supabase client:', error);
        return null;
      }
    }
    return null;
  });

  return (
    <SupabaseContext.Provider value={{ supabase }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  if (context.supabase === null) {
    throw new Error('Supabase client is not ready yet. Make sure you are using this hook in a client component.');
  }
  return context.supabase;
}
