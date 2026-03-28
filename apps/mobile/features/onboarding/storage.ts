import { Platform } from 'react-native';
import type { CareerOnboardingData } from '@kurecal/domain';
import { DRAFT_STORAGE_KEY } from '@/features/onboarding/constants';
import { getNativeStoredItem, removeNativeStoredItem, setNativeStoredItem } from '@/lib/nativeStorage';

export async function readStoredOnboardingDraft(): Promise<Partial<CareerOnboardingData> | null> {
  try {
    if (Platform.OS === 'web') {
      const stored = typeof window === 'undefined' ? null : window.localStorage.getItem(DRAFT_STORAGE_KEY);
      return stored ? (JSON.parse(stored) as Partial<CareerOnboardingData>) : null;
    }

    const stored = await getNativeStoredItem(DRAFT_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Partial<CareerOnboardingData>) : null;
  } catch {
    return null;
  }
}

export async function writeStoredOnboardingDraft(draft: Partial<CareerOnboardingData>) {
  try {
    const serialized = JSON.stringify(draft);
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(DRAFT_STORAGE_KEY, serialized);
      }
      return;
    }

    await setNativeStoredItem(DRAFT_STORAGE_KEY, serialized);
  } catch {
    // Keep working with the in-memory draft if persistence fails.
  }
}

export async function clearStoredOnboardingDraft() {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
      return;
    }

    await removeNativeStoredItem(DRAFT_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
}
