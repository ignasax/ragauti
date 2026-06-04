# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Ragauti is a mobile-first recipe manager for personal use. Users paste a URL and Gemini scrapes the recipe, or add recipes manually. Includes meal planning (7-day) and grocery list generation. See `BRIEF_FINAL.md` for the full spec.

**Current status:** Part 1 (Classic mode) only. Do not start Chat mode (Part 2) until explicitly instructed.

## Stack

- **Frontend:** React + Vite
- **Backend/DB:** Supabase (Google OAuth, PostgreSQL, Row-Level Security)
- **Hosting:** Vercel
- **AI:** Gemini 1.5 Flash (client-side, using the user's own API key stored in Supabase)

## Commands

```bash
npm run dev        # start Vite dev server
npm run build      # production build
npm run preview    # preview production build locally
npm run lint       # ESLint
```

Supabase local dev (once `supabase` CLI is initialized):
```bash
npx supabase start          # start local Supabase stack
npx supabase db reset       # reset DB and re-run all migrations
npx supabase gen types typescript --local > src/types/supabase.ts  # regenerate types
```

## Architecture

### Auth

Google OAuth only via Supabase Auth. No email/password. No user emails stored. The Supabase session is the single source of auth truth — check `supabase.auth.getUser()` on protected routes.

### Gemini API key

Each user stores their own Gemini API key in the `profiles` table in Supabase (not localStorage, not env vars). All Gemini calls are made client-side using the key fetched from the user's profile. Never use a shared server-side key.

### Row-Level Security

Every table (`recipes`, `meal_plans`, `grocery_lists`, `profiles`) has RLS enabled. Users can only read/write their own rows. Always write and test RLS policies in migrations — never rely on application-layer filtering alone.

### Recipe scraping

Scraping is client-triggered once per recipe save. The client sends the URL + user's Gemini key directly to the Gemini API. Gemini should extract: title, ingredients (with quantities), instructions, image URL, cook time, prep time, serving size. On partial extraction, pre-fill what was extracted and show a disclaimer prompting the user to fill in missing fields.

### Serving size scaler

A multiplier input on each recipe view that scales numeric quantities in the ingredients field. Best-effort regex on the ingredient strings — does not need to be perfect.

### Grocery list

Ingredients are grouped by recipe, never merged across recipes. "2 cloves garlic (Salmon)" and "3 cloves garlic (Pasta)" stay as separate line items.

### Mobile-first

Every interaction must work one-handed on a phone. Image input supports both URL (from scraping) and device camera/upload via `<input type="file" accept="image/*" capture="environment">`.

### Chat mode (Part 2 — not yet started)

The architecture should support Chat mode being layered on top of the same Supabase data and Gemini key in Part 2. Actions Chat will need: add recipe to a meal slot, update grocery list, query recipes. Design data access patterns to be callable from both UI and a future chat handler.
