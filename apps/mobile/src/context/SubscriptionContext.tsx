import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { NormalizedSubscription } from "@kurecal/domain";

import { loadMobileSubscriptionStatus } from "../lib/mobileApi";
import { hasPaidAccess as computeHasPaidAccess } from "../lib/settingsPresentation";
import { useAuth } from "./AuthProvider";

interface SubscriptionContextValue {
  subscription: NormalizedSubscription | null;
  subscriptionLoading: boolean;
  subscriptionLoadFailed: boolean;
  hasPaidAccess: boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(
  null,
);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [subscription, setSubscription] =
    useState<NormalizedSubscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionLoadFailed, setSubscriptionLoadFailed] = useState(false);
  const requestSequenceRef = useRef(0);

  const refreshSubscription = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) return;

    const requestSequence = ++requestSequenceRef.current;
    setSubscriptionLoading(true);
    setSubscriptionLoadFailed(false);
    try {
      const result = await loadMobileSubscriptionStatus();
      if (requestSequence !== requestSequenceRef.current) {
        return;
      }
      setSubscription(result);
    } catch {
      if (requestSequence !== requestSequenceRef.current) {
        return;
      }
      setSubscriptionLoadFailed(true);
    } finally {
      if (requestSequence === requestSequenceRef.current) {
        setSubscriptionLoading(false);
      }
    }
  }, [session?.user.id]);

  useEffect(() => {
    if (session) {
      void refreshSubscription();
    } else {
      requestSequenceRef.current += 1;
      setSubscription(null);
      setSubscriptionLoadFailed(false);
      setSubscriptionLoading(false);
    }
  }, [session, refreshSubscription]);

  return (
    <SubscriptionContext.Provider
      value={{
        hasPaidAccess: computeHasPaidAccess(subscription),
        refreshSubscription,
        subscription,
        subscriptionLoadFailed,
        subscriptionLoading,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return ctx;
}
