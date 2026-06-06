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
