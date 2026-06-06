# Fridge Scan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Fridge tab where users photograph their fridge, AI detects ingredients, and the app surfaces matching recipes ranked by how many detected ingredients they use.

**Architecture:** Parallel to the existing recipe filter (unchanged). New `FridgeContext` at app-shell level persists detected ingredients across tab navigation. Fridge recipe detail reuses the existing `RecipeDetailPage` header pattern with an extra matched/missing ingredient breakdown. Grocery list gains editable items and inline-add rows replacing the current FAB.

**Tech Stack:** React + TypeScript, Vite, TanStack Query, Supabase, Groq/Gemini vision APIs, lucide-react icons, Tailwind CSS with warm-* design tokens.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/utils/recipeFilter.ts` | Modify | Add `PANTRY_STAPLES`, `stripQuantity`, `scoreFridgeMatch`, `filterByFridge`, `getFridgeIngredientBreakdown` |
| `src/utils/recipeFilter.test.ts` | Modify | Tests for new fridge matching functions |
| `src/lib/gemini.ts` | Modify | Add `detectFridgeIngredients()` |
| `src/lib/groq.ts` | Modify | Add `detectFridgeIngredientsWithGroq()` |
| `src/components/recipes/ServingScaler.tsx` | Replace | New slim full-width design with `onScaleChange` callback |
| `src/hooks/useGroceryList.ts` | Modify | Add `useUpdateGroceryItem`, `useAddGroceryItemToGroup`, `useAddRecipeToGrocery` |
| `src/components/grocery/GroceryItem.tsx` | Replace | Editable text input + separate checkbox |
| `src/components/grocery/GroceryGroup.tsx` | Modify | Inline ghost-row add at bottom |
| `src/pages/GroceryPage.tsx` | Modify | Permanent Other section, remove FAB |
| `src/pages/RecipeDetailPage.tsx` | Modify | Track scaler multiplier, add grocery button |
| `src/contexts/FridgeContext.tsx` | Create | Session-level fridge state (status, detected list) |
| `src/components/layout/AppShell.tsx` | Modify | Wrap with `FridgeProvider` |
| `src/components/layout/TabBar.tsx` | Modify | Add 5th Fridge tab |
| `src/App.tsx` | Modify | Add `/fridge` and `/fridge/recipe/:id` routes |
| `src/components/fridge/FridgeRecipeCard.tsx` | Create | Recipe card linking to `/fridge/recipe/:id` with match badge |
| `src/pages/FridgePage.tsx` | Create | Fridge tab: camera, scanning state, chips, recipe grid |
| `src/pages/FridgeRecipeDetailPage.tsx` | Create | Recipe detail with detected/missing ingredient breakdown |

---

## Task 1: Fridge matching utils (TDD)

**Files:**
- Modify: `src/utils/recipeFilter.ts`
- Modify: `src/utils/recipeFilter.test.ts`

- [ ] **Step 1: Add failing tests for `stripQuantity`**

Append to `src/utils/recipeFilter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  filterRecipes,
  stripQuantity,
  scoreFridgeMatch,
  filterByFridge,
} from './recipeFilter'
import type { Recipe } from '../types/app'

// ... existing tests unchanged above this line ...

describe('stripQuantity', () => {
  it('strips grams prefix', () => expect(stripQuantity('500g chicken breast')).toBe('chicken breast'))
  it('strips ml prefix', () => expect(stripQuantity('200ml chicken stock')).toBe('chicken stock'))
  it('strips percentage', () => expect(stripQuantity('35% thick cream')).toBe('thick cream'))
  it('strips "juice of N"', () => expect(stripQuantity('juice of 1 lemon')).toBe('lemon'))
  it('strips tbsp', () => expect(stripQuantity('3 tbsp butter')).toBe('butter'))
  it('strips cloves unit', () => expect(stripQuantity('4 cloves garlic')).toBe('garlic'))
  it('strips plain leading number', () => expect(stripQuantity('2 eggs')).toBe('eggs'))
  it('leaves plain text unchanged', () => expect(stripQuantity('chicken')).toBe('chicken'))
  it('lowercases result', () => expect(stripQuantity('Chicken Breast')).toBe('chicken breast'))
})

describe('scoreFridgeMatch', () => {
  const recipe: Recipe = {
    ...base,
    ingredients: '500g chicken\n4 cloves garlic\njuice of 1 lemon\nsalt\npepper',
  }

  it('matches all meaningful ingredients, skips salt and pepper', () => {
    const r = scoreFridgeMatch(recipe, ['chicken', 'garlic', 'lemon'])
    expect(r.matched).toBe(3)
    expect(r.total).toBe(3)
    expect(r.score).toBeCloseTo(1.0)
  })

  it('partial match returns correct ratio', () => {
    const r = scoreFridgeMatch(recipe, ['chicken'])
    expect(r.matched).toBe(1)
    expect(r.total).toBe(3)
    expect(r.score).toBeCloseTo(0.333, 2)
  })

  it('returns zero score for empty detected list', () => {
    expect(scoreFridgeMatch(recipe, []).score).toBe(0)
  })

  it('returns zero score for no meaningful ingredients', () => {
    const r = scoreFridgeMatch({ ...base, ingredients: 'salt\npepper' }, ['chicken'])
    expect(r.score).toBe(0)
    expect(r.total).toBe(0)
  })
})

describe('filterByFridge', () => {
  const chicken: Recipe = { ...base, id: '1', ingredients: 'chicken\ngarlic\nlemon\nsalt' }
  const pasta: Recipe = { ...base, id: '2', title: 'Pasta', ingredients: 'pasta\nonion\ntomato\nsalt' }

  it('returns recipes above threshold, sorted by score descending', () => {
    const result = filterByFridge([chicken, pasta], ['chicken', 'garlic', 'lemon'])
    expect(result[0].id).toBe('1')
    expect(result[0].fridgeScore).toBeCloseTo(1.0)
    expect(result[0].fridgeMatched).toBe(3)
    expect(result[0].fridgeTotal).toBe(3)
  })

  it('filters out recipes below threshold', () => {
    // pasta has no matching ingredients → score 0, filtered out
    const result = filterByFridge([chicken, pasta], ['chicken'], 0.35)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('returns empty array when detected list is empty', () => {
    expect(filterByFridge([chicken, pasta], [])).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npm test -- recipeFilter
```
Expected: FAIL — `stripQuantity`, `scoreFridgeMatch`, `filterByFridge` not exported.

- [ ] **Step 3: Implement the new functions in `recipeFilter.ts`**

Append to `src/utils/recipeFilter.ts` (after existing `filterRecipes`):

```typescript
import { scaleIngredients } from './servingScaler'

export const PANTRY_STAPLES = new Set([
  'salt', 'pepper', 'black pepper', 'white pepper', 'oil', 'olive oil',
  'vegetable oil', 'sunflower oil', 'water', 'sugar', 'flour', 'butter',
  'vinegar', 'baking powder', 'baking soda', 'yeast', 'cumin', 'paprika',
  'oregano', 'thyme', 'rosemary', 'basil', 'bay leaf', 'bay leaves',
  'cinnamon', 'nutmeg', 'turmeric', 'coriander', 'chili flakes', 'chilli flakes',
])

export function stripQuantity(line: string): string {
  let s = line.trim()
  s = s.replace(/^(juice|zest)\s+of\s+\d*\.?\d*\s*/i, '')
  s = s.replace(/^\d+(\.\d+)?(\s*\/\s*\d+)?\s*(g|kg|ml|l|oz|lb|tbsps?|tsps?|cups?|cloves?|pinch(es)?|bunch(es)?|handful|pieces?|slices?|sprigs?|sticks?|heads?|stalks?)\s*/i, '')
  s = s.replace(/^\d+(\.\d+)?%\s*/i, '')
  s = s.replace(/^\d+(\.\d+)?\s+/i, '')
  return s.toLowerCase().trim()
}

function isStaple(stripped: string): boolean {
  return Array.from(PANTRY_STAPLES).some(s => stripped.includes(s))
}

export function scoreFridgeMatch(
  recipe: Recipe,
  detected: string[]
): { score: number; matched: number; total: number } {
  if (!detected.length) return { score: 0, matched: 0, total: 0 }
  const lines = recipe.ingredients.split('\n').map(l => l.trim()).filter(Boolean)
  const meaningful = lines.filter(l => !isStaple(stripQuantity(l)))
  if (!meaningful.length) return { score: 0, matched: 0, total: 0 }
  const detectedLower = detected.map(d => d.toLowerCase())
  const matched = meaningful.filter(l => {
    const stripped = stripQuantity(l)
    return detectedLower.some(d => stripped.includes(d) || d.includes(stripped))
  }).length
  return { score: matched / meaningful.length, matched, total: meaningful.length }
}

export type FridgeRecipe = Recipe & {
  fridgeScore: number
  fridgeMatched: number
  fridgeTotal: number
}

export function filterByFridge(
  recipes: Recipe[],
  detected: string[],
  threshold = 0.35
): FridgeRecipe[] {
  if (!detected.length) return []
  return recipes
    .map(r => {
      const { score, matched, total } = scoreFridgeMatch(r, detected)
      return { ...r, fridgeScore: score, fridgeMatched: matched, fridgeTotal: total }
    })
    .filter(r => r.fridgeScore >= threshold)
    .sort((a, b) => b.fridgeScore - a.fridgeScore)
}

export function getFridgeIngredientBreakdown(
  recipe: Recipe,
  detected: string[],
  multiplier: number
): {
  matched: Array<{ detectedName: string; scaledIngredient: string }>
  missing: Array<{ scaledIngredient: string }>
} {
  const lines = recipe.ingredients.split('\n').map(l => l.trim()).filter(Boolean)
  const scaledLines = scaleIngredients(recipe.ingredients, multiplier)
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
  const detectedLower = detected.map(d => d.toLowerCase())
  const matched: Array<{ detectedName: string; scaledIngredient: string }> = []
  const missing: Array<{ scaledIngredient: string }> = []

  lines.forEach((line, i) => {
    const stripped = stripQuantity(line)
    if (isStaple(stripped)) return
    const scaledIngredient = scaledLines[i] ?? line
    const detectedMatch = detectedLower.find(d => stripped.includes(d) || d.includes(stripped))
    if (detectedMatch) {
      matched.push({ detectedName: detectedMatch, scaledIngredient })
    } else {
      missing.push({ scaledIngredient })
    }
  })

  return { matched, missing }
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npm test -- recipeFilter
```
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/recipeFilter.ts src/utils/recipeFilter.test.ts
git commit -m "feat: fridge matching utils — stripQuantity, scoreFridgeMatch, filterByFridge"
```

---

## Task 2: AI detection functions

**Files:**
- Modify: `src/lib/gemini.ts`
- Modify: `src/lib/groq.ts`

- [ ] **Step 1: Add `detectFridgeIngredients` to `gemini.ts`**

Append to `src/lib/gemini.ts` (after existing `extractRecipe`):

```typescript
export async function detectFridgeIngredients(
  base64: string,
  mimeType: string,
  key: string
): Promise<string[]> {
  const genAI = new GoogleGenerativeAI(key)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })
  const prompt = `Look at this photo and identify the food ingredients you can see.

Return ONLY a valid JSON array of ingredient name strings. Rules:
- Include only meaningful food ingredients (vegetables, meat, dairy, fruit, condiments, etc.)
- Do NOT include: salt, pepper, oil, sugar, flour, water, spices, or pantry staples
- Do NOT include quantities, amounts, fat percentages, or units — just the name
- Use simple names: "chicken" not "chicken breast fillet", "cream" not "35% cream"
- Return ONLY the JSON array, no explanation, no markdown

Example: ["chicken", "garlic", "lemon", "cream", "eggs"]`

  const result = await model.generateContent([
    { inlineData: { mimeType, data: base64 } },
    { text: prompt },
  ])
  const response = result.response.text()
  const match = response.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('No ingredient list in Gemini response')
  const parsed = JSON.parse(match[0])
  if (!Array.isArray(parsed)) throw new Error('Expected array from Gemini')
  return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}
```

- [ ] **Step 2: Add `detectFridgeIngredientsWithGroq` to `groq.ts`**

Append to `src/lib/groq.ts` (after existing `extractRecipeWithGroq`):

```typescript
export async function detectFridgeIngredientsWithGroq(
  base64: string,
  mimeType: string,
  key: string
): Promise<string[]> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          {
            type: 'text',
            text: `Look at this photo and identify the food ingredients you can see.

Return ONLY a valid JSON array of ingredient name strings. Rules:
- Include only meaningful food ingredients (vegetables, meat, dairy, fruit, condiments, etc.)
- Do NOT include: salt, pepper, oil, sugar, flour, water, spices, or pantry staples
- Do NOT include quantities, amounts, fat percentages, or units — just the name
- Use simple names: "chicken" not "chicken breast fillet", "cream" not "35% cream"
- Return ONLY the JSON array, no explanation, no markdown

Example: ["chicken", "garlic", "lemon", "cream", "eggs"]`,
          },
        ],
      }],
      temperature: 0.1,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(
      (body as { error?: { message?: string } } | null)?.error?.message ?? `Groq error ${res.status}`
    )
  }

  const data = await res.json()
  const content = (data.choices?.[0]?.message?.content ?? '') as string
  const match = content.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('No ingredient list in Groq response')
  const parsed = JSON.parse(match[0])
  if (!Array.isArray(parsed)) throw new Error('Expected array from Groq')
  return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}
```

- [ ] **Step 3: Run lint to confirm no type errors**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/gemini.ts src/lib/groq.ts
git commit -m "feat: AI fridge ingredient detection for Gemini and Groq"
```

---

## Task 3: ServingScaler redesign

**Files:**
- Replace: `src/components/recipes/ServingScaler.tsx`

- [ ] **Step 1: Replace `ServingScaler.tsx` with the new slim full-width design**

```typescript
import { useState } from 'react'
import { scaleIngredients } from '../../utils/servingScaler'

interface ServingScalerProps {
  ingredients: string
  baseServings: number | null
  onScaleChange?: (multiplier: number, selected: number) => void
}

export function ServingScaler({ ingredients, baseServings, onScaleChange }: ServingScalerProps) {
  const base = Math.max(1, baseServings ?? 1)
  const [selected, setSelected] = useState(base)

  const change = (delta: number) => {
    const next = Math.max(1, selected + delta)
    setSelected(next)
    onScaleChange?.(next / base, next)
  }

  const multiplier = selected / base

  return (
    <div>
      <div className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider mb-1.5">
        Servings
      </div>
      <div className="flex items-center overflow-hidden rounded-[10px] border border-warm-border bg-warm-card mb-3">
        <button
          onClick={() => change(-1)}
          disabled={selected === 1}
          aria-label="Decrease servings"
          className="w-[52px] h-[38px] flex items-center justify-center border-r border-warm-border text-warm-accent text-xl font-bold disabled:text-warm-muted disabled:opacity-40 cursor-pointer touch-manipulation active:bg-warm-surface"
        >−</button>
        <div className="flex-1 flex items-center justify-center gap-1.5 h-[38px]">
          <span className="font-sans font-bold text-warm-primary text-lg leading-none">{selected}</span>
          <span className="font-sans text-warm-muted text-[10px]">servings · base {base}</span>
        </div>
        <button
          onClick={() => change(1)}
          aria-label="Increase servings"
          className="w-[52px] h-[38px] flex items-center justify-center border-l border-warm-border text-warm-accent text-xl font-bold cursor-pointer touch-manipulation active:bg-warm-surface"
        >+</button>
      </div>
      <div className="font-sans text-warm-primary text-[15px] leading-[1.7] whitespace-pre-line">
        {scaleIngredients(ingredients, multiplier)}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run dev server and manually verify RecipeDetailPage ingredients tab**

```bash
npm run dev
```
Open a recipe → Ingredients tab. Confirm: full-width scaler with slim height, − and + flanking a centered "N servings · base N", ingredients scale when tapped.

- [ ] **Step 3: Commit**

```bash
git add src/components/recipes/ServingScaler.tsx
git commit -m "feat: slim full-width serving scaler with onScaleChange callback"
```

---

## Task 4: Grocery hooks

**Files:**
- Modify: `src/hooks/useGroceryList.ts`

- [ ] **Step 1: Add `useUpdateGroceryItem` mutation**

Append to `src/hooks/useGroceryList.ts`:

```typescript
export function useUpdateGroceryItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ingredient_text,
      week_start,
    }: {
      id: string
      ingredient_text: string
      week_start: string
    }) => {
      const { error } = await supabase
        .from('grocery_items')
        .update({ ingredient_text })
        .eq('id', id)
      if (error) throw error
      return { week_start }
    },
    onMutate: async ({ id, ingredient_text, week_start }) => {
      await qc.cancelQueries({ queryKey: ['grocery', week_start] })
      const previous = qc.getQueryData<GroceryItem[]>(['grocery', week_start])
      qc.setQueryData<GroceryItem[]>(['grocery', week_start], old =>
        old?.map(item => item.id === id ? { ...item, ingredient_text } : item) ?? []
      )
      return { previous, week_start }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['grocery', ctx.week_start], ctx.previous)
    },
    onSettled: (_data, _err, vars) => qc.invalidateQueries({ queryKey: ['grocery', vars.week_start] }),
  })
}
```

- [ ] **Step 2: Add `useAddGroceryItemToGroup` mutation**

Append to `src/hooks/useGroceryList.ts`:

```typescript
export function useAddGroceryItemToGroup(weekStart: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      text,
      recipeId,
    }: {
      text: string
      recipeId: string | null
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('grocery_items')
        .insert({
          week_start: weekStart,
          recipe_id: recipeId,
          ingredient_text: text,
          is_checked: false,
          sort_order: Math.floor(Date.now() / 1000),
          user_id: user.id,
        })
        .select()
        .single()
      if (error) throw error
      return data as GroceryItem
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grocery', weekStart] }),
  })
}
```

- [ ] **Step 3: Add `useAddRecipeToGrocery` mutation**

Append to `src/hooks/useGroceryList.ts`:

```typescript
export function useAddRecipeToGrocery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      weekStart,
      recipeId,
      items,
    }: {
      weekStart: string
      recipeId: string
      items: Array<{ text: string; is_checked: boolean }>
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const rows = items.map((item, i) => ({
        week_start: weekStart,
        recipe_id: recipeId,
        ingredient_text: item.text,
        is_checked: item.is_checked,
        sort_order: Math.floor(Date.now() / 1000) + i,
        user_id: user.id,
      }))
      const { error } = await supabase.from('grocery_items').insert(rows)
      if (error) throw error
    },
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ['grocery', vars.weekStart] }),
  })
}
```

- [ ] **Step 4: Run lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useGroceryList.ts
git commit -m "feat: grocery hooks — useUpdateGroceryItem, useAddGroceryItemToGroup, useAddRecipeToGrocery"
```

---

## Task 5: GroceryItem — editable text

**Files:**
- Replace: `src/components/grocery/GroceryItem.tsx`

- [ ] **Step 1: Replace `GroceryItem.tsx`**

```typescript
import { useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import {
  useToggleGroceryItem,
  useDeleteGroceryItem,
  useUpdateGroceryItem,
} from '../../hooks/useGroceryList'
import type { GroceryItem as GroceryItemType } from '../../types/app'

export function GroceryItem({ item }: { item: GroceryItemType }) {
  const { mutate: toggle } = useToggleGroceryItem()
  const { mutate: deleteItem } = useDeleteGroceryItem()
  const { mutate: updateItem } = useUpdateGroceryItem()
  const [text, setText] = useState(item.ingredient_text)
  const committed = useRef(item.ingredient_text)

  const handleBlur = () => {
    const trimmed = text.trim()
    if (!trimmed) { setText(committed.current); return }
    if (trimmed !== committed.current) {
      committed.current = trimmed
      updateItem({ id: item.id, ingredient_text: trimmed, week_start: item.week_start })
    }
  }

  return (
    <div className="flex items-center w-full min-h-[44px] px-3 gap-2">
      <button
        onClick={() => toggle({ id: item.id, is_checked: !item.is_checked, week_start: item.week_start })}
        aria-pressed={item.is_checked}
        aria-label={item.is_checked ? 'Uncheck item' : 'Check item'}
        className="flex-shrink-0 py-2 cursor-pointer touch-manipulation active:opacity-70"
      >
        <div
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            item.is_checked ? 'bg-warm-accent border-warm-accent' : 'border-warm-accent'
          }`}
          aria-hidden="true"
        >
          {item.is_checked && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </button>
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
        className={`flex-1 font-sans text-base bg-transparent border-none outline-none min-w-0 py-2 ${
          item.is_checked ? 'line-through text-warm-muted' : 'text-warm-primary'
        }`}
      />
      {item.recipe_id === null && (
        <button
          onClick={() => deleteItem({ id: item.id, week_start: item.week_start })}
          aria-label="Remove item"
          className="min-w-[36px] min-h-[36px] flex items-center justify-center flex-shrink-0 cursor-pointer touch-manipulation active:opacity-70"
        >
          <Trash2 className="w-4 h-4 text-warm-muted" />
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Open the grocery list in the dev server and verify**

Check that items are editable (tap text, type, blur saves), checkbox still toggles, delete icon shows only for `recipe_id === null` items.

- [ ] **Step 3: Commit**

```bash
git add src/components/grocery/GroceryItem.tsx
git commit -m "feat: grocery item — editable text input with inline save on blur"
```

---

## Task 6: GroceryGroup inline add + GroceryPage permanent Other

**Files:**
- Modify: `src/components/grocery/GroceryGroup.tsx`
- Modify: `src/pages/GroceryPage.tsx`

- [ ] **Step 1: Update `GroceryGroup.tsx` to add inline ghost row and accept `recipeId`**

Replace `src/components/grocery/GroceryGroup.tsx`:

```typescript
import { useRef, useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { GroceryItem } from './GroceryItem'
import {
  useToggleAllGroceryItems,
  useDeleteGroceryGroup,
  useAddGroceryItemToGroup,
} from '../../hooks/useGroceryList'
import type { GroceryItem as GroceryItemType } from '../../types/app'

interface GroceryGroupProps {
  title: string
  items: GroceryItemType[]
  weekStart: string
  recipeId: string | null
  hideGroupActions?: boolean
}

export function GroceryGroup({
  title,
  items,
  weekStart,
  recipeId,
  hideGroupActions = false,
}: GroceryGroupProps) {
  const { mutate: toggleAll } = useToggleAllGroceryItems(weekStart)
  const { mutate: deleteGroup } = useDeleteGroceryGroup(weekStart)
  const { mutate: addItem } = useAddGroceryItemToGroup(weekStart)
  const [adding, setAdding] = useState(false)
  const [addText, setAddText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const ids = items.map(i => i.id)
  const allChecked = items.length > 0 && items.every(i => i.is_checked)

  const activateAdd = () => {
    setAdding(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const commitAdd = () => {
    const text = addText.trim()
    if (text) {
      addItem({ text, recipeId })
    }
    setAddText('')
    setAdding(false)
  }

  const cancelAdd = () => {
    setAddText('')
    setAdding(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between px-1 mb-1">
        <h3
          className={`font-sans font-bold text-[10px] uppercase tracking-wider ${
            recipeId === null ? 'text-warm-accent' : 'text-warm-secondary'
          }`}
        >
          {title}
        </h3>
        {!hideGroupActions && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => toggleAll({ ids, is_checked: !allChecked })}
              aria-label={allChecked ? 'Uncheck all' : 'Check all'}
              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg active:bg-warm-surface transition-colors cursor-pointer touch-manipulation"
            >
              <Check className={`w-4 h-4 ${allChecked ? 'text-warm-accent' : 'text-warm-muted'}`} />
            </button>
            <button
              onClick={() => deleteGroup({ ids })}
              aria-label="Delete group"
              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg active:bg-warm-surface transition-colors cursor-pointer touch-manipulation"
            >
              <Trash2 className="w-4 h-4 text-warm-muted" />
            </button>
          </div>
        )}
      </div>
      <div className="bg-warm-card border border-warm-border rounded-xl overflow-hidden">
        {items.map((item, i) => (
          <div key={item.id}>
            {i > 0 && <div className="border-t border-warm-border mx-3" />}
            <GroceryItem item={item} />
          </div>
        ))}
        {/* Divider before add row when items exist */}
        {items.length > 0 && <div className="border-t border-warm-border mx-3" />}
        {/* Ghost add row */}
        {adding ? (
          <div className="flex items-center gap-2 px-3 min-h-[44px]">
            <div className="w-5 h-5 rounded border-2 border-dashed border-warm-border flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={addText}
              onChange={e => setAddText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitAdd()
                if (e.key === 'Escape') cancelAdd()
              }}
              placeholder="add item…"
              className="flex-1 font-sans text-base bg-transparent border-none outline-none border-b border-warm-accent min-w-0 py-2 text-warm-primary placeholder:text-warm-muted"
            />
            <button
              onClick={commitAdd}
              aria-label="Add item"
              className="w-7 h-7 flex items-center justify-center bg-warm-accent rounded-md text-white text-sm cursor-pointer touch-manipulation"
            >✓</button>
            <button
              onClick={cancelAdd}
              aria-label="Cancel"
              className="w-7 h-7 flex items-center justify-center border border-warm-border rounded-md text-warm-secondary text-sm cursor-pointer touch-manipulation"
            >✕</button>
          </div>
        ) : (
          <button
            onClick={activateAdd}
            className="flex items-center gap-2 px-3 min-h-[44px] w-full text-left cursor-pointer touch-manipulation active:bg-warm-surface"
          >
            <div className="w-5 h-5 rounded border-2 border-dashed border-warm-border flex-shrink-0" />
            <span className="font-sans text-base text-warm-muted">add item…</span>
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `GroceryPage.tsx` — permanent Other, remove FAB, pass new props**

Replace the contents of `src/pages/GroceryPage.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { RefreshCcw, Trash2 } from 'lucide-react'
import {
  useGroceryList,
  useGenerateGroceryList,
  useDeleteAllGroceryItems,
} from '../hooks/useGroceryList'
import { getLocalDateStr } from '../hooks/useMealPlan'
import { GroceryGroup } from '../components/grocery/GroceryGroup'
import type { GroceryItem } from '../types/app'

export function GroceryPage() {
  const weekStart = getLocalDateStr(0)
  const { data: items = [], isLoading } = useGroceryList(weekStart)
  const { mutateAsync: generate, isPending: isGenerating } = useGenerateGroceryList(weekStart)
  const { mutate: deleteAll } = useDeleteAllGroceryItems(weekStart)
  const [confirmRegen, setConfirmRegen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    if (confirmRegen || confirmClear) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [confirmRegen, confirmClear])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (confirmRegen) setConfirmRegen(false)
      else if (confirmClear) setConfirmClear(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmRegen, confirmClear])

  const grouped = new Map<string, { title: string; items: GroceryItem[]; recipeId: string }>()
  const other: GroceryItem[] = []
  for (const item of items) {
    if (!item.recipe_id) { other.push(item); continue }
    const key = item.recipe_id
    if (!grouped.has(key))
      grouped.set(key, { title: item.recipe?.title ?? 'Recipe', items: [], recipeId: key })
    grouped.get(key)!.items.push(item)
  }

  const handleGenerate = async () => {
    setConfirmRegen(false)
    await generate()
  }

  return (
    <div className="px-4 pt-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-serif text-2xl font-bold text-warm-primary">Grocery</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => items.length > 0 ? setConfirmRegen(true) : handleGenerate()}
            disabled={isGenerating}
            aria-label={isGenerating ? 'Generating…' : 'Generate weekly list'}
            className="bg-warm-accent text-white min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg active:opacity-80 disabled:opacity-50 cursor-pointer touch-manipulation"
          >
            <RefreshCcw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
          {items.length > 0 && (
            <button
              onClick={() => setConfirmClear(true)}
              aria-label="Clear all"
              className="bg-warm-accent text-white min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg active:opacity-80 cursor-pointer touch-manipulation"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-warm-surface rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-28">
          {[...grouped.entries()].map(([recipeId, group]) => (
            <GroceryGroup
              key={recipeId}
              title={group.title}
              items={group.items}
              weekStart={weekStart}
              recipeId={recipeId}
            />
          ))}
          {/* Permanent Other section — always rendered */}
          <GroceryGroup
            title="Other"
            items={other}
            weekStart={weekStart}
            recipeId={null}
            hideGroupActions
          />
        </div>
      )}

      {confirmRegen && (
        <div
          className="fixed inset-0 z-40 bg-warm-primary/30 backdrop-blur-sm flex items-end"
          onClick={() => setConfirmRegen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="regen-dialog-title"
            className="bg-warm-card w-full rounded-t-2xl p-6 flex flex-col gap-4"
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 id="regen-dialog-title" className="font-serif text-lg font-bold text-warm-primary">
              Regenerate list?
            </h2>
            <p className="font-sans text-warm-secondary text-sm">
              This will replace the current grocery list with this week's meal plan.
            </p>
            <button
              onClick={handleGenerate}
              className="w-full bg-warm-accent text-white font-sans font-semibold text-sm py-3 rounded-xl min-h-[44px] cursor-pointer touch-manipulation"
            >
              Regenerate
            </button>
            <button
              onClick={() => setConfirmRegen(false)}
              className="w-full border border-warm-border text-warm-primary font-sans text-sm py-3 rounded-xl min-h-[44px] bg-warm-card active:bg-warm-surface cursor-pointer touch-manipulation"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {confirmClear && (
        <div
          className="fixed inset-0 z-40 bg-warm-primary/30 backdrop-blur-sm flex items-end"
          onClick={() => setConfirmClear(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-dialog-title"
            className="bg-warm-card w-full rounded-t-2xl p-6 flex flex-col gap-4"
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 id="clear-dialog-title" className="font-serif text-lg font-bold text-warm-primary">
              Clear grocery list?
            </h2>
            <p className="font-sans text-warm-secondary text-sm">
              This will remove all items from the current grocery list.
            </p>
            <button
              onClick={() => { setConfirmClear(false); deleteAll() }}
              className="w-full bg-red-500 text-white font-sans font-semibold text-sm py-3 rounded-xl min-h-[44px] cursor-pointer touch-manipulation"
            >
              Clear all
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="w-full border border-warm-border text-warm-primary font-sans text-sm py-3 rounded-xl min-h-[44px] bg-warm-card active:bg-warm-surface cursor-pointer touch-manipulation"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify in dev server**

Open Grocery tab. Confirm:
- "Other" section always shows at the bottom (even when empty)
- Each recipe group has a ghost "add item…" row at the bottom
- Tapping the ghost row opens an input; ✓ adds the item, ✕ cancels
- FAB is gone

- [ ] **Step 4: Commit**

```bash
git add src/components/grocery/GroceryGroup.tsx src/pages/GroceryPage.tsx
git commit -m "feat: grocery inline add per group, permanent Other section, remove FAB"
```

---

## Task 7: Add to grocery list — RecipeDetailPage

**Files:**
- Modify: `src/pages/RecipeDetailPage.tsx`

- [ ] **Step 1: Add multiplier tracking and grocery button to `RecipeDetailPage.tsx`**

After the existing imports, add:
```typescript
import { useAddRecipeToGrocery } from '../hooks/useGroceryList'
import { getLocalDateStr } from '../hooks/useMealPlan'
import { scaleIngredients } from '../utils/servingScaler'
import { useToast } from '../contexts/ToastContext'
```

Add state near the top of the component body (after existing `useState` calls):
```typescript
const [servingMultiplier, setServingMultiplier] = useState(1)
const { mutate: addToGrocery, isPending: isAddingToGrocery } = useAddRecipeToGrocery()
const { showToast } = useToast()
```

Replace the `ServingScaler` usage in the ingredients section:
```typescript
{section === 'ingredients' && (
  <div className="flex flex-col gap-4">
    <ServingScaler
      ingredients={recipe.ingredients}
      baseServings={recipe.servings}
      onScaleChange={(multiplier) => setServingMultiplier(multiplier)}
    />
    <button
      onClick={() => {
        const weekStart = getLocalDateStr(0)
        const scaled = scaleIngredients(recipe.ingredients, servingMultiplier)
        const lines = scaled.split('\n').filter(l => l.trim())
        addToGrocery(
          {
            weekStart,
            recipeId: recipe.id,
            items: lines.map(text => ({ text: text.trim(), is_checked: false })),
          },
          { onSuccess: () => showToast('Added to grocery list') }
        )
      }}
      disabled={isAddingToGrocery}
      className="w-full bg-warm-accent text-white font-sans font-semibold text-sm py-3 rounded-xl min-h-[44px] active:opacity-80 disabled:opacity-50 cursor-pointer touch-manipulation flex items-center justify-center gap-2"
    >
      🛒 Add to grocery list
    </button>
    <p className="font-sans text-warm-muted text-xs text-center -mt-2">
      All ingredients · {Math.round(recipe.servings! * servingMultiplier) || (recipe.servings ?? 1)} servings · added to this week's list
    </p>
  </div>
)}
```

- [ ] **Step 2: Verify in dev server**

Open a recipe → Ingredients tab. Confirm: scaler shows, "Add to grocery list" button below, tapping it adds all (scaled) ingredients to Grocery tab and shows a toast.

- [ ] **Step 3: Commit**

```bash
git add src/pages/RecipeDetailPage.tsx
git commit -m "feat: add to grocery list button in recipe detail ingredients tab"
```

---

## Task 8: FridgeContext, routing, and TabBar

**Files:**
- Create: `src/contexts/FridgeContext.tsx`
- Modify: `src/components/layout/AppShell.tsx`
- Modify: `src/components/layout/TabBar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `src/contexts/FridgeContext.tsx`**

```typescript
import { createContext, useContext, useState, type ReactNode } from 'react'

type FridgeStatus = 'empty' | 'scanning' | 'results' | 'error'

interface FridgeState {
  status: FridgeStatus
  detected: string[]
  error: string | null
}

interface FridgeContextValue extends FridgeState {
  startScan: () => void
  setScanResult: (detected: string[]) => void
  setScanError: (msg: string) => void
  updateDetected: (detected: string[]) => void
  reset: () => void
}

const FridgeContext = createContext<FridgeContextValue | null>(null)

export function FridgeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FridgeState>({
    status: 'empty',
    detected: [],
    error: null,
  })

  return (
    <FridgeContext.Provider
      value={{
        ...state,
        startScan: () => setState({ status: 'scanning', detected: [], error: null }),
        setScanResult: (detected) => setState({ status: 'results', detected, error: null }),
        setScanError: (msg) => setState({ status: 'error', detected: [], error: msg }),
        updateDetected: (detected) => setState(s => ({ ...s, detected })),
        reset: () => setState({ status: 'empty', detected: [], error: null }),
      }}
    >
      {children}
    </FridgeContext.Provider>
  )
}

export function useFridge() {
  const ctx = useContext(FridgeContext)
  if (!ctx) throw new Error('useFridge must be used within FridgeProvider')
  return ctx
}
```

- [ ] **Step 2: Wrap `AppShell` with `FridgeProvider`**

In `src/components/layout/AppShell.tsx`:

```typescript
import { Outlet, ScrollRestoration } from 'react-router-dom'
import { TabBar } from './TabBar'
import { Fab } from './Fab'
import { GeminiKeyProvider } from '../../contexts/GeminiKeyContext'
import { FridgeProvider } from '../../contexts/FridgeContext'
import { Toast } from '../Toast'
import { ToastProvider, useToast } from '../../contexts/ToastContext'

function ShellInner() {
  const { toasts, dismissToast } = useToast()
  return (
    <GeminiKeyProvider>
      <FridgeProvider>
        <ScrollRestoration />
        <div className="min-h-screen bg-warm-base">
          <main className="pb-[calc(60px+env(safe-area-inset-bottom))]">
            <Outlet />
          </main>
          <Fab />
          <TabBar />
          <Toast toasts={toasts} onDismiss={dismissToast} />
        </div>
      </FridgeProvider>
    </GeminiKeyProvider>
  )
}

export function AppShell() {
  return <ToastProvider><ShellInner /></ToastProvider>
}
```

- [ ] **Step 3: Add Fridge tab to `TabBar.tsx`**

```typescript
import { NavLink } from 'react-router-dom'
import { BookOpen, CalendarDays, ShoppingCart, Settings, Snowflake } from 'lucide-react'

const tabs = [
  { to: '/recipes',  icon: BookOpen,    label: 'Recipes'  },
  { to: '/planner',  icon: CalendarDays, label: 'Planner'  },
  { to: '/fridge',   icon: Snowflake,   label: 'Fridge'   },
  { to: '/grocery',  icon: ShoppingCart, label: 'Grocery'  },
  { to: '/settings', icon: Settings,    label: 'Settings' },
]

export function TabBar() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-warm-base border-t border-warm-border flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[60px] cursor-pointer touch-manipulation ${
              isActive ? 'text-warm-accent' : 'text-warm-secondary'
            }`
          }
        >
          <Icon className="w-5 h-5" aria-hidden="true" />
          <span className="font-sans text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 4: Add routes to `App.tsx`**

```typescript
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { RecipesPage } from './pages/RecipesPage'
import { PlannerPage } from './pages/PlannerPage'
import { GroceryPage } from './pages/GroceryPage'
import { SettingsPage } from './pages/SettingsPage'
import { AddRecipePage } from './pages/AddRecipePage'
import { EditRecipePage } from './pages/EditRecipePage'
import { RecipeDetailPage } from './pages/RecipeDetailPage'
import { ShareTargetPage } from './pages/ShareTargetPage'
import { FridgePage } from './pages/FridgePage'
import { FridgeRecipeDetailPage } from './pages/FridgeRecipeDetailPage'

const ProtectedShell = () => (
  <ProtectedRoute>
    <AppShell />
  </ProtectedRoute>
)

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedShell />,
    children: [
      { path: '/recipes',               element: <RecipesPage /> },
      { path: '/recipes/new',           element: <AddRecipePage /> },
      { path: '/recipes/:id/edit',      element: <EditRecipePage /> },
      { path: '/recipes/:id',           element: <RecipeDetailPage /> },
      { path: '/planner',               element: <PlannerPage /> },
      { path: '/fridge',                element: <FridgePage /> },
      { path: '/fridge/recipe/:id',     element: <FridgeRecipeDetailPage /> },
      { path: '/grocery',               element: <GroceryPage /> },
      { path: '/settings',              element: <SettingsPage /> },
      { path: '/',                      element: <Navigate to="/recipes" replace /> },
      { path: '/share-target',          element: <ShareTargetPage /> },
    ],
  },
])
```

- [ ] **Step 5: Run dev server — confirm Fridge tab appears and routes resolve**

Navigate to `/fridge` — the app should render (page not yet implemented; a blank screen or "not found" is fine at this point since the components don't exist yet). Confirm the tab bar shows 5 tabs with Fridge between Planner and Grocery.

- [ ] **Step 6: Commit**

```bash
git add src/contexts/FridgeContext.tsx src/components/layout/AppShell.tsx src/components/layout/TabBar.tsx src/App.tsx
git commit -m "feat: FridgeContext, Fridge tab, /fridge routes"
```

---

## Task 9: FridgePage and FridgeRecipeCard

**Files:**
- Create: `src/components/fridge/FridgeRecipeCard.tsx`
- Create: `src/pages/FridgePage.tsx`

- [ ] **Step 1: Create `src/components/fridge/FridgeRecipeCard.tsx`**

```typescript
import { Link } from 'react-router-dom'
import { Heart, Utensils } from 'lucide-react'
import { useToggleFavourite } from '../../hooks/useRecipes'
import type { FridgeRecipe } from '../../utils/recipeFilter'

interface FridgeRecipeCardProps {
  recipe: FridgeRecipe
}

export function FridgeRecipeCard({ recipe }: FridgeRecipeCardProps) {
  const { mutate: toggleFav } = useToggleFavourite()
  const totalMins = (recipe.prep_time_mins ?? 0) + (recipe.cook_time_mins ?? 0)

  return (
    <article className="bg-warm-card border border-warm-border rounded-xl overflow-hidden relative">
      <Link to={`/fridge/recipe/${recipe.id}`} className="block active:opacity-90 transition-opacity duration-150">
        <div className="aspect-square bg-warm-surface">
          {(recipe.image_urls?.[0] ?? recipe.image_url)
            ? <img src={recipe.image_urls?.[0] ?? recipe.image_url!} alt={recipe.title} className="w-full h-full object-cover" />
            : <div aria-hidden className="w-full h-full flex items-center justify-center"><Utensils className="w-10 h-10 text-warm-muted" /></div>
          }
        </div>
        {/* Match badge */}
        <div className="absolute top-2 left-2 bg-warm-accent text-white font-sans font-bold text-[10px] px-1.5 py-0.5 rounded-md leading-none">
          {recipe.fridgeMatched}/{recipe.fridgeTotal}
        </div>
        <div className="p-3">
          <h3 className="font-sans font-semibold text-warm-primary text-sm leading-snug line-clamp-2">{recipe.title}</h3>
          {totalMins > 0 && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="font-sans text-warm-secondary text-xs">{totalMins} min</span>
            </div>
          )}
        </div>
      </Link>
      <button
        onClick={() => toggleFav({ id: recipe.id, is_favourite: !recipe.is_favourite })}
        aria-label={recipe.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
        className="absolute top-2 right-2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-warm-base/70 rounded-full cursor-pointer touch-manipulation"
      >
        <Heart className={`w-4 h-4 transition-colors duration-150 ${recipe.is_favourite ? 'fill-warm-accent text-warm-accent' : 'text-warm-secondary'}`} />
      </button>
    </article>
  )
}
```

- [ ] **Step 2: Create `src/pages/FridgePage.tsx`**

```typescript
import { useRef, useState } from 'react'
import { RotateCcw, Camera } from 'lucide-react'
import { useFridge } from '../contexts/FridgeContext'
import { useGeminiKey } from '../contexts/GeminiKeyContext'
import { useRecipes } from '../hooks/useRecipes'
import { filterByFridge } from '../utils/recipeFilter'
import { detectFridgeIngredients } from '../lib/gemini'
import { detectFridgeIngredientsWithGroq } from '../lib/groq'
import { GeminiKeyBanner } from '../components/auth/GeminiKeyBanner'
import { FridgeRecipeCard } from '../components/fridge/FridgeRecipeCard'
import { useToast } from '../contexts/ToastContext'

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function FridgePage() {
  const { status, detected, startScan, setScanResult, setScanError, updateDetected, reset } =
    useFridge()
  const { geminiKey, groqKey, provider, isLoading: keyLoading } = useGeminiKey()
  const { data: recipes = [] } = useRecipes()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [addText, setAddText] = useState('')

  const hasKey = provider === 'groq' ? !!groqKey : !!geminiKey

  const openCamera = () => fileInputRef.current?.click()

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    startScan()
    try {
      const base64 = await fileToBase64(file)
      const ingredients =
        provider === 'groq' && groqKey
          ? await detectFridgeIngredientsWithGroq(base64, file.type, groqKey)
          : await detectFridgeIngredients(base64, file.type, geminiKey!)
      setScanResult(ingredients)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to scan fridge'
      setScanError(msg)
      showToast(msg, 'error')
    }
  }

  const addChip = () => {
    const text = addText.trim().toLowerCase()
    if (!text) return
    if (!detected.includes(text)) updateDetected([...detected, text])
    setAddText('')
  }

  const removeChip = (chip: string) => updateDetected(detected.filter(d => d !== chip))

  const fridgeRecipes = filterByFridge(recipes, detected)

  if (keyLoading) return <div className="min-h-screen bg-warm-base" />

  return (
    <div className="px-4 pt-4 flex flex-col gap-3 min-h-screen bg-warm-base">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-warm-primary">Fridge</h1>
        {status === 'results' && (
          <button
            onClick={() => { reset(); openCamera() }}
            aria-label="Rescan"
            className="flex items-center gap-1.5 font-sans text-sm text-warm-accent cursor-pointer touch-manipulation"
          >
            <RotateCcw className="w-4 h-4" />
            Rescan
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {!hasKey && <GeminiKeyBanner />}

      {hasKey && status === 'empty' && (
        <div className="flex flex-col items-center justify-center flex-1 py-20 gap-4">
          <button
            onClick={openCamera}
            className="flex flex-col items-center gap-3 cursor-pointer touch-manipulation active:opacity-70"
          >
            <div className="w-20 h-20 rounded-full bg-warm-accent/10 flex items-center justify-center">
              <Camera className="w-10 h-10 text-warm-accent" />
            </div>
            <p className="font-sans text-warm-secondary text-base">Tap to scan your fridge</p>
          </button>
        </div>
      )}

      {status === 'scanning' && (
        <div className="flex flex-col items-center justify-center flex-1 py-20 gap-3">
          <div className="w-8 h-8 border-2 border-warm-accent border-t-transparent rounded-full animate-spin" />
          <p className="font-sans text-warm-secondary text-sm">Scanning fridge…</p>
        </div>
      )}

      {status === 'results' && (
        <>
          {/* Chip add input */}
          <div className="flex items-center gap-2 bg-warm-card border border-warm-accent rounded-2xl px-3 py-1.5 min-h-[40px]">
            <span className="text-warm-accent font-bold text-lg leading-none">+</span>
            <input
              type="text"
              value={addText}
              onChange={e => setAddText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addChip() }}
              placeholder="add ingredient…"
              className="flex-1 font-sans text-sm bg-transparent border-none outline-none text-warm-primary placeholder:text-warm-muted"
            />
            {addText.trim() && (
              <button
                onClick={addChip}
                className="font-sans text-xs text-warm-accent font-semibold cursor-pointer touch-manipulation"
              >
                Add
              </button>
            )}
          </div>

          {/* Detected ingredient chips */}
          {detected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {detected.map(chip => (
                <button
                  key={chip}
                  onClick={() => removeChip(chip)}
                  className="flex items-center gap-1 bg-warm-accent/10 text-warm-accent border border-warm-accent/30 rounded-full px-3 py-1 font-sans text-sm cursor-pointer touch-manipulation active:opacity-70"
                >
                  {chip}
                  <span className="text-warm-accent/60 text-xs leading-none">×</span>
                </button>
              ))}
            </div>
          )}

          {/* Recipe grid */}
          {fridgeRecipes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
              <p className="font-serif text-warm-secondary text-lg">No matches found</p>
              <p className="font-sans text-warm-muted text-sm">Try adding more ingredients or rescanning</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-8">
              {fridgeRecipes.map(r => (
                <FridgeRecipeCard key={r.id} recipe={r} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run dev server and test the full fridge flow**

Navigate to Fridge tab. If no AI key: GeminiKeyBanner shows. With key: camera icon shows. Take a photo (or upload from gallery on desktop). Confirm scanning spinner, then chips appear. Add/remove chips, confirm recipe grid updates. Confirm match badges on cards.

- [ ] **Step 4: Commit**

```bash
git add src/components/fridge/FridgeRecipeCard.tsx src/pages/FridgePage.tsx
git commit -m "feat: FridgePage — camera scan, ingredient chips, fridge recipe grid"
```

---

## Task 10: FridgeRecipeDetailPage

**Files:**
- Create: `src/pages/FridgeRecipeDetailPage.tsx`

- [ ] **Step 1: Create `src/pages/FridgeRecipeDetailPage.tsx`**

```typescript
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Heart, Pencil, Trash2 } from 'lucide-react'
import { useRecipe } from '../hooks/useRecipe'
import { useDeleteRecipe, useToggleFavourite } from '../hooks/useRecipes'
import { useAddRecipeToGrocery } from '../hooks/useGroceryList'
import { useFridge } from '../contexts/FridgeContext'
import { useToast } from '../contexts/ToastContext'
import { ServingScaler } from '../components/recipes/ServingScaler'
import { getFridgeIngredientBreakdown } from '../utils/recipeFilter'
import { scaleIngredients } from '../utils/servingScaler'
import { getLocalDateStr } from '../hooks/useMealPlan'

export function FridgeRecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: recipe, isLoading, isError } = useRecipe(id ?? '')
  const { mutateAsync: deleteRecipe, isPending: isDeleting } = useDeleteRecipe()
  const { mutate: toggleFav } = useToggleFavourite()
  const { mutate: addToGrocery, isPending: isAddingToGrocery } = useAddRecipeToGrocery()
  const { detected } = useFridge()
  const { showToast } = useToast()
  const [multiplier, setMultiplier] = useState(1)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (isLoading) return <div className="min-h-screen bg-warm-base" />
  if (isError || !recipe) return (
    <div className="min-h-screen bg-warm-base flex flex-col items-center justify-center gap-4 px-4">
      <p className="font-serif text-warm-secondary text-lg">Recipe not found</p>
      <button onClick={() => navigate('/fridge')} className="font-sans text-warm-accent text-sm cursor-pointer touch-manipulation">
        Back to fridge
      </button>
    </div>
  )

  const base = Math.max(1, recipe.servings ?? 1)
  const selected = Math.round(base * multiplier)
  const { matched, missing } = getFridgeIngredientBreakdown(recipe, detected, multiplier)

  const handleAddToGrocery = () => {
    const weekStart = getLocalDateStr(0)
    const scaled = scaleIngredients(recipe.ingredients, multiplier)
    const allLines = scaled.split('\n').filter(l => l.trim())
    const matchedScaled = matched.map(m => m.scaledIngredient.trim())
    addToGrocery(
      {
        weekStart,
        recipeId: recipe.id,
        items: allLines.map(text => ({
          text: text.trim(),
          is_checked: matchedScaled.some(m => text.trim().toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(text.trim().toLowerCase())),
        })),
      },
      {
        onSuccess: () => {
          showToast('Added to grocery list')
          navigate('/grocery')
        },
      }
    )
  }

  return (
    <div className="bg-warm-base min-h-screen">
      {/* Top bar — identical to RecipeDetailPage */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 cursor-pointer touch-manipulation"
        >
          <ChevronLeft className="w-5 h-5 text-warm-primary" />
        </button>
        <div className="flex">
          <button
            onClick={() => toggleFav({ id: recipe.id, is_favourite: !recipe.is_favourite })}
            aria-label={recipe.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer touch-manipulation"
          >
            <Heart className={`w-5 h-5 ${recipe.is_favourite ? 'fill-warm-accent text-warm-accent' : 'text-warm-secondary'}`} />
          </button>
          <button
            onClick={() => navigate(`/recipes/${id}/edit`)}
            aria-label="Edit recipe"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer touch-manipulation"
          >
            <Pencil className="w-5 h-5 text-warm-secondary" />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete recipe"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer touch-manipulation"
          >
            <Trash2 className="w-5 h-5 text-red-600" />
          </button>
        </div>
      </div>

      {/* Recipe image */}
      {(recipe.image_urls?.[0] ?? recipe.image_url) && (
        <div className="w-full aspect-video bg-warm-surface">
          <img
            src={recipe.image_urls?.[0] ?? recipe.image_url!}
            alt={recipe.title}
            className="w-full h-full object-cover"
            loading="eager"
            decoding="async"
          />
        </div>
      )}

      <div className="px-4 pt-4 pb-8 flex flex-col gap-4">
        {/* Title + meta */}
        <div>
          <h1 className="font-serif text-2xl font-bold text-warm-primary mb-1">{recipe.title}</h1>
          <div className="flex flex-wrap gap-3 font-sans text-warm-secondary text-sm mb-2">
            {recipe.prep_time_mins ? <span>Prep {recipe.prep_time_mins} min</span> : null}
            {recipe.cook_time_mins ? <span>Cook {recipe.cook_time_mins} min</span> : null}
            {recipe.rating ? <span>{'★'.repeat(Math.min(3, Math.max(0, Math.floor(recipe.rating))))}</span> : null}
          </div>
          {(recipe.categories?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {recipe.categories?.map(c => (
                <span key={c} className="bg-warm-surface text-warm-secondary font-sans text-xs px-2 py-1 rounded-full">{c}</span>
              ))}
            </div>
          )}
          {/* Fridge match badge */}
          <div className="inline-flex items-center gap-1.5 bg-warm-accent/10 border border-warm-accent/30 rounded-full px-3 py-1 font-sans text-sm text-warm-accent">
            🧊 {matched.length} of {matched.length + missing.length} ingredients in your fridge
          </div>
        </div>

        {/* Serving scaler */}
        <ServingScaler
          ingredients={recipe.ingredients}
          baseServings={recipe.servings}
          onScaleChange={(m) => setMultiplier(m)}
        />

        {/* Detected section */}
        {matched.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-sans font-semibold text-[12px] text-green-600">✓ Detected</span>
              <div className="flex-1 h-px bg-green-100" />
            </div>
            <div className="flex flex-col gap-2">
              {matched.map((item, i) => (
                <div key={i} className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <div className="font-sans font-semibold text-sm text-green-800 capitalize">{item.detectedName}</div>
                  <div className="font-sans text-[11px] text-green-600 mt-0.5">{item.scaledIngredient}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Still need section */}
        {missing.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-sans font-semibold text-[12px] text-warm-secondary">○ Still need</span>
              <div className="flex-1 h-px bg-warm-border" />
            </div>
            <div className="flex flex-col gap-2">
              {missing.map((item, i) => (
                <div key={i} className="bg-warm-card border border-warm-border rounded-lg px-3 py-2">
                  <div className="font-sans font-semibold text-sm text-warm-muted capitalize">
                    {item.scaledIngredient.replace(/^\d+(\.\d+)?(\s*\/\s*\d+)?\s*\S*\s*/i, '') || item.scaledIngredient}
                  </div>
                  <div className="font-sans text-[11px] text-warm-muted mt-0.5">{item.scaledIngredient}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pantry note */}
        <p className="font-sans text-warm-muted text-xs italic">
          Salt, pepper &amp; spices assumed in pantry
        </p>

        {/* Add to grocery list */}
        <button
          onClick={handleAddToGrocery}
          disabled={isAddingToGrocery}
          className="w-full bg-warm-accent text-white font-sans font-semibold text-sm py-3 rounded-xl min-h-[44px] active:opacity-80 disabled:opacity-50 cursor-pointer touch-manipulation"
        >
          🛒 Add to grocery list
        </button>
        <p className="font-sans text-warm-muted text-xs text-center -mt-2">
          Detected items added as checked · missing as open · {selected} servings
        </p>
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-40 bg-warm-primary/30 backdrop-blur-sm flex items-end"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="bg-warm-card w-full rounded-t-2xl p-6 flex flex-col gap-4"
            role="dialog"
            aria-modal="true"
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="font-serif text-lg font-bold text-warm-primary">Delete Recipe?</h2>
            <p className="font-sans text-warm-secondary text-sm">This cannot be undone.</p>
            <button
              onClick={async () => { await deleteRecipe(recipe.id); navigate('/fridge') }}
              disabled={isDeleting}
              className="w-full bg-red-600 text-white font-sans font-semibold text-sm py-3 rounded-xl min-h-[44px] cursor-pointer touch-manipulation"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="w-full border border-warm-border text-warm-primary font-sans text-sm py-3 rounded-xl min-h-[44px] bg-warm-card active:bg-warm-surface cursor-pointer touch-manipulation"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run dev server and test the full fridge → recipe detail flow**

1. Scan fridge (or manually add chips like "chicken", "garlic", "lemon")
2. Tap a matched recipe card
3. Confirm: identical header, match badge, serving scaler, Detected section (green), Still need section (grey)
4. Change servings — confirm scaled quantities update in both sections
5. Tap "Add to grocery list" — confirm toast, navigation to Grocery, detected items pre-checked, missing open
6. Tap back — confirm fridge results still showing same chips

- [ ] **Step 3: Run lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 4: Commit and push**

```bash
git add src/pages/FridgeRecipeDetailPage.tsx
git commit -m "feat: FridgeRecipeDetailPage — detected/missing breakdown, serving scaler, grocery add"
git push
```

---

## Self-Review Checklist

- [x] **Spec §1 Navigation** — covered in Task 8 (TabBar, routes, FridgeContext first-tap logic in FridgePage)
- [x] **Spec §2 AI Detection** — covered in Task 2
- [x] **Spec §3 Matching Algorithm** — covered in Task 1 (TDD)
- [x] **Spec §4 FridgeContext** — covered in Task 8
- [x] **Spec §5 FridgePage: key check** — `GeminiKeyBanner` rendered when `!hasKey` in Task 9
- [x] **Spec §5 FridgePage: all states** — empty / scanning / results / error all covered in Task 9
- [x] **Spec §6 FridgeRecipeDetailPage** — covered in Task 10
- [x] **Spec §7 Grocery: editable item** — covered in Task 5
- [x] **Spec §7 Grocery: inline add** — covered in Task 6
- [x] **Spec §7 Grocery: permanent Other** — covered in Task 6
- [x] **Spec §8 ServingScaler** — covered in Task 3
- [x] **Spec §9 RecipeDetailPage grocery button** — covered in Task 7
- [x] **Spec §10 Routing** — covered in Task 8
- [x] **Type consistency** — `FridgeRecipe` defined in Task 1, used in Tasks 9 and 10. `onScaleChange(multiplier, selected)` defined in Task 3, consumed in Tasks 7 and 10. `useAddRecipeToGrocery` defined in Task 4, used in Tasks 7 and 10.
