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
  label-caps:
    fontFamily: DM-Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.06em
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

This design system is built for high-performance productivity and technical clarity. It prioritizes information density over white space, using a disciplined, structural approach to layout. The brand personality is stoic, professional, and precise, targeting power users who value speed and "at-a-glance" data consumption.

The aesthetic follows a **Disciplined Minimalism**. It avoids the softness of traditional SaaS DM-Sans faces in favor of a flat, architectural feel. Every pixel must serve a functional purpose. The emotional response should be one of quiet confidence—a tool that stays out of the way until needed, providing a sense of order in complex workflows.

## Colors

The palette is strictly dark-mode centric, utilizing a monochromatic range of deep charcoals and slate grays to establish hierarchy. 

- **Background & Surface:** Use the deepest charcoal for the primary canvas. Secondary surfaces use subtle shifts in value rather than shadows to denote separation.
- **The Accent:** A single, restrained indigo is used sparingly. It is reserved for primary actions, focus states, and active indicators. It should never overwhelm the screen.
- **Functional Grays:** Slate grays are used to differentiate content levels. Borders are essential in this system; they provide the "exactness" that padding usually handles in softer systems.

## Typography

This design system utilizes **DM-Sans** for its systematic, utilitarian character. The typographic scale is compact to support high-density layouts.

- **Discipline:** Line heights are tight (1.2x to 1.4x) to keep related data points grouped closely. 
- **The "Eyebrow":** Small, uppercase labels with increased tracking are used as headers for sections or metadata groups. This creates a clear "anchor" for the eye without requiring large font sizes.
- **Alignment:** All text should align to a strict baseline grid. Monospaced numerals are preferred for tables and data displays to ensure vertical alignment across rows.

## Layout & Spacing

The layout is a **Fixed-Fluid Hybrid** grid. Use a 12-column grid for main dashboards, but prioritize a 4px baseline rhythm for DM-Sans component spacing.

- **Density:** Remove nested containers. Instead of placing a card inside a section inside a page, use hair-line borders to separate zones directly on the primary surface.
- **Precision:** Padding is minimal. Elements should feel "packed" but organized. Use consistent 8px or 12px gaps between DM-Sans active elements.
- **Reflow:** On mobile, columns collapse to a single stack, but horizontal scrolling "data-strips" are preferred over large vertical cards to maintain data density.

## Elevation & Depth

This design system rejects heavy shadows and traditional Z-axis elevation. Depth is achieved through **Tonal Layering** and **Low-Contrast Outlines**.

- **Flatness:** DM-Sans active surfaces sit on the same plane as the background. Differentiation is created by 1px borders (#26282a).
- **Active State:** When an element is focused or active, use the primary indigo accent as a 1px border or a subtle 2px "glow" (0px blur, 2px spread) to maintain the "Exact" aesthetic.
- **Overlays:** Modals and menus use a slightly lighter surface (#1a1c1e) with a subtle 1px border. Do not use backdrop blurs unless they are necessary for legibility over complex data.

## Shapes

The shape language is industrial and sharp.

- **Radius:** A consistent **4px to 6px** radius is applied to buttons, input fields, and containers. This is just enough to soften the "brutalist" edge while maintaining a disciplined, rectangular structure.
- **Consistency:** Never use pill-shaped or fully rounded buttons. All DM-Sans active elements must share the same geometric signature to reinforce the system's predictability.

## Components

- **Buttons:** Compact height (28px or 32px). Solid indigo for primary, ghost borders for secondary. Text is 13px Medium.
- **Inputs:** Flat background with a 1px border. On focus, the border changes to indigo. Labels are always "Eyebrow" style (uppercase, muted).
- **Chips/Tags:** Rectangular with a 2px radius. Low-contrast background (slightly lighter than the surface) with muted text. No icons unless they are 12px functional glyphs.
- **Lists:** High-density rows (32px to 40px height). Separated by 1px borders. Use "hover-reveal" actions to keep the UI quiet when not being DM-Sans acted with.
- **Data Grids:** No cell borders; use row borders only. Headers are "Eyebrow" style. Content uses `body-sm`.
- **Command Menu:** A central component for the design system. A floating, 1px bordered search DM-Sans face that prioritizes keyboard shortcuts and list-based navigation.