# KureCal iOS launch checklist

## Repository and build

- [ ] Apply all Supabase migrations, including `delete_user_account`.
- [ ] Configure production EAS variables listed in `apps/mobile/README.md`.
- [ ] Run `npm run mobile:ci` and `npm run mobile:release:check`.
- [ ] Build with the EAS `production` profile and confirm `com.kurecal.mobile`.
- [ ] Test the archive on internal TestFlight before external TestFlight.

## Apple and provider configuration

- [ ] Create the App Store Connect record and record its numeric Apple ID.
- [ ] Enable Sign in with Apple and Push Notifications for `com.kurecal.mobile`.
- [ ] Configure APNs credentials, Google iOS/web OAuth clients, and production redirects.
- [ ] Create monthly and annual subscriptions and attach them to the RevenueCat offering.
- [ ] Configure `REVENUECAT_V2_SECRET_API_KEY` and `REVENUECAT_PROJECT_ID` on the API deployment.
- [ ] Verify RevenueCat webhook purchase, renewal, cancellation, billing issue, and expiration events.
- [ ] Accept current agreements and complete tax, banking, territory, and EU trader information.

## Product page and review

- [ ] Add app name, subtitle, description, keywords, category, support URL, privacy URL, and copyright.
- [ ] Upload current iPhone screenshots and subscription review screenshots.
- [ ] Complete App Privacy answers using the privacy manifest and privacy policy as the source of truth.
- [ ] Complete the current age-rating, content-rights, and export-compliance questionnaires.
- [ ] Provide a stable reviewer account plus instructions for subscriptions, calendar, notifications, community reporting, blocking, and account deletion.
- [ ] Assign the community moderation owner and escalation contact.
- [ ] Have counsel approve the Terms jurisdiction language and the updated privacy policy.

## TestFlight acceptance

- [ ] Fresh install, sign-up, email confirmation, Apple sign-in, Google sign-in, password reset, and logout.
- [ ] Purchase, restore, manage, renew, cancel, billing issue, expiration, and account-deletion warning.
- [ ] Permission allow/deny flows for notifications, location, photos, calendars, and reminders.
- [ ] Push receipt and deep linking from terminated, background, and foreground states.
- [ ] Community content filtering, reporting, blocking, moderation removal, and support contact.
- [ ] Permanent deletion for email, Apple, and Google accounts; deleted credentials cannot sign in again.
