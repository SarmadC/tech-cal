import * as Application from 'expo-application';
import { Alert } from 'react-native';

import {
  isAppReviewEligible,
  type ReviewSignatureInteraction,
} from './appReviewEligibility';
import {
  getPushPermissionState,
  registerForPushNotificationsAsync,
} from './pushNotifications';
import { sessionStorage } from './sessionStorage';

const SAVE_COUNT_KEY = 'kurecal_signature_event_save_count';
const NOTIFICATION_CONTEXT_KEY = 'kurecal_notification_context_prompted';
const REVIEW_ATTEMPT_PREFIX = 'kurecal_app_review_attempted:';
async function incrementSaveCount() {
  const current = Number(await sessionStorage.getItem(SAVE_COUNT_KEY)) || 0;
  const next = current + 1;
  await sessionStorage.setItem(SAVE_COUNT_KEY, String(next));
  return next;
}

async function maybeOfferNotifications() {
  const alreadyOffered = await sessionStorage.getItem(NOTIFICATION_CONTEXT_KEY);
  if (alreadyOffered) return false;

  const permission = await getPushPermissionState();
  if (permission !== 'not-determined') return false;

  await sessionStorage.setItem(NOTIFICATION_CONTEXT_KEY, new Date().toISOString());
  Alert.alert(
    'Stay ahead of your events',
    'Turn on notifications for replies, mentions, and useful event follow-ups. You can fine-tune them any time in Settings.',
    [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Enable notifications',
        onPress: () => {
          void registerForPushNotificationsAsync({ requestPermission: true });
        },
      },
    ],
  );
  return true;
}

async function maybeRequestAppReview(
  accountCreatedAt: string | null | undefined,
  interaction: ReviewSignatureInteraction,
  eventSaveCount: number,
) {
  if (!isAppReviewEligible({ accountCreatedAt, eventSaveCount, interaction })) {
    return;
  }

  // Never stack the system rating sheet over KureCal's notification explainer.
  if (!(await sessionStorage.getItem(NOTIFICATION_CONTEXT_KEY))) return;

  const version = Application.nativeApplicationVersion ?? 'unknown';
  const attemptedKey = `${REVIEW_ATTEMPT_PREFIX}${version}`;
  if (await sessionStorage.getItem(attemptedKey)) return;

  try {
    // Load the optional native bridge only when an account is eligible. This
    // prevents an older development client from crashing at module startup
    // after JavaScript has been updated ahead of the native binary.
    const StoreReview = await import('expo-store-review');
    if (!(await StoreReview.isAvailableAsync()) || !(await StoreReview.hasAction())) {
      return;
    }

    await sessionStorage.setItem(attemptedKey, new Date().toISOString());
    await StoreReview.requestReview();
  } catch {
    // A stale dev client may not contain ExpoStoreReview yet. Eligibility is
    // intentionally left unconsumed so a rebuilt client can retry later.
  }
}

export async function recordSignatureInteraction({
  accountCreatedAt,
  interaction,
}: {
  accountCreatedAt?: string | null;
  interaction: ReviewSignatureInteraction;
}) {
  const eventSaveCount =
    interaction === 'event-save' ? await incrementSaveCount() : 0;
  const offeredNotifications = await maybeOfferNotifications();

  if (!offeredNotifications) {
    await maybeRequestAppReview(
      accountCreatedAt,
      interaction,
      eventSaveCount,
    );
  }
}
