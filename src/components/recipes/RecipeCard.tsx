import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useToggleFavourite } from '../../hooks/useRecipes'
import type { Recipe } from '../../types/app'

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const { mutate: toggleFav } = useToggleFavourite()
  return (
    <article className="bg-warm-card border border-warm-border rounded-xl overflow-hidden relative">
      <Link to={`/recipes/${recipe.id}`} className="block active:opacity-90 transition-opacity duration-150">
        <div className="aspect-square bg-warm-surface">
          {recipe.image_url
            ? <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" loading="lazy" />
            : <div aria-hidden="true" className="w-full h-full flex items-center justify-center text-4xl">🍽</div>
          }
        </div>
        <div className="p-3">
          <h3 className="font-sans font-semibold text-warm-primary text-sm leading-snug line-clamp-2">{recipe.title}</h3>
          <p className="font-sans text-warm-secondary text-xs mt-1">
            {[recipe.cook_time_mins ? `${recipe.cook_time_mins} min` : '', recipe.rating ? '★'.repeat(recipe.rating) : ''].filter(Boolean).join(' · ')}
          </p>
        </div>
      </Link>
      <button onClick={() => toggleFav({ id: recipe.id, is_favourite: !recipe.is_favourite })}
        aria-label={recipe.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
        className="absolute top-2 right-2 min-w-[36px] min-h-[36px] flex items-center justify-center bg-warm-base/70 rounded-full cursor-pointer touch-manipulation">
        <Heart className={`w-4 h-4 ${recipe.is_favourite ? 'fill-warm-accent text-warm-accent' : 'text-warm-secondary'}`} />
      </button>
    </article>
  )
}
