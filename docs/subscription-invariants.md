# Subscription Invariants

This document captures the core invariants for paid vs free tier behavior and
where they are enforced. Use it as a quick audit checklist when making changes.

## Invariants

1) Source of truth: Paddle webhooks update subscription state.
   - src/app/api/paddle/webhook/route.ts
   - src/services/paddleWebhookService.ts

2) Status mapping safety: Unknown statuses must not grant access.
   - src/services/paddleWebhookService.ts (mapPaddleStatus)

3) Tier mapping: Price ID drives tier; team IDs map to team (including trials).
   - src/services/paddleWebhookService.ts (determineTier)
   - src/lib/paddle.ts (PADDLE_PRICES)

4) Trial access: Trialing users always have full access.
   - src/types/subscription.ts (hasFeatureAccess)
   - src/lib/subscription.ts (canAccessFeature)

5) Grace period: past_due users retain access.
   - src/types/subscription.ts
   - src/lib/subscription.ts
   - src/hooks/useSubscription.ts

6) Canceled but active: canceled users keep access until current_period_end.
   - src/services/paddleWebhookService.ts (canceled handler)
   - src/types/subscription.ts
   - src/lib/subscription.ts
   - src/hooks/useSubscription.ts

7) Free tier default: Missing subscription rows are treated as free.
   - src/lib/subscription.ts (getSubscription, requirePro, requireFeature)
   - src/hooks/useSubscription.ts

8) Feature gating parity: Client and server checks match.
   - src/types/subscription.ts
   - src/lib/subscription.ts
   - src/hooks/useSubscription.ts
   - src/components/subscription/FeatureGate.tsx

9) Calendar sync is paid-only: sync/connect require entitlements; delete is open.
   - src/app/api/calendar/sync/route.ts
   - src/app/api/calendar/google/connect/route.ts
   - src/app/api/calendar/google/status/route.ts
   - src/app/api/calendar/bulk-sync/route.ts

10) Billing period preservation: cancel events must not clear valid dates.
    - src/services/paddleWebhookService.ts (handleSubscriptionCanceled)

11) DLQ safety: retry is idempotent; delete only after insert success.
    - src/app/api/admin/dlq/retry/route.ts

## Release Audit Checklist

- Webhook coverage for canceled, past_due, trialing, and team SKUs
- API gate parity vs client gate logic
- Calendar sync routes enforce paid access; delete remains open
- Canceled-but-active retains access through current_period_end
- DLQ retry does not duplicate and only deletes on success
