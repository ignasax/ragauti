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

  const ingredientTerms = searchMode === 'ingredient'
    ? search.split(',').map(s => s.trim()).filter(Boolean)
    : []

  const filtered = useMemo(() => filterRecipes(recipes, {
    ...filters,
    search: searchMode === 'name' ? search : undefined,
    ingredientTerms: searchMode === 'ingredient' ? ingredientTerms : undefined,
  }), [recipes, filters, search, searchMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const pillCls = (active: boolean) =>
    `font-sans text-xs px-3 py-1 rounded-full border cursor-pointer touch-manipulation transition-colors ${active ? 'bg-warm-accent text-white border-warm-accent' : 'bg-warm-surface text-warm-secondary border-warm-border'}`

  return (
    <div className="px-4 pt-4 flex flex-col gap-3">
      <h1 className="font-serif text-2xl font-bold text-warm-primary">Recipes</h1>
      <div className="flex flex-col gap-2">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={searchMode === 'name' ? 'Search by name…' : 'e.g. tomato, chicken…'}
        />
        <div className="flex gap-2">
          <button className={pillCls(searchMode === 'name')} onClick={() => handleModeChange('name')}>Name</button>
          <button className={pillCls(searchMode === 'ingredient')} onClick={() => handleModeChange('ingredient')}>Ingredients</button>
        </div>
        {searchMode === 'ingredient' && ingredientTerms.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {ingredientTerms.map(term => (
              <span key={term} className="bg-warm-accent/15 text-warm-accent font-sans text-xs px-2.5 py-1 rounded-full">
                {term}
              </span>
            ))}
          </div>
        )}
      </div>
      <FilterChips filters={filters} allCategories={allCategories} onChange={setFilters} />
      <RecipeGrid recipes={filtered} isLoading={isLoading} ingredientTerms={searchMode === 'ingredient' ? ingredientTerms : undefined} />
    </div>
  )
}
