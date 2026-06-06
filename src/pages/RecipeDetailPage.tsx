import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Pencil, Trash2, Heart, User } from 'lucide-react'
import { useRecipe } from '../hooks/useRecipe'
import { useDeleteRecipe, useToggleFavourite } from '../hooks/useRecipes'
import { ServingScaler } from '../components/recipes/ServingScaler'
import { useAddRecipeToGrocery } from '../hooks/useGroceryList'
import { getLocalDateStr } from '../hooks/useMealPlan'
import { scaleIngredients } from '../utils/servingScaler'
import { useToast } from '../contexts/ToastContext'

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: recipe, isLoading, isError } = useRecipe(id ?? '')
  const { mutateAsync: deleteRecipe, isPending: isDeleting } = useDeleteRecipe()
  const { mutate: toggleFav } = useToggleFavourite()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [section, setSection] = useState<'ingredients' | 'instructions' | 'notes'>('ingredients')
  const [servingMultiplier, setServingMultiplier] = useState(1)
  const { mutate: addToGrocery, isPending: isAddingToGrocery } = useAddRecipeToGrocery()
  const { showToast } = useToast()

  useEffect(() => {
    if (confirmDelete) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [confirmDelete])

  if (isLoading) return <div className="min-h-screen bg-warm-base" />
  if (isError) return (
    <div className="min-h-screen bg-warm-base flex flex-col items-center justify-center gap-4 px-4">
      <p className="font-serif text-warm-secondary text-lg">Recipe not found</p>
      <button onClick={() => navigate('/recipes')} className="font-sans text-warm-accent text-sm cursor-pointer touch-manipulation">Back to recipes</button>
    </div>
  )
  if (!recipe) return (
    <div className="min-h-screen bg-warm-base flex flex-col items-center justify-center gap-4 px-4">
      <p className="font-serif text-warm-secondary text-lg">Recipe not found</p>
      <button onClick={() => navigate('/recipes')} className="font-sans text-warm-accent text-sm cursor-pointer touch-manipulation">Back to recipes</button>
    </div>
  )

  return (
    <div className="bg-warm-base min-h-screen">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={() => navigate(-1)} aria-label="Go back"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 cursor-pointer touch-manipulation">
          <ChevronLeft className="w-5 h-5 text-warm-primary" />
        </button>
        <div className="flex">
          <button onClick={() => toggleFav({ id: recipe.id, is_favourite: !recipe.is_favourite })}
            aria-label={recipe.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer touch-manipulation">
            <Heart className={`w-5 h-5 ${recipe.is_favourite ? 'fill-warm-accent text-warm-accent' : 'text-warm-secondary'}`} />
          </button>
          <button onClick={() => navigate(`/recipes/${id}/edit`)} aria-label="Edit recipe"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer touch-manipulation">
            <Pencil className="w-5 h-5 text-warm-secondary" />
          </button>
          <button onClick={() => setConfirmDelete(true)} aria-label="Delete recipe"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer touch-manipulation">
            <Trash2 className="w-5 h-5 text-red-600" />
          </button>
        </div>
      </div>
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
      <div className="px-4 pt-4 pb-2">
        <h1 className="font-serif text-2xl font-bold text-warm-primary mb-1">{recipe.title}</h1>
        <div className="flex flex-wrap gap-3 font-sans text-warm-secondary text-sm">
          {recipe.prep_time_mins ? <span>Prep {recipe.prep_time_mins} min</span> : null}
          {recipe.cook_time_mins ? <span>Cook {recipe.cook_time_mins} min</span> : null}
          {recipe.rating ? <span>{'★'.repeat(Math.min(3, Math.max(0, Math.floor(recipe.rating))))}</span> : null}
          {recipe.servings ? (
            <span className="flex items-center gap-0.5">
              {Array.from({ length: Math.min(4, recipe.servings) }).map((_, i) => (
                <User key={i} className="w-3.5 h-3.5" aria-hidden="true" />
              ))}
              {recipe.servings >= 5 && <span className="text-xs">+</span>}
            </span>
          ) : null}
        </div>
        {(recipe.categories?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {recipe.categories?.map(c => (
              <span key={c} className="bg-warm-surface text-warm-secondary font-sans text-xs px-2 py-1 rounded-full">{c}</span>
            ))}
          </div>
        )}
      </div>
      <div className="sticky top-0 z-10 bg-warm-base border-b border-warm-border flex px-4 gap-1 pt-1">
        {(['ingredients', 'instructions', 'notes'] as const).map(s => (
          <button key={s} onClick={() => setSection(s)}
            className={`font-sans text-sm font-semibold pb-2 px-1 border-b-2 min-h-[44px] cursor-pointer touch-manipulation transition-colors capitalize ${
              section === s ? 'border-warm-accent text-warm-accent' : 'border-transparent text-warm-secondary'
            }`}>{s}</button>
        ))}
      </div>
      <div className="px-4 pt-4 pb-8">
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
              disabled={isAddingToGrocery || !recipe.ingredients?.trim()}
              className="w-full bg-warm-accent text-white font-sans font-semibold text-sm py-3 rounded-xl min-h-[44px] active:opacity-80 disabled:opacity-50 cursor-pointer touch-manipulation flex items-center justify-center gap-2"
            >
              🛒 Add to grocery list
            </button>
            <p className="font-sans text-warm-muted text-xs text-center -mt-2">
              All ingredients · {Math.round((recipe.servings ?? 1) * servingMultiplier) || (recipe.servings ?? 1)} servings · added to this week's list
            </p>
          </div>
        )}
        {section === 'instructions' && <div className="font-sans text-warm-primary text-[15px] leading-[1.7] whitespace-pre-line">{recipe.instructions}</div>}
        {section === 'notes' && (
          <div className="flex flex-col gap-4">
            {recipe.comments
              ? <div className="font-sans text-warm-primary text-[15px] leading-[1.7] whitespace-pre-line">{recipe.comments}</div>
              : <p className="font-sans text-warm-muted text-[15px]">No notes yet.</p>
            }
            {recipe.source_url && (
              <div>
                <span className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider block mb-1">Source</span>
                <a href={recipe.source_url} target="_blank" rel="noopener noreferrer"
                  className="font-sans text-warm-accent text-sm break-all underline underline-offset-2">
                  {recipe.source_url}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
      {confirmDelete && (
        <div className="fixed inset-0 z-40 bg-warm-primary/30 backdrop-blur-sm flex items-end" onClick={() => setConfirmDelete(false)}>
          <div className="bg-warm-card w-full rounded-t-2xl p-6 flex flex-col gap-4" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title" onClick={e => e.stopPropagation()} style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
            <h2 id="delete-dialog-title" className="font-serif text-lg font-bold text-warm-primary">Delete Recipe?</h2>
            <p className="font-sans text-warm-secondary text-sm">This cannot be undone.</p>
            <button onClick={async () => { await deleteRecipe(recipe.id); navigate('/recipes') }} disabled={isDeleting}
              className="w-full bg-red-600 text-white font-sans font-semibold text-sm py-3 rounded-xl min-h-[44px] active:opacity-80 cursor-pointer touch-manipulation">
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
            <button onClick={() => setConfirmDelete(false)}
              className="w-full border border-warm-border text-warm-primary font-sans text-sm py-3 rounded-xl min-h-[44px] bg-warm-card active:bg-warm-surface cursor-pointer touch-manipulation">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
