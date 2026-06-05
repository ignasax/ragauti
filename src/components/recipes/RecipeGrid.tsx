import { RecipeCard } from './RecipeCard'
import type { Recipe } from '../../types/app'

interface RecipeGridProps { recipes: Recipe[]; isLoading: boolean; ingredientSearch?: string }

export function RecipeGrid({ recipes, isLoading, ingredientSearch }: RecipeGridProps) {
  if (isLoading) return (
    <div className="grid grid-cols-2 gap-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-warm-card border border-warm-border rounded-xl overflow-hidden animate-pulse">
          <div className="aspect-square bg-warm-surface" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-warm-surface rounded w-3/4" />
            <div className="h-2 bg-warm-surface rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
  if (!recipes.length) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="font-serif text-warm-secondary text-lg mb-2">No recipes found</p>
      <p className="font-sans text-warm-muted text-sm">Try adjusting your search or filters</p>
    </div>
  )
  return (
    <div className="grid grid-cols-2 gap-3">
      {recipes.map(r => <RecipeCard key={r.id} recipe={r} ingredientSearch={ingredientSearch} />)}
    </div>
  )
}
