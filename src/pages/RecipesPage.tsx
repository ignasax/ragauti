import { useState, useMemo } from 'react'
import { useRecipes } from '../hooks/useRecipes'
import { filterRecipes, type RecipeFilters } from '../utils/recipeFilter'
import { RecipeGrid } from '../components/recipes/RecipeGrid'
import { SearchBar } from '../components/search/SearchBar'
import { FilterChips } from '../components/search/FilterChips'

export function RecipesPage() {
  const { data: recipes = [], isLoading } = useRecipes()
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<RecipeFilters>({})
  const allCategories = useMemo(() => [...new Set(recipes.flatMap(r => r.categories))].sort(), [recipes])
  const filtered = useMemo(() => filterRecipes(recipes, { ...filters, search }), [recipes, filters, search])
  return (
    <div className="px-4 pt-4 flex flex-col gap-3">
      <h1 className="font-serif text-2xl font-bold text-warm-primary">Recipes</h1>
      <SearchBar value={search} onChange={setSearch} />
      <FilterChips filters={filters} allCategories={allCategories} onChange={setFilters} />
      <RecipeGrid recipes={filtered} isLoading={isLoading} />
    </div>
  )
}
