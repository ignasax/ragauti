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
import { HOUSEHOLD_PANTRY } from '../constants/pantry'
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
  const pantryLower = new Set(HOUSEHOLD_PANTRY.map(p => p.toLowerCase()))
  const allAvailable = [...detected, ...HOUSEHOLD_PANTRY]
  const { matched, missing } = getFridgeIngredientBreakdown(recipe, allAvailable, multiplier)
  const fridgeMatched = matched.filter(m => !pantryLower.has(m.detectedName.toLowerCase()))
  const pantryMatched = matched.filter(m => pantryLower.has(m.detectedName.toLowerCase()))

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
      {/* Top bar */}
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
          <div className="font-sans text-warm-secondary text-sm mb-2 whitespace-nowrap overflow-hidden">
            {[
              (recipe.prep_time_mins || recipe.cook_time_mins)
                ? `${(recipe.prep_time_mins ?? 0) + (recipe.cook_time_mins ?? 0)} min`
                : null,
              recipe.rating
                ? '★'.repeat(Math.min(5, Math.max(0, Math.floor(recipe.rating))))
                : null,
              recipe.servings ? `${recipe.servings} servings` : null,
            ].filter(Boolean).map((item, i) => (
              <span key={i}>
                {i > 0 && <span className="mx-2 text-lg font-bold text-warm-muted select-none">·</span>}
                {item}
              </span>
            ))}
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
            🧊 {fridgeMatched.length} from fridge{pantryMatched.length > 0 ? ` · 📦 ${pantryMatched.length} pantry` : ''}
          </div>
        </div>

        {/* Serving scaler — no ingredient list; Detected/Still need sections below serve that role */}
        <ServingScaler
          ingredients={recipe.ingredients}
          baseServings={recipe.servings}
          showIngredients={false}
          onScaleChange={(m) => setMultiplier(m)}
        />

        {/* From fridge section */}
        {fridgeMatched.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-sans font-semibold text-[12px] text-green-600">✓ From your fridge</span>
              <div className="flex-1 h-px bg-green-100" />
            </div>
            <div className="flex flex-col gap-2">
              {fridgeMatched.map((item, i) => (
                <div key={i} className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <div className="font-sans font-semibold text-sm text-green-800 capitalize">{item.detectedName}</div>
                  <div className="font-sans text-[11px] text-green-600 mt-0.5">{item.scaledIngredient}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* From pantry section */}
        {pantryMatched.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-sans font-semibold text-[12px] text-warm-accent">📦 From pantry</span>
              <div className="flex-1 h-px bg-warm-accent/20" />
            </div>
            <div className="flex flex-col gap-2">
              {pantryMatched.map((item, i) => (
                <div key={i} className="bg-warm-accent/5 border border-warm-accent/20 rounded-lg px-3 py-2">
                  <div className="font-sans font-semibold text-sm text-warm-accent capitalize">{item.detectedName}</div>
                  <div className="font-sans text-[11px] text-warm-accent/70 mt-0.5">{item.scaledIngredient}</div>
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
                    {item.scaledIngredient}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add to grocery list */}
        <button
          onClick={handleAddToGrocery}
          disabled={isAddingToGrocery || !recipe.ingredients?.trim()}
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
