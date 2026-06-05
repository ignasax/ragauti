import type { Recipe } from '../types/app'

export interface RecipeFilters {
  search?: string
  ingredientSearch?: string
  rating?: number
  favouritesOnly?: boolean
  categories?: string[]
}

export function filterRecipes(recipes: Recipe[], filters: RecipeFilters): Recipe[] {
  const { search, ingredientSearch, rating, favouritesOnly, categories } = filters
  return recipes.filter(r => {
    if (search) {
      const q = search.toLowerCase()
      if (!r.title.toLowerCase().includes(q)) return false
    }
    if (ingredientSearch) {
      const q = ingredientSearch.toLowerCase()
      if (!r.ingredients.toLowerCase().includes(q)) return false
    }
    if (rating != null && r.rating !== rating) return false
    if (favouritesOnly && !r.is_favourite) return false
    if (categories?.length && !categories.every(c => r.categories.includes(c))) return false
    return true
  })
}
