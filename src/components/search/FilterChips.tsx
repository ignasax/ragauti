import { X } from 'lucide-react'
import type { RecipeFilters } from '../../utils/recipeFilter'

interface FilterChipsProps { filters: RecipeFilters; allCategories: string[]; onChange: (f: RecipeFilters) => void }

export function FilterChips({ filters, allCategories, onChange }: FilterChipsProps) {
  const chip = (active: boolean) =>
    `flex-shrink-0 font-sans text-xs px-3 py-1.5 rounded-full border min-h-[36px] cursor-pointer touch-manipulation transition-colors ${active ? 'bg-warm-accent text-white border-warm-accent' : 'bg-warm-surface text-warm-secondary border-warm-border'}`

  const activeCount = [filters.rating, filters.favouritesOnly, filters.categories?.length].filter(Boolean).length

  return (
    <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={() => onChange({ ...filters, rating: filters.rating === n ? undefined : n })}
          className={chip(filters.rating === n)}>{'★'.repeat(n)}</button>
      ))}
      <button onClick={() => onChange({ ...filters, favouritesOnly: !filters.favouritesOnly })}
        className={chip(!!filters.favouritesOnly)}>♥ Favourites</button>
      {allCategories.map(cat => {
        const active = (filters.categories ?? []).includes(cat)
        return (
          <button key={cat} onClick={() => {
            const next = active ? (filters.categories ?? []).filter(c => c !== cat) : [...(filters.categories ?? []), cat]
            onChange({ ...filters, categories: next.length ? next : undefined })
          }} className={chip(active)}>{cat}</button>
        )
      })}
      {activeCount > 0 && (
        <button onClick={() => onChange({})}
          className="flex-shrink-0 font-sans text-xs px-3 py-1.5 rounded-full border min-h-[36px] bg-warm-surface text-warm-secondary border-warm-border cursor-pointer touch-manipulation flex items-center gap-1">
          <X className="w-3 h-3" /> Clear
        </button>
      )}
    </div>
  )
}
