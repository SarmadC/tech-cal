// src/components/providers/SupabaseProvider.tsx
'use client';

import { createContext, useContext, ReactNode, useState, useEffect, useMemo } from 'react';
import { createClient, type SupabaseClient } from '@/utils/supabase/client';

// Consolidated error messages for consistency
const ERRORS = {
  PROVIDER_REQUIRED: 'useSupabase must be used within a SupabaseProvider',
  PROVIDER_REQUIRED_SAFE: 'useSupabaseSafe must be used within a SupabaseProvider', 
  CLIENT_NOT_READY: 'Supabase client is not ready yet. Make sure you are using this hook in a client component.',
  CLIENT_FAILED: 'Supabase client failed to initialize.',
} as const;

interface SupabaseContextType {
  supabase: SupabaseClient | null;
  isReady: boolean;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

interface SupabaseProviderProps {
  children: ReactNode;
}

export function SupabaseProvider({ children }: SupabaseProviderProps) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize client only in browser environment
    if (typeof window !== 'undefined') {
      try {
        const client = createClient();
        setSupabase(client);
        setIsReady(true);
      } catch (error) {
        console.warn('Failed to create Supabase client:', error);
        setIsReady(true); // Still mark as ready even if failed
      }
    }
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ supabase, isReady }), [supabase, isReady]);

  return (
    <SupabaseContext.Provider value={contextValue}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error(ERRORS.PROVIDER_REQUIRED);
  }
  if (!context.isReady) {
    throw new Error(ERRORS.CLIENT_NOT_READY);
  }
  if (context.supabase === null) {
    throw new Error(ERRORS.CLIENT_FAILED);
  }
  return context.supabase;
}

// Safe hook that doesn't throw when client isn't ready
export function useSupabaseSafe() {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error(ERRORS.PROVIDER_REQUIRED_SAFE);
  }
  return context;
}
