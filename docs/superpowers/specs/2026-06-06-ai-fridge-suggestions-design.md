# AI Fridge Recipe Suggestions — Design Spec

**Date:** 2026-06-06

---

## Goal

After a fridge scan detects ingredients, show 2 AI-generated recipe suggestion cards directly on the Fridge page. Each card is a lazy placeholder — the user taps to generate. The generated card is a full inline recipe using the exact same visual style as `FridgeRecipeDetailPage`.

---

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Recipe source | AI-generated (no web search) | No extra API keys; works with existing provider setup; tailored to exact fridge contents |
| Provider | User's configured provider via `GeminiKeyContext` | Already supports Gemini + Groq; consistent with rest of app |
| Image | None — text-only | Extra key burden for users; generated image wouldn't reflect actual result anyway; user can add photo after cooking |
| Number of slots | 2 | Enough variety without overwhelming; each generates independently |
| Placement | Below "From your collection" grid on `FridgePage` | Natural continuation of fridge scan flow; no new route needed |
| Trigger | Lazy — cards always visible after scan, user taps each to generate | Lower friction than a single "Generate" button |

---

## Card States

### State 1 — Placeholder (before tap)
- Dashed border card, warm-card background
- ✨ icon (warm-accent/12 background)
- Bold text: "Suggest a recipe"
- Subtitle: "AI picks something from your fridge"
- Only visible when `detected.length > 0`

### State 2 — Loading (after tap, during AI call)
- Solid border card, same size
- Spinner (warm-accent colour)
- Text: "Thinking about your ingredients…"

### State 3 — Generated (after AI response)
Full inline recipe card, visually identical to `FridgeRecipeDetailPage`:

- **Header row**: Lora serif title + prep/cook time meta + ↺ regenerate button (top-right)
- **Fridge badge**: `🧊 N of M ingredients in your fridge` — same `bg-warm-accent/10 border-warm-accent/30 rounded-full` pill
- **ServingScaler**: existing `<ServingScaler showIngredients={false} />` — user can scale before saving
- **✓ Detected section**: green cards (`bg-green-50 border-green-200`) — bold fridge name + scaled ingredient amount below
- **○ Still need section**: muted cards (`bg-warm-card border-warm-border`) — scaled ingredient text
- **Pantry note**: "Salt, pepper & spices assumed in pantry"
- **Instructions**: numbered steps with warm-accent circle badges
- **Save to collection** button — full-width warm-accent; turns green "Saved ✓" on success; stays on fridge page

---

## AI Prompt & Response Shape

The AI call sends:
- Detected ingredient list (from `FridgeContext.detected`)
- Slot index (0 or 1) so each slot can be prompted for a distinctly different recipe style
- Request for a JSON response

**Prompt outline** (same for Gemini and Groq):
```
You are a helpful cooking assistant. The user has these ingredients in their fridge:
[ingredient list]

Suggest a [slot 0: "quick weeknight" / slot 1: "hearty or creative"] recipe that uses as many of these ingredients as possible. Respond ONLY with valid JSON matching this schema:
{
  "title": string,
  "prep_time_mins": number,
  "cook_time_mins": number,
  "servings": number,
  "ingredients": string,  // one ingredient per line, with amounts, e.g. "2 chicken breasts\n4 cloves garlic, minced"
  "instructions": string[]  // ordered steps as plain strings
}
```

**Post-processing:**
- Parse JSON response
- Run `getFridgeIngredientBreakdown(recipe, detected, 1)` (existing util) to compute `matched` / `missing`
- Store result in component state — nothing persisted until user taps Save

---

## Save Behaviour

On "Save to collection":
1. Call `useAddRecipe` mutation with the full recipe object:
   - `title`, `ingredients` (multiline string), `instructions` (steps joined with `\n`), `prep_time_mins`, `cook_time_mins`, `servings`
   - `source_url: null`, `image_url: null`
2. On success: button label changes to "Saved ✓" with green background; card stays expanded
3. Recipe appears in Recipes tab immediately (React Query cache invalidation via existing `useRecipes`)

---

## Component & File Plan

| File | Change |
|---|---|
| `src/components/fridge/AISuggestionCard.tsx` | **New** — all three states (placeholder / loading / generated), accepts `slotIndex`, `detected`, `provider`/keys from props |
| `src/lib/gemini.ts` | Add `generateFridgeRecipe(detected: string[], slotIndex: number, apiKey: string): Promise<GeneratedRecipe>` |
| `src/lib/groq.ts` | Add `generateFridgeRecipeWithGroq(detected: string[], slotIndex: number, apiKey: string): Promise<GeneratedRecipe>` |
| `src/pages/FridgePage.tsx` | Add `{detected.length > 0 && <AISuggestionsSection />}` below the collection grid |

`GeneratedRecipe` type:
```ts
interface GeneratedRecipe {
  title: string
  prep_time_mins: number | null
  cook_time_mins: number | null
  servings: number
  ingredients: string   // multiline
  instructions: string  // steps joined with \n
}
```

---

## Out of Scope

- Web search for real recipe URLs
- AI-generated or stock photography
- Saving AI suggestions to a separate "suggestions" table (saves directly to `recipes` like any other recipe)
- Persistent suggestion history between sessions
