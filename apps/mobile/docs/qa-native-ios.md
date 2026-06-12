# Native iOS Migration — Device QA Checklist

Covers the NativeTabs / haptics / blur / Reanimated / FlashList migration
(`bc671949`) plus the recommendation scoring unification (`bb28654e`).
Simulator-verifiable items are checked during the automated smoke pass; the
items below need a **physical device** (haptics are silent in the simulator,
and liquid glass requires iOS 26 hardware or simulator).

## Haptics (physical device only)

- [ ] Buttons (`KureButton`, e.g. Log In, filter Apply): light tap on press-in.
- [ ] Event / community cards: light tap on press-in.
- [ ] Pull-to-refresh on Discover, Notifications, Saved, Settings: success
      notification haptic when the refresh completes.
- [ ] Discover ranking rail + filter sheet choices + Settings theme picker:
      selection tick on tap.
- [ ] Long-press an event card (Discover list or hero): medium impact, then
      the Open/Share action sheet.
- [ ] Destructive flows (log out, delete thread/reply): warning haptic when
      the sheet opens.
- [ ] System Settings → Sounds & Haptics → System Haptics OFF: app produces no
      haptics.

## Tab bar & navigation

- [ ] iOS 26 device: tab bar renders liquid glass; scroll-edge effect appears
      under content.
- [ ] iOS 18 or earlier device: tab bar is not transparent over scrolled
      content (known NativeTabs edge case — if broken, set
      `disableTransparentOnScrollEdge` on the affected Trigger).
- [ ] Re-tap the active tab: feed scrolls to top.
- [ ] Switch tabs: scroll positions preserved per tab.
- [ ] Kill app on Community → relaunch: opens on Community (last-tab restore).
- [ ] Notifications tab badge: shows unread count, 99+ above 99, clears after
      reading / mark-all.

## Visual / motion

- [ ] Menu sheet: blurred backdrop + frosted panel in BOTH light and dark
      themes; slides in from the left.
- [ ] Discover filter sheet: blurred backdrop.
- [ ] Discover compact header (after scrolling): frosted blur with hairline
      border.
- [ ] Accessibility → Reduce Motion ON: press-scale animations and menu-sheet
      slide are skipped; app remains fully usable.

## Feeds (FlashList)

- [ ] Discover: fast-scroll 50+ events — no blank cells, no stutter;
      pagination loads on reaching the end (the "Show more" button is gone).
- [ ] Community home, Notifications, Saved: same fast-scroll check.
- [ ] Keyboard: community composer and Submit Event form — inputs stay
      visible, dragging the list dismisses the keyboard.

## Recommendations parity

- [ ] Pick one event visible on both Dashboard ("Alignment N" card) and
      Discover best-match: the score matches exactly.
- [ ] Dashboard summary loads in roughly the same time as before the pipeline
      change (no multi-second regression).

## System integration

- [ ] Push notification tap (cold start AND warm): routes to the right screen.
- [ ] Sign in with Apple completes.
- [ ] Calendar sync settings: Google connect flow opens and returns via
      `kurecal[-dev]://calendar/google/callback`.
- [ ] Paywall modal presents from the bottom and dismisses with a swipe.
