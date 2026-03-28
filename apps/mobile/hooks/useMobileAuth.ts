import { useContext } from 'react';
import { AuthContext } from '@/providers/AuthProvider';

export function useMobileAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useMobileAuth must be used within AuthProvider');
  }

  return context;
}
