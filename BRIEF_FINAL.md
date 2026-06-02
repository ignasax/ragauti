# BRIEF_FINAL.md — Ragauti

## Problem
Recipes found online get lost. There's no easy way to save them, rate them, and search by ingredient from a personal list — especially one-handed with a baby in the other arm.

## Solution in plain English
Ragauti is a mobile-first recipe manager. Paste a URL and Gemini scrapes the recipe automatically. Or add one manually. Every recipe is stored with ingredients, rating, comments, an image, categories, cook/prep time, and serving size. Search by ingredient, filter by rating or category. Mark favourites. Plan meals for the week and generate a grouped grocery list from the plan. Recipes are private per user, synced across devices, never lost.

A second Chat mode will layer an AI chat interface on top of the same data and Gemini key — built in Part 2 of the same codebase, not a separate project.

## Who uses it
Primarily Ignas and his wife. Free for anyone via link sharing. No invite needed.

## Must-do list (Part 1 — Classic mode)
1. Google OAuth login via Supabase — no passwords, no emails stored
2. Add recipe via URL — Gemini 1.5 Flash scrapes title, ingredients, instructions, image, cook time, prep time, serving size. Pre-fills the form. Short disclaimer shown if extraction is incomplete. User can edit before saving.
3. Add recipe manually — free text fields: title, ingredients, instructions, comments, image (upload or phone camera), rating (1-5), categories, cook time, prep time, serving size
4. Serving size scaler — a multiplier input on each recipe that scales all ingredient quantities automatically
5. Categories — free text or pick from existing. Multiple per recipe. Filterable.
6. Favourites — heart/star toggle on each recipe. Filter to favourites only.
7. Search across all fields (title, ingredients, instructions, comments) + filter by rating, category, favourites
8. Meal planner — 7-day week view. Tap a day, pick a recipe from your list, it appears in that slot. Tap a slot to see recipe overview: ingredients, serving size, instructions.
9. Grocery list — generated from the week's meal plan. Ingredients grouped by recipe, with quantities. Checkable items for use at the store. Can also be updated manually.
10. Edit and delete recipes. Mobile-first UI throughout.

## Must-not list
- No email/password auth
- No storing user emails or passwords
- No voice dictation in Classic mode
- No server-side Gemini calls using Ignas's API key — user provides their own Gemini API key, stored in Supabase against their profile
- No recipe sharing between users
- No merging of duplicate ingredients across recipes in grocery list — group by recipe instead
- No meal planning beyond 7-day view in v1
- No nutritional info
- No offline mode
- No fridge photo feature in v1 — planned for Part 2 Chat mode
- Do not start Chat mode until Ignas explicitly says to proceed with Part 2

## Stack
- React + Vite (frontend)
- Supabase (auth via Google OAuth + PostgreSQL database + row-level security)
- Vercel (hosting)
- Gemini 1.5 Flash (recipe scraping — user's own API key, stored in Supabase)

## Success definition
Ignas and his wife use Ragauti daily, have 100 recipes easy to search and filter, plan meals for the week, and shop from a single grouped grocery list.

## Key assumptions Claude Code should know upfront
- App name is Ragauti. Domain will be ragauti.app (not yet registered during build — use Vercel URL for now)
- Supabase row-level security must be enabled — users can only ever see and modify their own recipes, meal plans, and grocery lists
- Gemini API key is stored per user in Supabase against their profile, never in localStorage
- Scraping is client-triggered, one-time per recipe save, using the user's own Gemini key
- Gemini should extract: title, ingredients (with quantities), instructions, image, cook time, prep time, serving size
- If scraping fails or is incomplete, pre-fill whatever was extracted and show a short disclaimer prompting the user to review and fill in missing fields
- Serving size scaler multiplies all numeric quantities in the ingredients field — does not need to be perfect, best effort is fine
- Grocery list groups ingredients by recipe, not merged — "2 cloves garlic (Salmon)" and "3 cloves garlic (Pasta)" stay separate
- Mobile-first — every interaction must work one-handed on a phone
- Image support: URL from scraped recipe, or user uploads/takes photo on mobile
- No pagination needed for v1 — filter and search is the navigation
- Chat mode interactions will include things like: "add salmon recipe to Tuesday", "update the shopping list", "show me the shopping list", "what can I cook from my fridge" (photo input) — architecture must support these actions cleanly in Part 2
- Build the full architecture upfront with both Classic and Chat modes in mind. Implement Classic mode fully first. Do not start Chat mode until Ignas explicitly says to proceed with Part 2.
- Throughout the build, proactively flag improvements in any area — architecture, UX, performance, security, naming. Do not implement without asking. Just suggest.
