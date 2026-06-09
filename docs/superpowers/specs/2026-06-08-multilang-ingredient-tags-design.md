# Multi-Language Ingredient Tags — Design Spec
_2026-06-08_

## What we're building

Add a hidden `ingredient_tags text[]` field to every recipe containing normalized English ingredient names (no quantities, no units). This powers cross-language search and more reliable fridge matching:

- **Cross-language search**: a Lithuanian query "vištiena" translates to "chicken" and matches English recipes with that tag
- **Any-to-any**: a Lithuanian recipe tagged with "chicken" also matches an English search for "chicken"
- **Fridge matching**: AI-detected English names match directly against stored English tags instead of parsing free-form text

Tags are hidden from the user. The `ingredients` text field is unchanged.

---

## Data model

New column on `recipes`:

```sql
ALTER TABLE recipes ADD COLUMN ingredient_tags text[] NOT NULL DEFAULT '{}';
```

Migration: `supabase/migrations/008_ingredient_tags.sql`.

`src/types/app.ts` — `Recipe` gains `ingredient_tags: string[]`.

---

## Tag format

- Lowercase English ingredient names only
- No quantities, units, or preparation notes
- Base name only: `"chicken"` not `"chicken breast fillet"`, `"cream"` not `"35% whipping cream"`
- Array, e.g. `["chicken", "garlic", "cream", "lemon"]`

---

## AI extraction changes

All four extraction functions add `ingredient_tags` to their JSON schema:

```json
{
  "title": "...",
  "ingredients": "...",
  "instructions": "...",
  "ingredient_tags": ["chicken", "garlic", "cream"]
}
```

New rule appended to each prompt:
> `ingredient_tags`: array of lowercase English ingredient names, no quantities, no units, no preparation notes. Just the base name.

Functions updated:
- `extractRecipe` (Gemini, URL/text)
- `extractRecipeFromImage` (Gemini, images)
- `extractRecipeWithGroq` (Groq, URL/text)
- `extractRecipeFromImageWithGroq` (Groq, images)

`ExtractedRecipe` interface gains `ingredient_tags?: string[]`.

`sanitizeExtracted` gains validation:
```ts
if (Array.isArray(obj.ingredient_tags)) {
  result.ingredient_tags = obj.ingredient_tags
    .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    .map(t => t.toLowerCase().trim())
    .slice(0, 100)
}
```

**JSON-LD path** (`extractFromJsonLd`) does NOT generate tags — no AI is involved. Tags are generated on save instead (see below).

---

## Tag generation at save time

When `ExtractedRecipe.ingredient_tags` is absent (JSON-LD path or manual entry), tags are generated with one AI call before the Supabase upsert. If the call fails, save proceeds with `ingredient_tags = []` (non-blocking).

### New functions

**`src/lib/gemini.ts`**:
```ts
export async function generateIngredientTags(
  ingredients: string,
  key: string,
): Promise<string[]>
```

Prompt:
```
Extract a list of English ingredient names from this ingredient list.
Return ONLY a valid JSON array of lowercase strings — no quantities, no units, no preparation notes, just the base name.
Example: ["chicken", "garlic", "cream", "lemon"]

Ingredients:
${ingredients}
```

**`src/lib/groq.ts`**:
```ts
export async function generateIngredientTagsWithGroq(
  ingredients: string,
  key: string,
): Promise<string[]>
```

Same prompt via Groq chat completions with `response_format: { type: 'json_object' }`.

### AddRecipePage save flow

```ts
onSubmit={async (data) => {
  let ingredient_tags = extracted?.ingredient_tags ?? []
  if (!ingredient_tags.length && activeKey) {
    ingredient_tags = await (provider === 'groq'
      ? generateIngredientTagsWithGroq(data.ingredients, activeKey)
      : generateIngredientTags(data.ingredients, activeKey)
    ).catch(() => [])
  }
  await mutateAsync({ ...data, ingredient_tags })
  navigate('/recipes', { replace: true })
}}
```

### EditRecipePage save flow

Always regenerate (ingredients may have changed):

```ts
onSubmit={async (data) => {
  const ingredient_tags = activeKey
    ? await (provider === 'groq'
        ? generateIngredientTagsWithGroq(data.ingredients, activeKey)
        : generateIngredientTags(data.ingredients, activeKey)
      ).catch(() => recipe?.ingredient_tags ?? [])
    : recipe?.ingredient_tags ?? []
  await mutateAsync({ id: id!, ...data, ingredient_tags })
  navigate(`/recipes/${id}`)
}}
```

`EditRecipePage` gains `useGeminiKey()` to access `provider` and `activeKey`.

---

## Translation cache

**New file: `src/utils/translationCache.ts`**

localStorage-backed cache for ingredient term translations. Key: `'ingredient_translation_cache'`. Value: JSON-serialized `Record<string, string>` (normalized term → English translation).

```ts
const CACHE_KEY = 'ingredient_translation_cache'

function load(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') } catch { return {} }
}
function save(cache: Record<string, string>): void {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)) } catch { /* quota exceeded — ignore */ }
}

export function getCachedTranslation(term: string): string | null {
  return load()[term.toLowerCase().trim()] ?? null
}

export function setCachedTranslation(term: string, english: string): void {
  const cache = load()
  cache[term.toLowerCase().trim()] = english.toLowerCase().trim()
  save(cache)
}
```

---

## Query translation functions

**`src/lib/gemini.ts`** — new function:
```ts
export async function translateIngredientTerm(
  term: string,
  key: string,
): Promise<string>
```

Prompt:
```
Translate this food ingredient term to English. Return ONLY the English word, lowercase, nothing else.
If it is already English, return it unchanged.

Term: ${term}
```

**`src/lib/groq.ts`** — new function:
```ts
export async function translateIngredientTermWithGroq(
  term: string,
  key: string,
): Promise<string>
```

Same prompt via Groq.

On error, both functions return the original term unchanged (graceful fallback).

---

## Search changes

### `src/utils/recipeFilter.ts`

`RecipeFilters` gains `ingredientTagTerms?: string[]` (English-translated terms).

`filterRecipes` ingredient logic:

```ts
if (ingredientTerms?.length || ingredientTagTerms?.length) {
  const ing = r.ingredients.toLowerCase()
  const tags = r.ingredient_tags ?? []

  const textMatch = (term: string) => ing.includes(term.toLowerCase())
  const tagMatch = (englishTerm: string) =>
    tags.some(tag => tag.includes(englishTerm.toLowerCase()) || englishTerm.toLowerCase().includes(tag))

  const allTerms = ingredientTerms ?? []
  const allTagTerms = ingredientTagTerms ?? []

  // Each search term must match via text OR via tag translation
  const combinedTerms = Math.max(allTerms.length, allTagTerms.length)
  for (let i = 0; i < combinedTerms; i++) {
    const rawTerm = allTerms[i]
    const tagTerm = allTagTerms[i]
    const matched = (rawTerm && textMatch(rawTerm)) || (tagTerm && tagMatch(tagTerm))
    if (!matched) return false
  }
}
```

This means: for each comma-separated search term, a recipe matches if the raw term appears in `ingredients` text OR the translated English term appears in `ingredient_tags`.

### `src/pages/RecipesPage.tsx`

Ingredient search gains async translation. New state:
- `translatedTerms: string[]` — English equivalents of the current comma-split terms
- `isTranslating: boolean`

On ingredient search term change (debounced 400ms):
1. Split by comma → `terms[]`
2. For each term: check `getCachedTranslation` → if hit, use cached; if miss, call AI translate → cache it
3. Set `translatedTerms` (same length as `terms`, index-aligned)

```ts
const [translatedTerms, setTranslatedTerms] = useState<string[]>([])
const [isTranslating, setIsTranslating] = useState(false)

useEffect(() => {
  if (searchMode !== 'ingredient' || !search.trim()) {
    setTranslatedTerms([])
    return
  }
  const terms = search.split(',').map(s => s.trim()).filter(Boolean)
  const allCached = terms.map(t => getCachedTranslation(t))
  if (allCached.every(Boolean)) {
    setTranslatedTerms(allCached as string[])
    return
  }
  let cancelled = false
  setIsTranslating(true)
  Promise.all(terms.map(async (t, i) => {
    if (allCached[i]) return allCached[i] as string
    if (!activeKey) return t
    const english = await (provider === 'groq'
      ? translateIngredientTermWithGroq(t, activeKey)
      : translateIngredientTerm(t, activeKey)
    ).catch(() => t)
    setCachedTranslation(t, english)
    return english
  })).then(results => {
    if (!cancelled) { setTranslatedTerms(results); setIsTranslating(false) }
  })
  return () => { cancelled = true; setIsTranslating(false) }
}, [search, searchMode]) // eslint-disable-line react-hooks/exhaustive-deps
```

`RecipesPage` passes `activeKey` and `provider` from `useGeminiKey()`.

`filterRecipes` call updated:
```ts
const filtered = useMemo(() => filterRecipes(recipes, {
  ...filters,
  search: searchMode === 'name' ? search : undefined,
  ingredientTerms: searchMode === 'ingredient' ? ingredientTerms : undefined,
  ingredientTagTerms: searchMode === 'ingredient' ? translatedTerms : undefined,
}), [recipes, filters, search, searchMode, translatedTerms])
```

`SearchBar` or the search input shows a small spinner when `isTranslating` is true. A simple approach: add a `loading` prop to `SearchBar` that conditionally renders a spinner inside the input.

---

## Fridge matching changes

`scoreFridgeMatch` in `src/utils/recipeFilter.ts` gains a tag-based path.

When `recipe.ingredient_tags.length > 0`, match detected names against tags (in addition to existing text-based match):

```ts
const detectedLower = detected.map(d => d.toLowerCase())

const matched = meaningful.filter(line => {
  const stripped = stripQuantity(line)
  if (!stripped) return false
  // Existing text-based match
  const textMatch = detectedLower.some(d => stripped.includes(d) || d.includes(stripped))
  if (textMatch) return true
  // Tag-based match: find corresponding tag for this line
  const lineTag = (recipe.ingredient_tags ?? []).find(tag =>
    stripped.includes(tag) || tag.includes(stripped)
  )
  if (!lineTag) return false
  return detectedLower.some(d => d === lineTag || d.includes(lineTag) || lineTag.includes(d))
}).length
```

`getFridgeIngredientBreakdown` updated similarly: a line is "matched" if text-based OR tag-based match succeeds.

---

## Backfill for existing recipes

On app load (after auth), a background effect finds recipes with `ingredient_tags.length === 0`, generates tags for up to 10 per session (sequential with 500ms gap), and patches them silently via Supabase.

**New hook: `src/hooks/useIngredientTagsBackfill.ts`**

```ts
export function useIngredientTagsBackfill() {
  const { data: recipes } = useRecipes()
  const { geminiKey, groqKey, provider } = useGeminiKey()
  const activeKey = provider === 'groq' ? groqKey : geminiKey
  const qc = useQueryClient()

  useEffect(() => {
    if (!activeKey || !recipes?.length) return
    const untagged = recipes.filter(r => !r.ingredient_tags?.length).slice(0, 10)
    if (!untagged.length) return

    let cancelled = false
    let didUpdate = false
    ;(async () => {
      for (const recipe of untagged) {
        if (cancelled) break
        const tags = await (provider === 'groq'
          ? generateIngredientTagsWithGroq(recipe.ingredients, activeKey)
          : generateIngredientTags(recipe.ingredients, activeKey)
        ).catch(() => null)
        if (!tags || cancelled) break
        await supabase.from('recipes').update({ ingredient_tags: tags }).eq('id', recipe.id)
        didUpdate = true
        await new Promise(r => setTimeout(r, 500))
      }
      if (didUpdate && !cancelled) {
        qc.invalidateQueries({ queryKey: ['recipes'] })
      }
    })()
    return () => { cancelled = true }
  }, [recipes?.length, activeKey]) // eslint-disable-line react-hooks/exhaustive-deps
}
```

Called once in a top-level component (e.g. `App.tsx` or `RecipesPage`). The `invalidateQueries` at the end ensures the updated tags are visible to search in the same session.

---

## Files changed

| File | Change |
|------|--------|
| `supabase/migrations/008_ingredient_tags.sql` | New — adds column + RLS pass-through |
| `src/types/app.ts` | `Recipe` gains `ingredient_tags: string[]` |
| `src/lib/gemini.ts` | Add `ingredient_tags` to all prompts; new `generateIngredientTags`, `translateIngredientTerm` |
| `src/lib/groq.ts` | Add `ingredient_tags` to all prompts; new `generateIngredientTagsWithGroq`, `translateIngredientTermWithGroq` |
| `src/utils/translationCache.ts` | New — localStorage-backed translation cache |
| `src/utils/recipeFilter.ts` | `ingredientTagTerms` filter; tag-aware fridge scoring |
| `src/utils/recipeFilter.test.ts` | Tests for `ingredientTagTerms` filtering; tag-aware fridge scoring |
| `src/pages/RecipesPage.tsx` | Async term translation; pass `ingredientTagTerms`; `isTranslating` spinner |
| `src/pages/AddRecipePage.tsx` | Generate tags before save if missing |
| `src/pages/EditRecipePage.tsx` | Regenerate tags on every save |
| `src/components/search/SearchBar.tsx` | Add `loading` prop for translation spinner |
| `src/hooks/useIngredientTagsBackfill.ts` | New — silent background tag generation for existing recipes |

---

## Out of scope

- Displaying tags to the user
- Editing tags manually
- Multi-term batch translation in one AI call (single-term calls keep it simple; cache prevents repetition)
- Detecting language automatically before deciding whether to translate (always translate — English → English is a no-op for the AI)
- Fridge photo language detection (fridge AI already outputs English names)
