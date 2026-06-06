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
    addRecipe(toSave, {
      onSuccess: () => setSaved(true),
      onError: () => { /* save failed silently — button re-enables */ },
    })
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
  const recipeForBreakdown: Recipe = {
    ...r,
    id: '', user_id: '', created_at: '', updated_at: '',
    rating: null, categories: [], comments: null,
    is_favourite: false, source_url: null,
    image_url: null, image_urls: [],
  }
  const { matched, missing } = getFridgeIngredientBreakdown(recipeForBreakdown, detected, multiplier)
  const steps = r.instructions.split('\n').map(s => s.trim()).filter(Boolean)
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
