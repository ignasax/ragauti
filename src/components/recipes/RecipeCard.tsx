import { Link } from 'react-router-dom'
import { Heart, Utensils, User } from 'lucide-react'
import { useToggleFavourite } from '../../hooks/useRecipes'
import type { Recipe } from '../../types/app'

interface RecipeCardProps { recipe: Recipe; ingredientTerms?: string[] }

export function RecipeCard({ recipe, ingredientTerms }: RecipeCardProps) {
  const { mutate: toggleFav } = useToggleFavourite()

  const totalMins = (recipe.prep_time_mins ?? 0) + (recipe.cook_time_mins ?? 0)

  const matchedIngredients = ingredientTerms?.length
    ? recipe.ingredients.split('\n').filter(l =>
        l.trim() && ingredientTerms.some(term => l.toLowerCase().includes(term.toLowerCase()))
      ).slice(0, 3)
    : []

  return (
    <article className="bg-warm-card border border-warm-border rounded-xl overflow-hidden relative">
      <Link to={`/recipes/${recipe.id}`} className="block active:opacity-90 transition-opacity duration-150">
        <div className="aspect-square bg-warm-surface">
          {(recipe.image_urls?.[0] ?? recipe.image_url)
            ? <img src={recipe.image_urls?.[0] ?? recipe.image_url!} alt={recipe.title} className="w-full h-full object-cover" />
            : <div aria-hidden="true" className="w-full h-full flex items-center justify-center"><Utensils className="w-10 h-10 text-warm-muted" /></div>
          }
        </div>
        <div className="p-3">
          <h3 className="font-sans font-semibold text-warm-primary text-sm leading-snug line-clamp-2">{recipe.title}</h3>
          <div className="flex items-center gap-1.5 mt-1 overflow-hidden">
            {totalMins > 0 && <span className="font-sans text-warm-secondary text-xs">{totalMins} min</span>}
            {totalMins > 0 && (recipe.rating || recipe.servings) && <span className="text-warm-border text-xs">·</span>}
            {recipe.rating ? <span className="font-sans text-warm-secondary text-xs">{'★'.repeat(Math.min(3, recipe.rating))}</span> : null}
            {recipe.rating && recipe.servings ? <span className="text-warm-border text-xs">·</span> : null}
            {recipe.servings ? (
              <span className="flex items-center gap-0.5 flex-shrink-0">
                {Array.from({ length: recipe.servings }).map((_, i) => (
                  <User key={i} className="w-2.5 h-2.5 text-warm-secondary" aria-hidden="true" />
                ))}
              </span>
            ) : null}
          </div>
          {matchedIngredients.length > 0 && (
            <ul className="mt-1.5 flex flex-col gap-0.5" aria-label="Matched ingredients">
              {matchedIngredients.map((line, i) => (
                <li key={i} className="font-sans text-[11px] text-warm-accent leading-snug truncate">· {line.trim()}</li>
              ))}
            </ul>
          )}
        </div>
      </Link>
      <button onClick={() => toggleFav({ id: recipe.id, is_favourite: !recipe.is_favourite })}
        aria-label={recipe.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
        className="absolute top-2 right-2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-warm-base/70 rounded-full cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-warm-accent">
        <Heart className={`w-4 h-4 transition-colors duration-150 ${recipe.is_favourite ? 'fill-warm-accent text-warm-accent' : 'text-warm-secondary'}`} />
      </button>
    </article>
  )
}
