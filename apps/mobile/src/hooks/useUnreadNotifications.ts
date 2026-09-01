import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAuth } from '../context/AuthProvider';
import { loadMobileNotificationUnreadCount } from '../lib/mobileApi';
import { setApplicationBadgeCount } from '../lib/pushNotifications';

interface UseUnreadNotificationsResult {
  count: number;
  refresh: () => Promise<void>;
}

// Lightweight global cache so every consumer (tab badge, etc.) shares one
// count without each fetching independently. Cleared on sign-out via the
// `userId` dependency below.
let cachedCount = 0;
const listeners = new Set<(value: number) => void>();

function publish(next: number) {
  cachedCount = next;
  void setApplicationBadgeCount(next);
  listeners.forEach((listener) => listener(next));
}

export function useUnreadNotifications(): UseUnreadNotificationsResult {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const [count, setCount] = useState<number>(cachedCount);
  const inFlight = useRef(false);

  useEffect(() => {
    listeners.add(setCount);
    return () => {
      listeners.delete(setCount);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!userId || inFlight.current) return;
    inFlight.current = true;
    try {
      const { count: next } = await loadMobileNotificationUnreadCount();
      publish(next);
    } catch {
      // Silently swallow — the bell stays at its last known value rather
      // than blocking the rest of the screen on a transient failure.
    } finally {
      inFlight.current = false;
    }
  }, [userId]);

  // Reset cache + refetch when the signed-in user changes.
  useEffect(() => {
    if (!userId) {
      publish(0);
      return;
    }
    void refresh();
  }, [userId, refresh]);

  // Refresh when the screen owning the bell regains focus.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  // Refresh when the app returns from background.
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') void refresh();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [refresh]);

  return { count, refresh };
}

// Imperative hook for screens that mutate the count themselves (e.g., the
// inbox after a mark-read) — avoids waiting for the next focus tick.
export function setLocalUnreadCount(next: number) {
  publish(Math.max(0, next));
}
