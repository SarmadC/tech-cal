import type { NormalizedSubscription } from "@kurecal/domain";

export function hasPaidAccess(
  subscription: NormalizedSubscription | null,
): boolean {
  if (!subscription || subscription.tier === "free") {
    return false;
  }

  if (
    subscription.status === "active" ||
    subscription.status === "trialing" ||
    subscription.status === "past_due"
  ) {
    return true;
  }

  if (subscription.status === "canceled" && subscription.currentPeriodEnd) {
    return new Date(subscription.currentPeriodEnd).getTime() > Date.now();
  }

  return false;
}

export function formatSubscriptionSummary(
  subscription: NormalizedSubscription | null,
): string {
  if (!subscription) {
    return "Checking access";
  }

  const tier = subscription.tier === "free" ? "Free" : "KureCal Pro";
  const status =
    subscription.status === "trialing"
      ? "Trialing"
      : subscription.status.replace(/_/g, " ");

  return `${tier} · ${status}`;
}

export function formatCareerSummary(
  careerProfile:
    | {
        currentRole?: string | null;
        companyName?: string | null;
      }
    | null
    | undefined,
): string | null {
  if (!careerProfile) {
    return null;
  }

  const role = careerProfile.currentRole?.trim();
  const companyName = careerProfile.companyName?.trim();

  if (!role) {
    return companyName ?? null;
  }

  return companyName ? `${role} at ${companyName}` : role;
}
