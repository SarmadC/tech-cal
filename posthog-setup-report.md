# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into your Kure-Cal Next.js App Router project. This integration tracks key user behaviors across authentication, subscriptions, calendar integrations, and contact form submissions - enabling comprehensive analytics for understanding your user journey from signup to paid conversion.

## Summary of Changes

### Server-side Setup
- **Created `src/lib/posthog-server.ts`**: Server-side PostHog client helper for API routes and server actions with proper flush settings for serverless environments

### Event Tracking Implementation
The following files were modified to capture analytics events:

| Event Name | Description | File Path |
|------------|-------------|-----------|
| `user_signed_up` | Tracks when a user successfully signs up using email | `src/app/auth/actions.ts` |
| `user_logged_in` | Tracks when a user successfully logs in using email | `src/app/auth/actions.ts` |
| `password_reset_requested` | Tracks when a user requests a password reset | `src/app/auth/actions.ts` |
| `oauth_login_initiated` | Tracks when a user initiates OAuth login (Google/GitHub) | `src/app/login/page.tsx` |
| `oauth_signup_initiated` | Tracks when a user initiates OAuth signup (Google/GitHub) | `src/app/signup/page.tsx` |
| `subscription_checkout_started` | Tracks when a user starts the Pro subscription checkout | `src/app/pricing/page.tsx` |
| `subscription_activated` | Tracks when a subscription becomes active (Paddle webhook) | `src/app/api/paddle/webhook/route.ts` |
| `subscription_canceled` | Tracks when a subscription is canceled (Paddle webhook) | `src/app/api/paddle/webhook/route.ts` |
| `calendar_connected` | Tracks when a user connects their Google Calendar | `src/app/api/calendar/google/connect/route.ts` |
| `event_synced_to_calendar` | Tracks when a user syncs an event to their calendar | `src/app/api/calendar/sync/route.ts` |
| `contact_form_submitted` | Tracks when a contact form is successfully submitted | `src/app/contact/actions.tsx` |
| `billing_success_viewed` | Tracks when a user lands on the billing success page | `src/app/billing/success/page.tsx` |

### User Identification
- Server-side `identify()` calls added for login and signup events to link anonymous sessions to user IDs
- Client-side exception tracking with `posthog.captureException()` for OAuth errors

### Environment Variables
PostHog is configured via environment variables (already present in `.env.local`):
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

### Dashboard
- **Analytics basics**: [https://us.posthog.com/project/298557/dashboard/1128494](https://us.posthog.com/project/298557/dashboard/1128494)

### Insights
| Insight | Description | Link |
|---------|-------------|------|
| User Signup to Subscription Funnel | Conversion funnel from signup to paid subscription | [View Insight](https://us.posthog.com/project/298557/insights/YR2jsJ0w) |
| Authentication Events Over Time | Trends for signup, login, and OAuth events | [View Insight](https://us.posthog.com/project/298557/insights/irp6yMEB) |
| Subscription Churn Analysis | Comparison of subscription activations vs cancellations | [View Insight](https://us.posthog.com/project/298557/insights/kBQAEDMi) |
| Calendar Integration Engagement | Tracks calendar connections and event syncs | [View Insight](https://us.posthog.com/project/298557/insights/zIGpV5Gu) |
| Contact Form Submissions | Weekly contact form submission trends | [View Insight](https://us.posthog.com/project/298557/insights/AJmzkz0Q) |

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

The skill includes:
- Documentation for Next.js App Router integration patterns
- Example project code for reference
- User identification best practices
- Server-side tracking patterns
