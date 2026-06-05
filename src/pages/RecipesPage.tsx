import { useState, useMemo } from 'react'
import { useRecipes } from '../hooks/useRecipes'
import { filterRecipes, type RecipeFilters } from '../utils/recipeFilter'
import { RecipeGrid } from '../components/recipes/RecipeGrid'
import { SearchBar } from '../components/search/SearchBar'
import { FilterChips } from '../components/search/FilterChips'

type SearchMode = 'name' | 'ingredient'

export function RecipesPage() {
  const { data: recipes = [], isLoading } = useRecipes()
  const [search, setSearch] = useState('')
  const [searchMode, setSearchMode] = useState<SearchMode>('name')
  const [filters, setFilters] = useState<RecipeFilters>({})
  const allCategories = useMemo(() => [...new Set(recipes.flatMap(r => r.categories))].sort(), [recipes])

  const handleModeChange = (mode: SearchMode) => {
    setSearchMode(mode)
    setSearch('')
  }

  const filtered = useMemo(() => filterRecipes(recipes, {
    ...filters,
    search: searchMode === 'name' ? search : undefined,
    ingredientSearch: searchMode === 'ingredient' ? search : undefined,
  }), [recipes, filters, search, searchMode])

  const pillCls = (active: boolean) =>
    `font-sans text-xs px-3 py-1 rounded-full border cursor-pointer touch-manipulation transition-colors ${active ? 'bg-warm-accent text-white border-warm-accent' : 'bg-warm-surface text-warm-secondary border-warm-border'}`

  return (
    <div className="px-4 pt-4 flex flex-col gap-3">
      <h1 className="font-serif text-2xl font-bold text-warm-primary">Recipes</h1>
      <div className="flex flex-col gap-2">
        <SearchBar value={search} onChange={setSearch} placeholder={searchMode === 'name' ? 'Search by name…' : 'Search by ingredient…'} />
        <div className="flex gap-2">
          <button className={pillCls(searchMode === 'name')} onClick={() => handleModeChange('name')}>Name</button>
          <button className={pillCls(searchMode === 'ingredient')} onClick={() => handleModeChange('ingredient')}>Ingredient</button>
        </div>
      </div>
      <FilterChips filters={filters} allCategories={allCategories} onChange={setFilters} />
      <RecipeGrid recipes={filtered} isLoading={isLoading} ingredientSearch={searchMode === 'ingredient' ? search : undefined} />
    </div>
  )
}
