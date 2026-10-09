# Angat Design System

- Status: active
- Date: 2026-10-09
- Scope: `apps/buddy` (every screen, component, and app asset)

This is the design contract for the Angat app. Read it before you build or change any UI. If a screen needs something this file does not cover, add the rule here in the same change.

**Source of truth.** Exact values live in code, in [`apps/buddy/src/theme/tokens.ts`](../../apps/buddy/src/theme/tokens.ts). This file explains how to use them. If the two disagree, the code is right and this file must be fixed. Change both in the same commit.

---

## 1. Brand

**Angat** (Filipino: "to rise, to lift up") is a self-improvement app. Small daily quests help you level up in real life.

- **Angat** is the product and brand. **Buddy** is the mascot and AI companion inside it. Do not use "Buddy" as the app name.
- **Feel:** uplifting, calm, and confident. Game-like (XP, levels, quests) but never childish or loud.
- **Core motif:** the folded "A" with an upward arrow cut out. Rising, upward motion is the brand's visual idea. Use it in motion (things rise in) and decoration (rising ribbons), not as extra clip-art.

## 2. Logo

| Asset | File | Use |
| --- | --- | --- |
| Wordmark (ANGAT) | `assets/images/angat-wordmark.png` | Landing page, splash, places where the brand is introduced |
| Mark (the "A") | `assets/images/angat-mark.png` | Compact spots: screen headers, badges, splash |
| Originals | `angat-logo.png`, `angat-icon.png` | Source art only. Do not use in UI (large transparent padding). |
| App icon / splash / favicon | `icon.png`, `android-icon-*.png`, `splash-icon.png`, `favicon.png` | Generated from the mark on white. Regenerate from the originals if the mark changes. |

**Always render logos through `<BrandLogo />`** ([`src/components/brand-logo.tsx`](../../apps/buddy/src/components/brand-logo.tsx)). It keeps the aspect ratio and sets the accessibility label.

```tsx
<BrandLogo height={26} />                 // wordmark
<BrandLogo variant="mark" height={28} />  // the "A"
```

Rules:

- **Minimum height:** wordmark 20 pt, mark 16 pt.
- **Clear space:** at least half the logo's height on every side.
- **Backgrounds:** use the logo on white or `surfaceAlt` only. On the brand gradient, put the mark inside a white circle badge (see the landing page hero). Never put it directly on blue.
- **Do not** recolor, tint, outline, stretch, rotate, add shadows, or re-type "ANGAT" in a font as a substitute for the wordmark.

## 3. Color

The app is **light-only**: white background and shades of blue taken from the logo. `useTheme()` always returns the one palette, and `app.json` sets `userInterfaceStyle: "light"`. Do not add a dark mode without a decision record.

### 3.1 Theme colors (`colors`)

| Token | Hex | Use |
| --- | --- | --- |
| `background` | `#FFFFFF` | Every screen background. Always white. |
| `surface` | `#FFFFFF` | Cards, tiles, inputs (separated by `border`) |
| `surfaceAlt` | `#EEF5FF` | Quiet fills: muted cards, unselected segments, feature tiles, speech bubbles, icon buttons |
| `text` | `#0B1F5C` | Primary text (deep navy from the logo lettering) |
| `textMuted` | `#4B5D8A` | Secondary text, captions, inactive icons |
| `primary` | `#0047D9` | The brand blue: primary buttons, selection, active tab, links, progress |
| `onPrimary` | `#FFFFFF` | Text and icons on `primary` or the brand gradient |
| `accent` | `#006BB8` | Sky-blue accent: XP, levels, rewards, tips |
| `accentSoft` | `#E3F3FF` | Background behind `accent` content |
| `success` | `#0B6E99` | Done, saved, private/secure states |
| `successSoft` | `#E0F2FA` | Background behind `success` content |
| `border` | `#D6E3FB` | Card and input borders, dividers, unselected outlines |
| `glow` | `rgba(0, 71, 217, 0.14)` | Soft blue fill: radar shape, pulse rings, focus glow |
| `shadow` | `#001A66` | Shadow tint for elevated elements |
| `danger` | `#B42318` | Errors and destructive actions **only**. The one non-blue color, kept red so errors are never missed. |

### 3.2 Brand gradient (`brandGradient`)

| Token | Hex | Use |
| --- | --- | --- |
| `deep` | `#0033C4` | Gradient start (top-left) |
| `royal` | `#0A5BE8` | Gradient end (bottom-right) |
| `sky` | `#00A6F0` | Decorative ribbons only. **Never** behind text: white on sky fails contrast. |

Use the gradient only through `<GradientPanel>`, and only for **hero moments**: the top of the landing page, a result reveal, a level-up. Use at most one gradient panel per screen. Text on it uses `color="onPrimary"`.

### 3.3 Life-area colors (`areaColors`)

There are eight blue-family mid-tones, one per life area (Focus `#2563EB`, Creativity `#5865E0`, Knowledge `#0E7490`, Social `#1C74D9`, Finance `#3B5BDB`, Calm `#5A6FC8`, Health `#0369A1`, Organization `#3366CC`).

- Always pair an area color with the area's **icon and text label**. The colors are close by design, so color is never the only signal.
- Area icon chip: the icon in the area color on a 10% tint of the same color (`` `${color}1A` ``), 30 pt circle.
- Text on a filled area color uses `onPrimary`.

### 3.4 Color rules

1. **No raw hex or rgba in screens or components.** Use `colors.*`, `brandGradient.*`, or `areaColors.*`. Exceptions: illustration internals (Buddy mascot art, gradient ribbon opacity).
2. **No new hues.** No purple, green, orange, or yellow. Red (`danger`) is for errors only.
3. **Contrast:** body text needs at least 4.5:1, and large text and icons at least 3:1. All current text tokens pass on `background`, `surface`, and `surfaceAlt`. Check any new color before adding it.
4. Need a new color? Add a token in `tokens.ts`, document it in the table above, and check its contrast.

## 4. Typography

The platform system font, used through `<AppText variant=... color=...>`. Do not set `fontSize` or `fontWeight` by hand.

| Variant | Size / line height | Weight | Use |
| --- | --- | --- | --- |
| `hero` | 34 / 40, −0.5 tracking | 800 | One per screen: landing headline, onboarding page title, result title |
| `display` | 28 / 34 | 800 | Main screen headings (e.g. Today greeting) |
| `title` | 20 / 26 | 700 | Card titles, question prompts |
| `body` | 16 / 22 | 400 | Default text |
| `bodyStrong` | 16 / 22 | 600 | Button labels, option labels, emphasized lines |
| `caption` | 13 / 18 | 500 | Hints, metadata, chips, legends |
| `overline` | 11 / 14, 1.2 tracking | 700 | Uppercase section labels and eyebrows (`STEP 2 OF 4`). Pass text `.toUpperCase()`. |

- Use **sentence case** everywhere except overlines.
- An **eyebrow pattern** introduces key screens: `overline` in `primary`, then a `hero` title, then a `body` subtitle in `textMuted`.

## 5. Spacing, radius, elevation

**Spacing** (`spacing`): `xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32`. Use only these.

- Screen side gutter is `lg` (16). The vertical gap between screen sections is `lg` (16), and `xl` (24) between onboarding question groups.
- Content max width is 640 (`<Screen>` handles this).

**Radius** (`radius`): `sm 8` (small badges, checkboxes), `md 14` (tiles, inputs, notices), `lg 20` (cards), `lg + 8` = 28 (gradient panels), `pill` (buttons, chips, progress bars, avatars).

**Elevation:** the app is mostly flat. Separate things with `border` and `surfaceAlt` fills, not shadows. Shadows are reserved for:

- `Card tone="status"` (blue glow, highlights one call-to-action card)
- Floating elements on the gradient (e.g. the Buddy halo), tinted with `colors.shadow`

## 6. Iconography

- **Ionicons** (`@expo/vector-icons/Ionicons`) only.
- Use **outline** icons by default. Use **filled** icons for active, selected, or celebratory states (`checkmark-circle`, `flash`, `flame`, `star`).
- Sizes: 13–16 inside chips and badges, 18–22 inline with text, 24 for header actions.
- Icons take a theme color. A meaningful icon needs an `accessibilityLabel`, or sits next to text that says the same thing.

## 7. Components

Use the shared component when one exists. Do not restyle it per screen.

| Component | File | Rules |
| --- | --- | --- |
| `Screen` | `components/screen.tsx` | Every screen's root. Applies the white background, safe area, gutter, and max width. Tabs use `edges={['top']}`. Full-screen flows use `['top', 'bottom']`. |
| `AppText` | `components/app-text.tsx` | All text. |
| `Button` | `components/button.tsx` | Pill shape. `primary` (filled blue) is the one main action per screen, at the bottom. `secondary` uses a `surfaceAlt` fill, and `ghost` is a text-only button (Skip, minor actions). Minimum height 48 (`md`) or 36 (`sm`). |
| `Card` | `components/card.tsx` | `default` is white with a border, `muted` uses a `surfaceAlt` fill, and `status` adds a blue border and glow (one per screen, for the call to action). |
| `GradientPanel` | `components/gradient-panel.tsx` | Brand hero panel (section 3.2). |
| `BrandLogo` | `components/brand-logo.tsx` | Logo rendering (section 2). |
| `PulseRings` | `components/pulse-rings.tsx` | Rippling blue rings for "working" and intro moments (splash, analysis). `loop={false}` for one-time intros. |
| `Chip` | `components/chip.tsx` | Compact pill toggles. For question answers, prefer option tiles. |
| `Segmented` | `components/segmented.tsx` | Two-to-four-way view switches. |
| `ProgressBar` | `components/progress-bar.tsx` | XP and stat bars. `primary` by default, `accent` for XP, the area color for stats. |
| `SectionHeader` | `components/section-header.tsx` | Overline section label with an optional right-side action. |
| `OnDeviceBadge` | `components/on-device-badge.tsx` | Shows that work runs on the device. |
| `Toast` | `components/toast.tsx` | Short, non-blocking confirmations. |
| `BuddyMascot` | `components/buddy-mascot.tsx` | Moods: `happy`, `thinking`, `celebrating`, `sleepy`. Match the mood to the state (loading → thinking, offline → sleepy, success → celebrating). |

**Patterns currently local to `onboarding/questions.tsx`.** Move them to `components/` the first time another screen needs them:

- **Option tile:** a two-column grid of white tiles (radius `md`, 1.5 border). Selected tiles get a `primary` border, a `surfaceAlt` fill, and a filled indicator. A radio dot means single choice and a rounded checkbox means multiple choice. At the selection limit, unselected tiles dim to 45%.
- **Rating meter:** five joined segments that fill in the area color up to the chosen value, with a "4/5" or "Not rated" readout.
- **Step progress:** segmented bars that fill with `primary` as pages are reached.

**Notices** (status or error messages inside a screen): a `surfaceAlt` fill, a `border`, radius `md`, and an icon on the left (`primary` for info, `danger` for errors). Set `accessibilityLiveRegion="polite"`.

## 8. Screen anatomy

```
┌──────────────────────────────┐
│ Header: back · progress · ⋯  │  icon buttons are 40 pt circles on surfaceAlt
│                              │
│ [GradientPanel hero]         │  optional, at most one per screen
│ OVERLINE (primary)           │
│ Hero / display title         │
│ Subtitle (textMuted)         │
│                              │
│ Content: cards, tiles, lists │  gap lg; group with SectionHeader
│                              │
│ ─────────────────────────────│
│ [  Primary action  ]         │  one filled button, bottom of the screen
└──────────────────────────────┘
```

- One primary action per screen. Secondary actions are `ghost` or `secondary`.
- Buddy speaks through a speech bubble (`surfaceAlt`, radius `lg`, square-ish bottom-left corner) next to a small mascot.

## 9. Motion

Motion should feel like **rising**: elements enter from slightly below and settle.

| Use | Spec |
| --- | --- |
| Screen sections entering | `FadeInDown.duration(450–500)`, staggered by `delay(150)` steps |
| Page-to-page (onboarding) | `FadeInRight` / `FadeInLeft`, 280 ms |
| State fills (progress, selection) | `withTiming`, 300–350 ms |
| Brand intro (splash) | The mark rises 48 pt and scales to 0.88 over 700 ms (`Easing.out(Easing.cubic)`), then the wordmark fades up; about 2.1 s total |
| Idle "alive" motion | Gentle bob, up to 8 pt, 1.6 s, `Easing.inOut(Easing.sin)`, looping |
| Press feedback | Opacity 0.8, scale 0.98 for tiles |

Rules:

- **Respect Reduce Motion.** Check `useReducedMotion()` from `react-native-reanimated`, then skip loops, rings, and travel, and use short fades only. Every new animation must handle this.
- Use Reanimated shared values with `.get()` / `.set()` (the React Compiler is on).
- Never block the user with animation. Intros are 2.1 s or less and never gate an action that is already available.

## 10. Voice and copy

- All strings go in [`src/i18n/en.ts`](../../apps/buddy/src/i18n/en.ts) and are read with `t()`. No inline user-facing strings.
- **Buddy speaks in the first person**, warmly and briefly: "Last page! Anything I should keep in mind?"
- **The app speaks plainly**, in second person, in sentence case. Keep it short: one idea per line.
- Encourage; never shame. Use no medical or diagnostic language. Insights are "Buddy's read on you, not a diagnosis."
- **Be honest about state:** say when something is offline, queued, not yet synced, or preview data. Never claim something synced before it is confirmed (see the root `AGENTS.md`).

## 11. Accessibility

- Touch targets are at least 44 pt (use `hitSlop` for smaller visuals).
- Give every interactive element `accessibilityRole` and `accessibilityLabel`, and `accessibilityState` for selected or checked items. Options use `radio` or `checkbox`, and ratings use a `radiogroup`.
- Mark screen titles with `accessibilityRole="header"`.
- Never use color alone as a signal. Pair it with an icon, text, or a fill change.
- Contrast rules are in section 3.4. Motion rules are in section 9.

## 12. Local-first status UI

Offline is a normal state, not an error. Make it visible and calm:

- Show "on device" or "preview" state with `OnDeviceBadge`.
- Show offline, queued, or pending sync with a notice (`cloud-offline-outline` icon, `primary` color, and the sleepy Buddy where Buddy is shown), plus a retry action when one exists.
- Use `danger` only for real failures the user must act on.

## 13. New-screen checklist

- [ ] The root is `<Screen>`, the background is white, and there is one primary action.
- [ ] It uses only tokens: no raw hex, font sizes, or spacing numbers outside `spacing`.
- [ ] Title and hierarchy use the `AppText` variants. At most one `hero`.
- [ ] The gradient appears only through `GradientPanel`, at most once per screen.
- [ ] Logos render through `BrandLogo`.
- [ ] Animations follow section 9 and handle Reduce Motion.
- [ ] Strings are in `en.ts`, and Buddy's lines are in the first person.
- [ ] Accessibility roles, labels, and states are set. Targets are 44 pt or larger.
- [ ] Offline, queued, and sync states are visible where the screen depends on the network.

## 14. Current status and known gaps

The rules above apply to all new work. The app does not follow all of them yet:

- **Fully on-system:** the splash (`app/index.tsx`), the landing page (`onboarding/index.tsx`), the questions (`onboarding/questions.tsx`), and the analysis screen (`onboarding/analysis.tsx`).
- **Colors updated, layout not yet restyled:** Today, Quests, Player, Ask Buddy, Notes, Settings, and Check-in. They use the new tokens through the shared components but have not adopted the eyebrow, hero, and motion patterns.
- **Buddy mascot** is placeholder art (see the comment in `buddy-mascot.tsx`).
- **Google button** uses the Ionicons `logo-google` glyph in a brand-blue button. Before a store release, check it against Google's sign-in branding guidelines.
- **Native icon and splash changes** appear only in a new development build, not in Expo Go.
