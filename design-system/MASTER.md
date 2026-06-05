# Ragauti — Design System MASTER

> Global Source of Truth. Page-specific overrides live in `design-system/pages/`.
> Generated from ui-ux-pro-max + brainstorming session 2026-06-04.

---

## Style: Nature Distilled

Muted earthy tones, terracotta accent, parchment backgrounds, warm organic feel.
Handmade warmth — feels like a personal recipe notebook, not a tech product.

**Anti-patterns to avoid:**
- No harsh whites (#FFFFFF pure) — always warm cream
- No cool greys — use warm tones only
- No dark mode — this app is warm light only
- No emoji as UI icons — use Lucide React SVG icons
- No scale transforms on hover — use color/opacity only

---

## Color Palette

| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#fdf6ee` | Page background, tab bar background |
| `bg-card` | `#fffaf5` | Cards, list rows, detail panels |
| `bg-surface` | `#f5ebe0` | Input backgrounds, tags, chips, image placeholders |
| `border` | `#e8ddd0` | All borders, dividers |
| `accent` | `#c0703a` | Primary buttons, active states, FAB, links, stars |
| `accent-hover` | `#a85f2e` | Button hover state |
| `text-primary` | `#2c1a0e` | Headings, labels, primary text |
| `text-secondary` | `#a08060` | Subtext, metadata, placeholder text |
| `text-muted` | `#c4a882` | Disabled states, empty slot hints |
| `destructive` | `#dc2626` | Delete actions, error states |
| `success` | `#16a34a` | Save confirmations, success toasts |

### Tailwind Config Extension

```js
// tailwind.config.ts
colors: {
  warm: {
    base:      '#fdf6ee',
    card:      '#fffaf5',
    surface:   '#f5ebe0',
    border:    '#e8ddd0',
    accent:    '#c0703a',
    'accent-hover': '#a85f2e',
    primary:   '#2c1a0e',
    secondary: '#a08060',
    muted:     '#c4a882',
  }
}
```

---

## Typography

**Pairing: Wellness Calm** — Lora (serif headings) + Raleway (sans body)

| Role | Font | Weight | Size |
|---|---|---|---|
| App name / Hero | Lora | 700 | 24px |
| Section headings | Lora | 600 | 18–20px |
| Card titles | Raleway | 600 | 14–16px |
| Body text | Raleway | 400 | 16px (min on mobile) |
| Meta / labels | Raleway | 500 | 12–13px |
| Tiny labels | Raleway | 700 uppercase | 9–10px |

```html
<!-- Google Fonts import -->
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Raleway:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

```js
// tailwind.config.ts
fontFamily: {
  serif: ['Lora', 'Georgia', 'serif'],
  sans:  ['Raleway', 'system-ui', 'sans-serif'],
}
```

**Rules:**
- Body text minimum 16px on mobile (never smaller)
- Line height 1.5–1.75 for body paragraphs
- Ingredient/instruction text: Raleway 400, 15px, line-height 1.7
- Section labels: Raleway 700 UPPERCASE, 9–10px, `text-warm-secondary` — spacing 0.08em

---

## Spacing & Layout

- **Safe area:** `pb-[env(safe-area-inset-bottom)]` on bottom tab bar (iPhone notch)
- **Tab bar height:** 60px + safe area inset
- **FAB clearance:** always positioned `bottom-[76px]` (above 60px tab bar + 16px gap)
- **Page padding:** `px-4` (16px) horizontal, `pt-4` top
- **Card gap:** `gap-3` (12px) in grids
- **Section spacing:** `mt-6` between major sections
- **Max content width:** none — full bleed on mobile, `max-w-lg mx-auto` on desktop

---

## Touch & Interaction (CRITICAL)

- **Minimum tap target:** 44×44px on every interactive element (`min-h-[44px] min-w-[44px]`)
- **Touch spacing:** minimum `gap-2` (8px) between adjacent tap targets
- **Tap delay:** add `touch-action: manipulation` to buttons (removes 300ms delay)
- **No hover-only interactions** — every hover state has an equivalent tap state
- **Pull to refresh:** disabled (`overscroll-behavior: contain`) — use manual refresh
- **Tap feedback:** use `active:opacity-80` or `active:scale-[0.98]` for button press feel

---

## Component Patterns

### Buttons

```tsx
// Primary (accent fill)
<button className="bg-warm-accent text-white font-sans font-600 text-sm px-4 py-3 rounded-lg min-h-[44px] active:opacity-80 transition-opacity duration-150 touch-manipulation">
  Label
</button>

// Secondary (outline)
<button className="border border-warm-border text-warm-primary font-sans font-500 text-sm px-4 py-3 rounded-lg min-h-[44px] bg-warm-card active:bg-warm-surface transition-colors duration-150">
  Label
</button>

// Destructive
<button className="text-red-600 font-sans font-500 text-sm px-4 py-3 min-h-[44px]">
  Delete
</button>
```

### Cards (Recipe Grid)

```tsx
<div className="bg-warm-card border border-warm-border rounded-xl overflow-hidden cursor-pointer active:opacity-90 transition-opacity duration-150">
  <div className="aspect-square bg-warm-surface">
    <img className="w-full h-full object-cover" loading="lazy" alt="..." />
  </div>
  <div className="p-3">
    <h3 className="font-sans font-600 text-warm-primary text-sm leading-snug line-clamp-2">Title</h3>
    <p className="font-sans text-warm-secondary text-xs mt-1">30 min · ★★★★★</p>
  </div>
</div>
```

### Inputs

```tsx
<input className="w-full bg-warm-surface border border-warm-border rounded-lg px-3 py-3 text-warm-primary font-sans text-base placeholder:text-warm-muted focus:outline-none focus:border-warm-accent transition-colors min-h-[44px]" />
```

### Section Label

```tsx
<span className="font-sans font-700 text-warm-secondary text-[10px] uppercase tracking-wider">
  LABEL
</span>
```

### Pill / Tag

```tsx
<span className="bg-warm-surface text-warm-secondary font-sans text-xs px-2 py-1 rounded-full">
  Italian
</span>
```

### Bottom Sheet

Open/close with `translate-y-full` → `translate-y-0`, `transition-transform duration-300 ease-out`.
Overlay: `bg-warm-primary/30 backdrop-blur-sm`.
Handle: `w-8 h-1 bg-warm-border rounded-full mx-auto mb-4`.

---

## Icons

**Library:** Lucide React (`lucide-react`) — consistent 24px viewBox, stroke-based.
**Size:** `w-5 h-5` (20px) standard, `w-4 h-4` (16px) inline metadata.
**Color:** inherit from text color via `currentColor`.
**Never** use emoji as icons in UI chrome.

Key icons used:
- `BookOpen` — Recipes tab
- `CalendarDays` — Planner tab
- `ShoppingCart` — Grocery tab
- `Settings` — Settings tab
- `Plus` — FAB
- `Heart` / `HeartFilled` — Favourite toggle
- `Search` — Search bar
- `ChevronLeft` / `ChevronRight` — Week navigation
- `Sparkles` — Extract button (Gemini)
- `X` — Close / dismiss
- `Trash2` — Delete
- `Pencil` — Edit
- `Star` — Rating

---

## Animation

- **Micro-interactions:** 150–200ms, `ease-out`
- **Sheet slide-up:** 300ms, `ease-out`
- **Page transitions:** none (instant) — keep it fast
- **Loading states:** `animate-pulse` skeleton on `bg-warm-surface` placeholders
- **Prefers-reduced-motion:** wrap all non-essential animations:
  ```css
  @media (prefers-reduced-motion: reduce) {
    * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
  }
  ```

---

## Z-Index Scale

| Layer | Z-index | Usage |
|---|---|---|
| Base content | 0 | Normal page flow |
| Sticky elements | 10 | Sticky jump bar, sticky headers |
| FAB | 20 | Floating action button |
| Tab bar | 30 | Bottom navigation |
| Overlay | 40 | Sheet backdrop |
| Sheet / Dialog | 50 | Bottom sheets, modals |
| Toast | 60 | Notifications |

---

## Accessibility

- All images: descriptive `alt` text (recipe name for food images, `alt=""` for decorative)
- All icon-only buttons: `aria-label`
- Form inputs: `<label>` with `htmlFor` on every input
- Focus rings: `focus-visible:ring-2 focus-visible:ring-warm-accent focus-visible:ring-offset-2`
- Color contrast: all text combinations meet 4.5:1 minimum against their backgrounds
- Tab order: matches visual reading order (top-to-bottom, left-to-right)

---

## React Stack Guidelines

- **State:** `useState` for local UI state; TanStack Query for all server state — no `useEffect` for data fetching
- **Avoid unnecessary state:** derive values in render rather than storing them
- **Memoization:** `useMemo` / `useCallback` only when profiling shows a real problem — not preemptively
- **Component size:** if a component exceeds ~150 lines, split it
- **Images:** `loading="lazy"` on all recipe images; explicit `width`/`height` to prevent layout shift
- **List rendering:** all lists need stable `key` props (use database `id`, never array index)
- **Forms:** controlled inputs with `value` + `onChange`; no uncontrolled refs unless file inputs

---

## Pre-Delivery Checklist

- [ ] No emojis used as UI icons (use Lucide React)
- [ ] All tap targets ≥ 44×44px
- [ ] `touch-action: manipulation` on all buttons
- [ ] `cursor-pointer` on all interactive elements
- [ ] Hover states use color/opacity only (no scale shifts)
- [ ] `loading="lazy"` on all images
- [ ] All images have `alt` text
- [ ] All icon-only buttons have `aria-label`
- [ ] Focus rings visible (`focus-visible:ring-*`)
- [ ] FAB clears tab bar (bottom-[76px])
- [ ] Safe area padding on tab bar
- [ ] Transitions ≤ 300ms
