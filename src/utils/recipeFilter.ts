import type { Recipe } from '../types/app'

export interface RecipeFilters {
  search?: string
  ingredientTerms?: string[]
  rating?: number
  favouritesOnly?: boolean
  categories?: string[]
}

export function filterRecipes(recipes: Recipe[], filters: RecipeFilters): Recipe[] {
  const { search, ingredientTerms, rating, favouritesOnly, categories } = filters
  return recipes.filter(r => {
    if (search) {
      if (!r.title.toLowerCase().includes(search.toLowerCase())) return false
    }
    if (ingredientTerms?.length) {
      const ing = r.ingredients.toLowerCase()
      if (!ingredientTerms.every(term => ing.includes(term.toLowerCase()))) return false
    }
    if (rating != null && r.rating !== rating) return false
    if (favouritesOnly && !r.is_favourite) return false
    if (categories?.length && !categories.every(c => r.categories.includes(c))) return false
    return true
  })
}
