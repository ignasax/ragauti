# Fridge Scan Feature — Design Spec
**Date:** 2026-06-06  
**Status:** Approved

---

## Overview

User takes a photo of their fridge. AI vision detects the ingredients visible. The app ranks saved recipes by how many detected ingredients they use, letting the user discover what they can cook right now.

The photo is ephemeral — never stored. This is a single search session, not a persistent state.

---

## 1. Navigation

Fridge becomes a **5th tab** in the bottom `TabBar` (🧊 Fridge), alongside Recipes, Plan, Grocery, Settings.

- **First tap** → immediately opens the device camera/photo picker
- **Subsequent taps** (if scan already done) → shows current fridge results
- **Rescan button** on the Fridge page → clears results and re-opens camera
- The Name and Ingredients search pills from RecipesPage are **not shown** in fridge mode — they have no function here

---

## 2. AI Detection — `detectFridgeIngredients()`

New function added to `src/lib/gemini.ts` and a twin in `src/lib/groq.ts`.

**Input:** `base64: string, mimeType: string, key: string`  
**Output:** `Promise<string[]>` — array of clean ingredient name strings

**Prompt rules (enforced in the AI prompt):**
- Return only meaningful ingredient names — no quantities, no fat percentages, no units
- Skip pantry staples: salt, pepper, oil, vinegar, sugar, flour, and common spices
- Return a JSON array of strings only, e.g. `["chicken", "garlic", "lemon", "cream", "eggs"]`
- No explanation, no markdown

Both providers (Gemini `gemini-2.0-flash-lite` and Groq `meta-llama/llama-4-scout-17b-16e-instruct`) support vision and are used according to the user's `ai_provider` setting in their profile.

---

## 3. Matching Algorithm

New functions in `src/utils/recipeFilter.ts` — parallel to the existing `filterRecipes`, which is **unchanged**.

### `PANTRY_STAPLES: Set<string>`
Hardcoded set of always-available items to exclude from recipe ingredient matching:  
`salt, pepper, oil, olive oil, water, sugar, flour, butter` (etc.)  
These are skipped when scoring a recipe's ingredients.

### `stripQuantity(ingredientLine: string): string`
Regex that removes leading quantities, units, percentages, and fat descriptors from a recipe ingredient string.  
`"500g chicken breast"` → `"chicken breast"`  
`"35% thick cream"` → `"cream"`  
`"juice of 1 lemon"` → `"lemon"`

### `scoreFridgeMatch(recipe: Recipe, detected: string[]): number`
1. Split `recipe.ingredients` into lines
2. For each line: `stripQuantity()` → check if it is a pantry staple (skip if so)
3. For each remaining line: check if any `detected` term appears in it (case-insensitive)
4. Return `matched / total` (0–1 ratio)

### `scoreFridgeMatch(recipe: Recipe, detected: string[]): { score: number; matched: number; total: number }`
Returns ratio plus raw counts so the badge can display "4/5".

### `filterByFridge(recipes: Recipe[], detected: string[], threshold = 0.35): Array<Recipe & { fridgeScore: number; fridgeMatched: number; fridgeTotal: number }>`
- Score every recipe with `scoreFridgeMatch`
- Filter to scores ≥ threshold (~35% — roughly 1 in 3 meaningful ingredients)
- Sort descending by score
- Returns augmented array with `fridgeScore`, `fridgeMatched`, `fridgeTotal` for badge display (e.g. "4/5")

---

## 4. Fridge Page (`src/pages/FridgePage.tsx`)

### States

**Empty (no scan yet)**  
Centred camera icon + "Tap to scan your fridge" prompt. Tapping opens the file input with `accept="image/*" capture="environment"`.

**Scanning**  
Full-screen centered spinner: "Scanning fridge…". The Fridge tab in `TabBar` remains active.

**Results**  
- Ingredient chips row (orange outlined pills, `detected: string[]` in state)
  - Each chip has ×  to remove it → re-runs `filterByFridge`
  - Inline text input (same orange style as grocery fast-add): type + press Enter/✓ to add a chip
- Recipe grid (`RecipeGrid`) filtered by `filterByFridge`, each `RecipeCard` shows a small match badge (e.g. "4/5")
- **Rescan** button top-right

**Error**  
Toast with the AI error message. Returns to empty state.

---

## 5. Fridge Recipe Detail (`src/pages/FridgeRecipeDetailPage.tsx`)

Opened when user taps a recipe card from the Fridge tab. Navigates to `/fridge/recipe/:id`.

### Header — identical to `RecipeDetailPage`
- Top bar: `ChevronLeft` (back → Fridge results), Heart / Pencil / Trash icons
- Full-width `aspect-video` recipe image
- Title (font-serif, 2xl, bold)
- Meta row: Prep Xmin · Cook Xmin · ★★★ · 👤👤👤👤
- Category pills

### Fridge match badge (below meta)
`🧊 4 of 5 ingredients in your fridge`  
Orange outlined pill, sits below the meta row.

### Serving scaler (new unified design — see §7)

### Detected section
Header: `✓ Detected` (green, with divider line)  
For each matched ingredient:
- Big line: detected ingredient name (e.g. **Chicken**), green, font-size 14px bold
- Small line: full scaled recipe requirement (e.g. `750g chicken breast · scaled from 500g`), muted green, font-size 10px

### Still need section
Header: `○ Still need` (grey, with divider line)  
Same two-line structure, greyed out. Quantities are scaled.

### Pantry note
`Salt, pepper & spices assumed in pantry` — italic, muted, bottom of ingredients.

### Add to grocery list button
`🛒 Add to grocery list` — full-width orange button  
Subtitle: `Detected items added as checked · missing as open · N servings`

**On tap:**
1. Creates a new grocery list entry for this recipe (same as existing grocery list creation logic)
2. All ingredients at the scaled quantity
3. Detected ingredients → `is_checked: true`
4. Missing ingredients → `is_checked: false`
5. Navigates to Grocery tab

---

## 6. Grocery List Changes

### `GroceryItem` — editable text

The item row changes from a tap-to-toggle button to a two-part row:

```
[checkbox]  [inline text input]  [trash? if recipe_id === null]
```

- **Checkbox** (left, 20×20px, orange border/fill) — tap toggles `is_checked`. Checked = filled orange + checkmark + text strikethrough.
- **Text input** — always an `<input type="text">` showing `ingredient_text`. On blur, if text changed, calls a new `useUpdateGroceryItem` mutation to persist the edit. Min-height 44px touch target.
- **Trash icon** — only for items where `recipe_id === null` (same rule as today).

### Inline add per recipe group

Each `GroceryGroup` gets a ghost row at the bottom of its card:

**Idle state:**  
Dashed empty checkbox + greyed "add item…" placeholder text. Tapping activates the row.

**Active state (keyboard open):**  
Text input with orange underline + ✓ button (orange) + ✕ button (grey border).
- ✓ → adds item with the `recipe_id` shared by all items in this group (taken from `items[0].recipe_id`), clears input, shows new idle ghost row
- ✕ → cancels, returns to idle ghost row
- Enter key → same as ✓

### Permanent "Other" section

Always rendered at the bottom of the grocery list, **below all recipe groups**. Never hidden, never deletable as a group.

- Section header: "OTHER" in orange (`text-warm-accent`)
- No group-level trash or check-all (unlike recipe groups)
- Items use the same editable row as above; all have `recipe_id === null` so individual trash icons show
- Same inline add ghost row at the bottom

**Data:** Items in "Other" are existing manually-added items (`recipe_id === null`). No schema change needed.

---

## 7. Serving Scaler — Unified New Design

Replaces the current `ServingScaler` component everywhere it appears.

```
[−]  [18px bold number]  [10px "servings · base N"]  [+]
```

- Full width, 38px height
- White background, `warm-border` border, `border-radius: 10px`, no padding overflow
- − and + are 52px wide, separated from center by a `warm-border` vertical divider
- Number and "servings · base N" text on the same line, centered
- − button disabled (greyed) when `selected === 1`
- When `selected === base`, the "· base N" text is still shown (no visual change)

Applied in:
- `RecipeDetailPage` (ingredients tab) — replaces current scaler
- `FridgeRecipeDetailPage`

---

## 8. Add to Grocery List — RecipeDetailPage

In the **Ingredients** tab of `RecipeDetailPage`, below the ingredient list:

```
🛒 Add to grocery list
```

Full-width orange button (same style as Fridge recipe detail).  
Subtitle: `All ingredients · N servings · new list entry`

**Logic:**
1. Take the current serving multiplier from the scaler
2. Apply `scaleIngredients(recipe.ingredients, multiplier)` to get scaled lines
3. Create a new grocery list group for this recipe with all scaled ingredient lines, all `is_checked: false`
4. Show success toast: "Added to grocery list"

No navigation — user stays on the recipe detail page.

---

## 9. Routing

New routes added to `App.tsx`:

| Path | Component |
|------|-----------|
| `/fridge` | `FridgePage` |
| `/fridge/recipe/:id` | `FridgeRecipeDetailPage` |

`TabBar` gets a 5th entry: Fridge (🧊), linking to `/fridge`.

---

## 10. Files Changed / Created

| File | Change |
|------|--------|
| `src/lib/gemini.ts` | Add `detectFridgeIngredients()` |
| `src/lib/groq.ts` | Add `detectFridgeIngredientsWithGroq()` |
| `src/utils/recipeFilter.ts` | Add `PANTRY_STAPLES`, `stripQuantity`, `scoreFridgeMatch`, `filterByFridge` |
| `src/components/recipes/ServingScaler.tsx` | Replace with new slim design |
| `src/components/grocery/GroceryItem.tsx` | Editable text input, separate checkbox |
| `src/components/grocery/GroceryGroup.tsx` | Inline add ghost row |
| `src/pages/GroceryPage.tsx` | Permanent "Other" section at bottom |
| `src/pages/RecipeDetailPage.tsx` | Add to grocery list button in ingredients tab |
| `src/pages/FridgePage.tsx` | **New** — Fridge tab page |
| `src/pages/FridgeRecipeDetailPage.tsx` | **New** — Recipe detail in fridge context |
| `src/components/layout/TabBar.tsx` | Add Fridge tab (5th item) |
| `src/App.tsx` | Add `/fridge` and `/fridge/recipe/:id` routes |
