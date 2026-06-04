# Ragauti — Part 1 (Classic Mode) Design Spec

**Date:** 2026-06-04
**Scope:** Part 1 only. Do not begin Part 2 (Chat mode) until explicitly instructed.

---

## 1. Product Summary

Ragauti is a mobile-first personal recipe manager for Ignas and his wife. Users save recipes (via URL scraping or manually), rate and categorise them, plan meals for the week, and generate a grocery list from the plan. All data is private per user. No social features.

---

## 2. Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Auth + DB | Supabase (Google OAuth, PostgreSQL, Row-Level Security) |
| Hosting | Vercel |
| AI | Gemini 1.5 Flash — client-side, user's own API key |
| State / data fetching | TanStack Query |
| PWA | Vite PWA plugin (`vite-plugin-pwa`) |

---

## 3. Visual Design

**Style:** Warm Light — cream/parchment backgrounds, warm brown text, terracotta (`#c0703a`) accent, soft warm borders.

| Token | Value |
|---|---|
| `bg-base` | `#fdf6ee` |
| `bg-card` | `#fffaf5` |
| `bg-surface` | `#f5ebe0` |
| `border` | `#e8ddd0` |
| `text-primary` | `#2c1a0e` |
| `text-secondary` | `#a08060` |
| `text-muted` | `#c4a882` |
| `accent` | `#c0703a` |

All interactions must work one-handed on a phone. Minimum tap target: 44px.

---

## 4. App Shell & Navigation

**Bottom tab bar** (4 tabs): Recipes · Planner · Grocery · Settings.

**Context-aware pill FAB** floats just above the tab bar, right-aligned. Never overlaps the tab bar. Changes per active tab:

| Tab | FAB label |
|---|---|
| Recipes | + Add recipe |
| Planner | + Add to plan |
| Grocery | + Add item |
| Settings | hidden |

Routing: React Router. Protected routes redirect to `/login` if no Supabase session.

---

## 5. Data Model

All tables have `user_id uuid references auth.users` and RLS policy `user_id = auth.uid()` on all operations.

### `profiles`
```
id            uuid  primary key (= auth.uid())
gemini_api_key text  nullable
created_at    timestamptz
```
Created automatically on first Google login via Supabase Auth trigger.

### `recipes`
```
id            uuid  primary key
user_id       uuid
title         text  not null
ingredients   text  (free text, one ingredient per line)
instructions  text
image_url     text  nullable
cook_time_mins  int nullable
prep_time_mins  int nullable
servings      int   nullable
rating        int   nullable  (1–5)
categories    text[]
comments      text  nullable
is_favourite  bool  default false
source_url    text  nullable
created_at    timestamptz
updated_at    timestamptz
```

### `meal_plan_slots`
```
id          uuid  primary key
user_id     uuid
slot_date   date  not null
meal_type   text  not null  ('lunch' | 'dinner')
recipe_id   uuid  references recipes
created_at  timestamptz
unique (user_id, slot_date, meal_type)
```

### `grocery_items`
```
id               uuid  primary key
user_id          uuid
week_start       date  not null  (Monday of the target week)
recipe_id        uuid  references recipes  nullable  (null = manual item)
ingredient_text  text  not null
is_checked       bool  default false
sort_order       int
created_at       timestamptz
```

---

## 6. Environment Variables

```
VITE_SUPABASE_URL        Supabase project URL
VITE_SUPABASE_ANON_KEY   Supabase publishable (anon) key
VITE_GOOGLE_CLIENT_ID    Google OAuth client ID
VITE_GEMINI_API_KEY      Your own Gemini key — local dev/testing only
```

`VITE_GEMINI_API_KEY` is only used in local development to test extraction without requiring a real user account. It must never be used in production code paths. In production, the Gemini key always comes from `profiles.gemini_api_key` fetched from Supabase.

---

## 7. Gemini API Key

- Stored in `profiles.gemini_api_key`, never in localStorage or env vars.
- Fetched once on app load, held in a React context (`GeminiKeyContext`).
- Any feature that requires the key checks this context. If null, it renders a **GeminiKeyBanner** component: _"Add your Gemini API key in Settings to enable AI features."_ The banner links directly to the Settings tab.
- No server-side Gemini calls. All requests are client-to-Gemini-API directly.

---

## 8. Build Slices

Each slice is independently testable on a real device before starting the next.

### Slice 1 — Auth + App Shell
- Google OAuth login page (Supabase `signInWithOAuth`)
- On first login: create `profiles` row
- App shell: tab bar, FAB, routing
- Protected route wrapper

### Slice 2 — Recipe CRUD
- **Add/Edit form:** title, ingredients (textarea), instructions (textarea), image (URL or device camera/file upload via `<input type="file" accept="image/*" capture="environment">`), rating (1–5 star tap), categories (free text, pick from existing), cook time, prep time, servings, comments
- **Recipe list:** 2-column grid. Each card: image, title, cook time, rating. Favourite heart overlay.
- **Recipe detail:** sticky jump bar (Ingredients · Instructions · Notes), serving scaler (multiplier buttons, best-effort regex on quantities), favourite toggle, edit/delete actions
- **Delete:** confirmation dialog before deletion

### Slice 3 — URL Scraping
- URL field at top of add form with "Extract ✨" button
- On extract: call Gemini 1.5 Flash with the URL, ask it to return structured JSON (title, ingredients, instructions, image_url, cook_time_mins, prep_time_mins, servings)
- Pre-fill matched form fields; show disclaimer banner if any fields are missing: _"Some fields couldn't be extracted — please review before saving."_
- **Clipboard auto-detect:** when the add form mounts, call `navigator.clipboard.readText()`. If it contains a URL, show a banner: _"Found a link in your clipboard — extract recipe?"_
- **PWA Share Target:** `manifest.json` registers `/share-target` as a share target (`method: GET`, `url_template: /share-target?url={url}`). The `/share-target` route pre-fills the URL field and immediately triggers extraction.
- GeminiKeyBanner shown instead of Extract button if key is not set.

### Slice 4 — Search & Filter
- Search bar: full-text across title, ingredients, instructions, comments (client-side filter on loaded recipes)
- Filter chips: minimum star rating, category (multi-select), favourites only
- All filters compose simultaneously
- Active filters shown as dismissible chips below the search bar
- No pagination — filter is navigation

### Slice 5 — Meal Planner
- 7-day vertical grid, 3-column layout: day/date | Lunch | Dinner
- Week navigation: prev/next arrows, shows Mon–Sun of the selected week, defaults to current week
- Empty slot: shows `+` button. Tap → recipe picker sheet (searchable list of user's recipes)
- Filled slot: shows recipe emoji + truncated name. Tap → mini recipe sheet (title, ingredients, servings, link to full recipe). Option to remove from slot.
- FAB on Planner tab: "+ Add to plan" → opens day picker then recipe picker

### Slice 6 — Grocery List
- "Generate grocery list" button (also accessible from Planner tab FAB area and bottom of planner view)
- If a list already exists for the current week: confirmation dialog before regenerating
- Generated list: ingredients grouped by recipe, recipe name as section header, items as checkable rows (tap to check = strike-through)
- "Added manually" section at the bottom for items not tied to a recipe
- FAB on Grocery tab: "+ Add item" → inline text input appended to manual section
- Checked items remain in-place with strike-through (easier to uncheck at the store)

### Slice 7 — Settings + PWA
- Gemini API key: masked text input, save button, success/error feedback
- Google account display: avatar + name (read-only, from Supabase session)
- Sign out button
- `manifest.json`: name "Ragauti", `theme_color: #fdf6ee`, `background_color: #fdf6ee`, share target config, app icons
- PWA install prompt: shown once, dismissible

---

## 8. Error Handling

- **Gemini extraction fails:** show error toast + clear disclaimer; user can still fill form manually
- **Supabase errors:** toast notifications for failed saves/deletes; optimistic updates rolled back on failure
- **No internet:** Supabase calls fail gracefully with user-facing error messages (no offline mode in v1)
- **Image upload:** if upload fails, fall back to URL-only

---

## 9. Part 2 (Chat Mode) — Architecture Notes

Do not implement. Note for future compatibility:

- `lib/gemini.ts` should expose a generic `callGemini(prompt, key)` function — Chat mode will reuse it
- Recipe mutations (add, update, delete meal slots, update grocery) should be encapsulated in hook functions so Chat mode can call the same logic
- The `GeminiKeyContext` is already the right abstraction — Chat will use the same key

---

## 10. Must-Not List (from brief)

- No email/password auth
- No server-side Gemini calls using a shared key
- No merging ingredients across recipes in grocery list
- No offline mode
- No pagination
- No nutritional info
- No recipe sharing between users
- No fridge photo / voice features
- Do not start Chat mode until explicitly instructed
