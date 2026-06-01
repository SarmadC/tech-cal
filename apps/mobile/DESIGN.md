---
name: Calm and Exact
colors:
  surface: '#121314'
  surface-dim: '#121314'
  surface-bright: '#39393a'
  surface-container-lowest: '#0d0e0f'
  surface-container-low: '#1b1c1d'
  surface-container: '#1f2021'
  surface-container-high: '#292a2b'
  surface-container-highest: '#343536'
  on-surface: '#e3e2e3'
  on-surface-variant: '#c6c5d5'
  inverse-surface: '#e3e2e3'
  inverse-on-surface: '#303031'
  outline: '#908f9e'
  outline-variant: '#454652'
  surface-tint: '#bdc2ff'
  primary: '#bdc2ff'
  on-primary: '#121f8b'
  primary-container: '#5e6ad2'
  on-primary-container: '#fdfaff'
  inverse-primary: '#4854bb'
  secondary: '#c6c6c9'
  on-secondary: '#2f3133'
  secondary-container: '#454749'
  on-secondary-container: '#b4b5b7'
  tertiary: '#c5c6ca'
  on-tertiary: '#2e3134'
  tertiary-container: '#717477'
  on-tertiary-container: '#fafbff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dfe0ff'
  primary-fixed-dim: '#bdc2ff'
  on-primary-fixed: '#000965'
  on-primary-fixed-variant: '#2e3aa2'
  secondary-fixed: '#e2e2e5'
  secondary-fixed-dim: '#c6c6c9'
  on-secondary-fixed: '#1a1c1e'
  on-secondary-fixed-variant: '#454749'
  tertiary-fixed: '#e1e2e6'
  tertiary-fixed-dim: '#c5c6ca'
  on-tertiary-fixed: '#191c1f'
  on-tertiary-fixed-variant: '#44474a'
  background: '#121314'
  on-background: '#e3e2e3'
  surface-variant: '#343536'
typography:
  headline-sm:
    fontFamily: DM-sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: DM-sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-sm:
    fontFamily: DM-Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-small:
    fontFamily: DM-Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0em
  label-muted:
    fontFamily: DM-Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 12px
  container-margin: 20px
---

## Brand & Style

This design system is built for high-performance productivity and technical clarity. It prioritizes information density over white space, using a disciplined, structural approach to layout. The brand personality is stoic, professional, and precise, targeting power users who value speed and at-a-glance data consumption.

The aesthetic follows **Disciplined Minimalism**. It avoids the softness of traditional SaaS interfaces in favor of a flat, architectural feel. Every pixel must serve a functional purpose. The emotional response should be quiet confidence: a tool that stays out of the way until needed, providing order in complex workflows.

## Colors

The palette is strictly dark-mode centric, using a monochromatic range of deep charcoals and slate grays to establish hierarchy.

- **Background & Surface:** Use the deepest charcoal for the primary canvas. Secondary surfaces use subtle shifts in value rather than shadows to denote separation.
- **The Accent:** A single, restrained indigo is used sparingly. It is reserved for primary actions, focus states, and active indicators. It should never overwhelm the screen.
- **Functional Grays:** Slate grays differentiate content levels. Borders are essential in this system; they provide exactness where softer systems would use padding.

## Typography

This design system uses **DM Sans** for its systematic, utilitarian character. The typographic scale is compact to support high-density layouts.

- **Discipline:** Line heights are tight, usually 1.2x to 1.4x, to keep related data points grouped closely.
- **Section labels:** Use small, muted, sentence-case labels for sections or metadata groups. Avoid fully uppercase headers and increased tracking; they slow scanning in dense mobile views.
- **Alignment:** All text should align to a strict baseline grid. Monospaced numerals are preferred for tables and data displays to ensure vertical alignment across rows.

## Layout & Spacing

The layout is a **Fixed-Fluid Hybrid** grid. Use a 12-column grid for main dashboards, but prioritize a 4px baseline rhythm for component spacing.

- **Density:** Remove nested containers. Instead of placing a card inside a section inside a page, use hairline borders to separate zones directly on the primary surface.
- **Precision:** Padding is minimal. Elements should feel packed but organized. Use consistent 8px or 12px gaps between active elements.
- **Reflow:** On mobile, columns collapse to a single stack, but horizontal scrolling data strips are preferred over large vertical cards to maintain data density.

## Elevation & Depth

This design system rejects heavy shadows and traditional Z-axis elevation. Depth is achieved through **Tonal Layering** and **Low-Contrast Outlines**.

- **Flatness:** Active surfaces sit on the same plane as the background. Differentiation is created by 1px borders.
- **Active State:** When an element is focused or active, use the primary indigo accent as a 1px border or a subtle, low-opacity fill. Avoid glow on icon-only controls unless the active area itself needs emphasis.
- **Overlays:** Modals and menus use a slightly lighter surface with a subtle 1px border. Do not use backdrop blurs unless they are necessary for legibility over complex data.

## Shapes

The shape language is industrial and sharp.

- **Radius:** A consistent **4px to 6px** radius is applied to buttons, input fields, and containers. This is just enough to soften the edge while maintaining a disciplined, rectangular structure.
- **Consistency:** Avoid pill-shaped or fully rounded buttons unless the platform component requires it. Active elements should share the same geometric signature to reinforce predictability.

## Animations

Motion in this system is **fast, purposeful, and non-decorative**. Every animation must earn its existence by aiding orientation, confirming an action, or reducing cognitive load. Animations that merely add polish are not used.

### Principles

- **Speed over spectacle.** Transitions are short. Users should never wait for an animation to finish before interacting.
- **Physics, not timers.** Prefer spring-based motion over linear or cubic-bezier easing for anything the user initiates with a gesture. Springs make the UI feel responsive to intent.
- **No animation on data.** Lists that update due to a background fetch do not animate individual cells. Only user-initiated changes animate.
- **Reduce, then commit.** Respect the system `reduceMotion` accessibility flag. All animations must have a zero-duration fallback path.

### Timing Scale

| Name       | Duration | Use case                                      |
|------------|----------|-----------------------------------------------|
| `instant`  | 80ms     | Toggle states, checkbox fills, chip selection |
| `fast`     | 150ms    | Icon swaps, label transitions, badge updates  |
| `standard` | 220ms    | Sheet open/close, modal entry, drawer slide   |
| `deliberate` | 320ms  | Full-screen push navigation, onboarding steps |

Never exceed `320ms` for any transition triggered by a tap. Gestures use spring physics instead of a fixed duration.

### Easing Curves

| Token         | Curve                        | Use case                                  |
|---------------|------------------------------|-------------------------------------------|
| `ease-out`    | `cubic-bezier(0.0, 0, 0.2, 1)` | Elements entering the screen             |
| `ease-in`     | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving the screen               |
| `ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Crossfades, in-place transforms           |
| `spring`      | `{ damping: 26, stiffness: 200 }` | Gesture-driven surfaces (sheets, swipe) |

### Navigation Transitions

- **Push:** Incoming screen slides in from the right at `100%` → `0%` translateX, with the outgoing screen simultaneously translating to `-30%` and fading to `0.6` opacity. Duration: `deliberate` with `ease-out`.
- **Pop:** Reverse of push. The returning screen snaps back from `-30%` with a spring (`damping: 30, stiffness: 250`) so it tracks the swipe gesture velocity on release.
- **Modal / Bottom Sheet:** Sheet enters from `100%` translateY → `0%` with `standard` duration and `ease-out`. Dismissal uses spring physics to honor swipe velocity.
- **Tab switch:** Crossfade only — `fast` duration, `ease-in-out`. No translate; lateral motion implies hierarchy, which tabs do not have.

### List & Item Animations

- **Staggered list entry:** Used only on the first render of a list (e.g., search results appearing). Items animate in with a `4px` upward translate and opacity `0 → 1`, staggered `20ms` per item, capped at 6 items. Items beyond the 6th appear instantly. Duration per item: `fast`.
- **Row insertion:** A single new row expands its height from `0` to natural size in `standard` duration with `ease-out`. Do not animate surrounding rows.
- **Row deletion (swipe-to-delete):** Row slides out to trailing edge at gesture velocity using spring, then collapses height to `0` in `fast`. This is the only case where two sequential animations are chained.
- **Reorder:** Rows lift with a `1px` border highlight (primary indigo) and follow the drag with `0ms` latency. On drop, spring settles to final position (`damping: 22, stiffness: 180`).

### Micro-interactions

- **Button press:** Scale `1.0 → 0.97` on `touchStart`, back to `1.0` on `touchEnd`. Duration: `instant`. Use `spring` for the return.
- **Checkbox / Toggle:** Fill and border color transition in `instant`. The checkmark draws with a path stroke animation over `fast`.
- **Chip / Tag select:** Background and text color crossfade in `instant`. No scale or translate.
- **Loading skeleton:** Shimmer travels left-to-right over `1200ms` with a linear loop. Use a `20%` wide gradient highlight. Never use opacity pulsing as it causes layout reflow on some platforms.
- **Error shake:** Horizontal translate `0 → 4px → -4px → 2px → 0` over `300ms` linear. Triggered once; not looped.
- **Pull-to-refresh indicator:** Appears with opacity `0 → 1` over the first `40px` of overscroll. Spinner rotation is continuous at `1s` per revolution. The list snaps back to rest position using spring on release.

### Gesture-Driven Surfaces

All gesture-driven surfaces (sheets, swipeable rows, draggable cards) must:

1. **Track 1:1 with touch** — zero artificial lag on the initial movement.
2. **Clamp with resistance** — beyond the natural travel range, movement damps to `30%` of the finger delta.
3. **Commit by velocity, not position** — a fast flick always completes the gesture; a slow drag past the threshold also completes it. Combine both signals.
4. **Snap via spring** — on release, always animate to the final resting state using `{ damping: 26, stiffness: 200 }` seeded with the gesture's exit velocity.

### Platform Notes (React Native / Expo)

- Prefer `react-native-reanimated` (v3+) shared values and `withSpring` / `withTiming` for all animations. Keep animation logic on the UI thread.
- Use `Gesture.Pan()` from `react-native-gesture-handler` for all swipe and drag gestures. Compose gestures rather than nesting `PanResponder`.
- `LayoutAnimation` is acceptable only for height-collapse transitions on simple list rows where shared-element tracking is not needed.
- Set `useNativeDriver: true` on all `Animated.timing` and `Animated.spring` calls. If a property cannot use the native driver, redesign the animation.
- Honor `AccessibilityInfo.isReduceMotionEnabled()` — wrap all animation helpers in a check and return the final state immediately when `true`.

## Components

- **Buttons:** Compact height, usually 28px or 32px. Solid indigo for primary, ghost borders for secondary. Text is 13px medium.
- **Inputs:** Flat background with a 1px border. On focus, the border changes to indigo. Labels use the small muted label style in sentence case.
- **Chips/Tags:** Rectangular with a 2px to 4px radius. Low-contrast background with muted text. No icons unless they are 12px functional glyphs.
- **Lists:** High-density rows, usually 32px to 40px height. Separated by 1px borders. Use quiet inline actions to keep the UI calm.
- **Data Grids:** No cell borders; use row borders only. Headers use the small muted label style in sentence case. Content uses `body-sm`.
- **Navigation:** Back chevrons should be icon-only with no surrounding border. Use hit slop for touch comfort rather than visible chrome.
- **Command Menu:** A floating, 1px bordered search surface that prioritizes keyboard shortcuts and list-based navigation.
