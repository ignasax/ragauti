# AI Fridge Recipe Suggestions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 2 lazy-generating AI recipe suggestion cards to the Fridge page that call the user's configured provider and display the full recipe in the same visual style as `FridgeRecipeDetailPage`.

**Architecture:** Two placeholder cards appear when fridge ingredients are detected; tapping each card independently calls Gemini or Groq to generate a complete recipe JSON; the result renders inline using the existing `getFridgeIngredientBreakdown` util, `ServingScaler` component, and `useAddRecipe` mutation for saving. No new routes, no new DB tables.

**Tech Stack:** React, TypeScript, TanStack Query, `@google/generative-ai` SDK, Groq REST API, Tailwind CSS

---

## File Map

| File | Change |
|---|---|
| `src/lib/gemini.ts` | Export `GeneratedRecipe` interface + `parseGeneratedRecipe` helper + `generateFridgeRecipe` function |
| `src/lib/groq.ts` | Import `GeneratedRecipe`/`parseGeneratedRecipe` from gemini.ts + add `generateFridgeRecipeWithGroq` |
| `src/components/fridge/AISuggestionCard.tsx` | **New** — placeholder / loading / error / generated states, calls AI, saves recipe |
| `src/pages/FridgePage.tsx` | Add AI suggestions section (2 × `AISuggestionCard`) below the collection grid |

---

### Task 1: `GeneratedRecipe` type + Gemini generator

**Files:**
- Modify: `src/lib/gemini.ts`

- [ ] **Step 1: Add `GeneratedRecipe` interface and exported `parseGeneratedRecipe` helper**

Open `src/lib/gemini.ts`. After the closing `}` of the `ExtractedRecipe` interface (after the `servings?: number` line), insert:

```ts
export interface GeneratedRecipe {
  title: string
  prep_time_mins: number | null
  cook_time_mins: number | null
  servings: number
  ingredients: string   // one ingredient per line, e.g. "2 chicken breasts\n4 cloves garlic"
  instructions: string  // numbered steps joined with \n, e.g. "1. Season chicken.\n2. Heat pan."
}

export function parseGeneratedRecipe(content: string): GeneratedRecipe {
  let raw: string
  try {
    JSON.parse(content)
    raw = content
  } catch {
    const cleaned = content.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON in AI response')
    raw = match[0]
  }
  const obj = JSON.parse(raw) as Record<string, unknown>
  return {
    title:          typeof obj.title === 'string'          ? obj.title.slice(0, 100) : 'Untitled Recipe',
    prep_time_mins: typeof obj.prep_time_mins === 'number' ? obj.prep_time_mins       : null,
    cook_time_mins: typeof obj.cook_time_mins === 'number' ? obj.cook_time_mins       : null,
    servings:       typeof obj.servings === 'number' && obj.servings > 0 ? obj.servings : 2,
    ingredients:    typeof obj.ingredients === 'string'    ? obj.ingredients.trim()   : '',
    instructions:   Array.isArray(obj.instructions)
      ? (obj.instructions as string[]).map((s, i) => `${i + 1}. ${String(s)}`).join('\n')
      : typeof obj.instructions === 'string'
        ? obj.instructions.trim()
        : '',
  }
}
```

- [ ] **Step 2: Add `generateFridgeRecipe` at the end of `src/lib/gemini.ts`**

```ts
const FRIDGE_SLOT_STYLE = ['quick weeknight', 'hearty or creative'] as const

export async function generateFridgeRecipe(
  detected: string[],
  slotIndex: number,
  apiKey: string
): Promise<GeneratedRecipe> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })
  const style = FRIDGE_SLOT_STYLE[slotIndex % 2]

  const prompt = `You are a helpful cooking assistant. The user has these ingredients in their fridge:
${detected.join(', ')}

Suggest a ${style} recipe that uses as many of these ingredients as possible. Respond ONLY with valid JSON matching this exact schema:
{
  "title": "Recipe name",
  "prep_time_mins": 10,
  "cook_time_mins": 25,
  "servings": 2,
  "ingredients": "2 chicken breasts\\n4 cloves garlic, minced\\n1 tbsp olive oil",
  "instructions": ["Season chicken with salt and pepper.", "Heat oil in pan over medium heat.", "Cook chicken 6 min per side until golden."]
}

Rules:
- ingredients: one ingredient with quantity per line, joined with \\n
- instructions: array of plain step strings, no numbering (numbers added automatically)
- Use ONLY the provided ingredients plus salt, pepper, and basic pantry staples
- Return ONLY the JSON object, no explanation, no markdown`

  const result = await model.generateContent(prompt)
  return parseGeneratedRecipe(result.response.text())
}
```

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: no errors in `gemini.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/gemini.ts
git commit -m "feat: GeneratedRecipe type + generateFridgeRecipe (Gemini)"
```

---

### Task 2: Groq generator

**Files:**
- Modify: `src/lib/groq.ts`

- [ ] **Step 1: Update the import at the top of `src/lib/groq.ts`**

Change the existing first line from:
```ts
import { extractFromJsonLd, sanitizeExtracted, type ExtractedRecipe } from './gemini'
```
to:
```ts
import { extractFromJsonLd, sanitizeExtracted, parseGeneratedRecipe, type ExtractedRecipe, type GeneratedRecipe } from './gemini'
```

- [ ] **Step 2: Add `generateFridgeRecipeWithGroq` at the end of `src/lib/groq.ts`**

```ts
export async function generateFridgeRecipeWithGroq(
  detected: string[],
  slotIndex: number,
  apiKey: string
): Promise<GeneratedRecipe> {
  const style = slotIndex % 2 === 0 ? 'quick weeknight' : 'hearty or creative'
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful cooking assistant. Respond with a single valid JSON object and nothing else — no markdown, no explanation, no code fences.',
        },
        {
          role: 'user',
          content: `The user has these ingredients in their fridge:
${detected.join(', ')}

Suggest a ${style} recipe that uses as many of these ingredients as possible. Respond ONLY with valid JSON matching this exact schema:
{
  "title": "Recipe name",
  "prep_time_mins": 10,
  "cook_time_mins": 25,
  "servings": 2,
  "ingredients": "2 chicken breasts\\n4 cloves garlic, minced\\n1 tbsp olive oil",
  "instructions": ["Season chicken with salt and pepper.", "Heat oil in pan over medium heat.", "Cook chicken 6 min per side until golden."]
}

Rules:
- ingredients: one ingredient with quantity per line, joined with \\n
- instructions: array of plain step strings, no numbering
- Use ONLY the provided ingredients plus salt, pepper, and basic pantry staples`,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(
      (body as { error?: { message?: string } } | null)?.error?.message ?? `Groq error ${res.status}`
    )
  }

  const data = await res.json()
  return parseGeneratedRecipe((data.choices?.[0]?.message?.content ?? '') as string)
}
```

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: no errors in `groq.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/groq.ts
git commit -m "feat: generateFridgeRecipeWithGroq"
```

---

### Task 3: `AISuggestionCard` component

**Files:**
- Create: `src/components/fridge/AISuggestionCard.tsx`

- [ ] **Step 1: Create `src/components/fridge/AISuggestionCard.tsx` with full content**

```tsx
import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { ServingScaler } from '../recipes/ServingScaler'
import { useAddRecipe } from '../../hooks/useRecipes'
import { generateFridgeRecipe, type GeneratedRecipe } from '../../lib/gemini'
import { generateFridgeRecipeWithGroq } from '../../lib/groq'
import { getFridgeIngredientBreakdown } from '../../utils/recipeFilter'
import type { Recipe } from '../../types/app'

interface AISuggestionCardProps {
  slotIndex: number
  detected: string[]
  provider: 'gemini' | 'groq'
  geminiKey: string | null
  groqKey: string | null
}

type CardStatus = 'idle' | 'loading' | 'done' | 'error'

export function AISuggestionCard({ slotIndex, detected, provider, geminiKey, groqKey }: AISuggestionCardProps) {
  const [status, setStatus] = useState<CardStatus>('idle')
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null)
  const [multiplier, setMultiplier] = useState(1)
  const [saved, setSaved] = useState(false)
  const { mutate: addRecipe, isPending: isSaving } = useAddRecipe()

  const generate = async () => {
    if (!detected.length) return
    const key = provider === 'groq' ? groqKey : geminiKey
    if (!key) return
    setStatus('loading')
    setRecipe(null)
    setSaved(false)
    setMultiplier(1)
    try {
      const result =
        provider === 'groq'
          ? await generateFridgeRecipeWithGroq(detected, slotIndex, key)
          : await generateFridgeRecipe(detected, slotIndex, key)
      setRecipe(result)
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  const handleSave = () => {
    if (!recipe) return
    const toSave: Omit<Recipe, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
      title: recipe.title,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      prep_time_mins: recipe.prep_time_mins,
      cook_time_mins: recipe.cook_time_mins,
      servings: recipe.servings,
      rating: null,
      categories: [],
      comments: null,
      is_favourite: false,
      source_url: null,
      image_url: null,
      image_urls: [],
    }
    addRecipe(toSave, { onSuccess: () => setSaved(true) })
  }

  if (status === 'idle') {
    return (
      <button
        onClick={generate}
        className="w-full bg-warm-card border-2 border-dashed border-warm-border rounded-2xl p-4 flex items-center gap-4 cursor-pointer touch-manipulation active:opacity-70 text-left"
      >
        <div className="w-11 h-11 rounded-xl bg-warm-accent/10 flex items-center justify-center flex-shrink-0 text-xl">
          ✨
        </div>
        <div>
          <div className="font-sans font-semibold text-sm text-warm-primary">Suggest a recipe</div>
          <div className="font-sans text-xs text-warm-secondary mt-0.5">AI picks something from your fridge</div>
        </div>
      </button>
    )
  }

  if (status === 'loading') {
    return (
      <div className="w-full bg-warm-card border border-warm-border rounded-2xl p-4 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-warm-surface flex items-center justify-center flex-shrink-0">
          <div className="w-5 h-5 border-2 border-warm-border border-t-warm-accent rounded-full animate-spin" />
        </div>
        <span className="font-sans text-sm text-warm-muted">Thinking about your ingredients…</span>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <button
        onClick={generate}
        className="w-full bg-warm-card border-2 border-dashed border-warm-border rounded-2xl p-4 flex items-center gap-4 cursor-pointer touch-manipulation active:opacity-70 text-left"
      >
        <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 text-xl">
          ⚠️
        </div>
        <div>
          <div className="font-sans font-semibold text-sm text-warm-primary">Generation failed</div>
          <div className="font-sans text-xs text-warm-accent mt-0.5">Tap to try again</div>
        </div>
      </button>
    )
  }

  // status === 'done'
  const r = recipe!
  const recipeForBreakdown = { ingredients: r.ingredients, servings: r.servings } as Recipe
  const { matched, missing } = getFridgeIngredientBreakdown(recipeForBreakdown, detected, multiplier)
  const steps = r.instructions.split('\n').filter(Boolean)
  const totalTime = (r.prep_time_mins ?? 0) + (r.cook_time_mins ?? 0)

  return (
    <div className="bg-warm-card border border-warm-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="font-serif text-xl font-bold text-warm-primary leading-tight">{r.title}</h3>
          <div className="flex items-center flex-nowrap font-sans text-warm-secondary text-sm mt-1 overflow-hidden">
            {[
              totalTime > 0 ? `${totalTime} min` : null,
              `${Math.round(r.servings * multiplier)} servings`,
            ].filter(Boolean).map((item, i) => (
              <span key={i} className="flex items-center whitespace-nowrap">
                {i > 0 && <span className="mx-2 text-base leading-none text-warm-border select-none">·</span>}
                {item}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={generate}
          aria-label="Regenerate"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-warm-secondary cursor-pointer touch-manipulation flex-shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Fridge badge */}
      <div className="px-4 mb-3">
        <span className="inline-flex items-center gap-1.5 bg-warm-accent/10 border border-warm-accent/30 rounded-full px-3 py-1 font-sans text-sm text-warm-accent">
          🧊 {matched.length} of {matched.length + missing.length} ingredients in your fridge
        </span>
      </div>

      {/* Serving scaler */}
      <div className="px-4 mb-3">
        <ServingScaler
          ingredients={r.ingredients}
          baseServings={r.servings}
          showIngredients={false}
          onScaleChange={(m) => setMultiplier(m)}
        />
      </div>

      {/* Detected */}
      {matched.length > 0 && (
        <div className="px-4 mb-3">
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

      {/* Still need */}
      {missing.length > 0 && (
        <div className="px-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-sans font-semibold text-[12px] text-warm-secondary">○ Still need</span>
            <div className="flex-1 h-px bg-warm-border" />
          </div>
          <div className="flex flex-col gap-2">
            {missing.map((item, i) => (
              <div key={i} className="bg-warm-card border border-warm-border rounded-lg px-3 py-2">
                <div className="font-sans font-semibold text-sm text-warm-muted capitalize">{item.scaledIngredient}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pantry note */}
      <p className="px-4 mb-3 font-sans text-warm-muted text-xs italic">
        Salt, pepper &amp; spices assumed in pantry
      </p>

      {/* Instructions */}
      <div className="px-4 mb-4">
        <div className="font-sans font-bold text-[10px] uppercase tracking-wider text-warm-secondary mb-2">
          Instructions
        </div>
        <div>
          {steps.map((step, i) => {
            const text = step.replace(/^\d+\.\s*/, '')
            return (
              <div key={i} className="flex gap-3 py-2 border-b border-warm-surface last:border-b-0">
                <div className="w-[22px] h-[22px] rounded-full bg-warm-accent text-white font-sans font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="font-sans text-[13px] text-warm-primary leading-[1.55]">{text}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Save button */}
      <div className="px-4 pb-4">
        <button
          onClick={handleSave}
          disabled={isSaving || saved}
          className={`w-full font-sans font-semibold text-sm py-3 rounded-xl min-h-[44px] cursor-pointer touch-manipulation active:opacity-80 disabled:opacity-70 transition-colors ${
            saved ? 'bg-green-600 text-white' : 'bg-warm-accent text-white'
          }`}
        >
          {isSaving ? 'Saving…' : saved ? 'Saved ✓' : 'Save to collection'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no errors in `AISuggestionCard.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/fridge/AISuggestionCard.tsx
git commit -m "feat: AISuggestionCard — placeholder, loading, error, generated states"
```

---

### Task 4: Wire into FridgePage

**Files:**
- Modify: `src/pages/FridgePage.tsx`

- [ ] **Step 1: Add `AISuggestionCard` import**

Add after the `FridgeRecipeCard` import line:

```ts
import { AISuggestionCard } from '../components/fridge/AISuggestionCard'
```

- [ ] **Step 2: Replace the closing section of the `status === 'results'` block**

Find this code (near the end of the results block):

```tsx
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-8">
              {fridgeRecipes.map(r => (
                <FridgeRecipeCard key={r.id} recipe={r} />
              ))}
            </div>
          )}
        </>
```

Replace with:

```tsx
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {fridgeRecipes.map(r => (
                <FridgeRecipeCard key={r.id} recipe={r} />
              ))}
            </div>
          )}

          {/* AI suggestions */}
          <div className="flex flex-col gap-3 pb-8">
            <div className="font-sans font-bold text-[10px] uppercase tracking-wider text-warm-secondary px-1">
              AI Suggestions
            </div>
            {[0, 1].map(slotIndex => (
              <AISuggestionCard
                key={slotIndex}
                slotIndex={slotIndex}
                detected={detected}
                provider={provider}
                geminiKey={geminiKey}
                groqKey={groqKey}
              />
            ))}
          </div>
        </>
```

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Smoke test**

```bash
npm run dev
```

Open `http://localhost:5173`, sign in, go to Fridge tab, scan a photo:

1. Two "Suggest a recipe" dashed placeholder cards appear below the collection grid
2. Tap one → loading spinner with "Thinking about your ingredients…"
3. Card expands to show: Lora title, cook time, 🧊 badge, SERVINGS scaler, ✓ Detected green cards, ○ Still need muted cards, pantry note, numbered instructions, "Save to collection" button
4. Tap ↺ → card resets and regenerates a different recipe
5. Tap "Save to collection" → button turns green "Saved ✓", recipe appears in Recipes tab
6. The other placeholder card remains independent and untouched

- [ ] **Step 5: Commit and push**

```bash
git add src/pages/FridgePage.tsx
git commit -m "feat: AI recipe suggestions section on Fridge page"
git push
```
