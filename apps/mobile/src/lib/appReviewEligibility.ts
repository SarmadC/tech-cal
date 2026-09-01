export type ReviewSignatureInteraction = 'calendar-sync' | 'event-save';

const MINIMUM_ACCOUNT_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function isAppReviewEligible({
  accountCreatedAt,
  eventSaveCount,
  interaction,
  now = Date.now(),
}: {
  accountCreatedAt: string | null | undefined;
  eventSaveCount: number;
  interaction: ReviewSignatureInteraction;
  now?: number;
}) {
  if (!accountCreatedAt) return false;

  const createdAt = new Date(accountCreatedAt).getTime();
  if (!Number.isFinite(createdAt) || now - createdAt < MINIMUM_ACCOUNT_AGE_MS) {
    return false;
  }

  return interaction === 'calendar-sync' || eventSaveCount >= 3;
}
