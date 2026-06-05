import { X } from 'lucide-react'
import type { RecipeFilters } from '../../utils/recipeFilter'

interface FilterChipsProps { filters: RecipeFilters; allCategories: string[]; onChange: (f: RecipeFilters) => void }

const scrollRow = 'flex gap-2 overflow-x-auto -mx-4 px-4 pb-1'
const scrollStyle: React.CSSProperties = { scrollbarWidth: 'none' }

export function FilterChips({ filters, allCategories, onChange }: FilterChipsProps) {
  const chip = (active: boolean) =>
    `flex-shrink-0 font-sans text-xs px-3 py-1.5 rounded-full border min-h-[36px] cursor-pointer touch-manipulation transition-colors ${active ? 'bg-warm-accent text-white border-warm-accent' : 'bg-warm-surface text-warm-secondary border-warm-border'}`

  const activeCount = [filters.rating, filters.favouritesOnly, filters.categories?.length].filter(Boolean).length

  return (
    <div className="flex flex-col gap-1.5">
      {/* Row 1: Favourites · Stars (3-5) · Clear */}
      <div className={scrollRow} style={scrollStyle}>
        <button onClick={() => onChange({ ...filters, favouritesOnly: !filters.favouritesOnly })}
          className={chip(!!filters.favouritesOnly)}>♥</button>
        {[1, 2, 3].map(n => (
          <button key={n} onClick={() => onChange({ ...filters, rating: filters.rating === n ? undefined : n })}
            className={chip(filters.rating === n)}>{'★'.repeat(n)}</button>
        ))}
        {activeCount > 0 && (
          <button onClick={() => onChange({})}
            className="flex-shrink-0 font-sans text-xs px-3 py-1.5 rounded-full border min-h-[36px] bg-warm-surface text-warm-secondary border-warm-border cursor-pointer touch-manipulation flex items-center gap-1">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>
      {/* Row 2: Category tags */}
      {allCategories.length > 0 && (
        <div className={scrollRow} style={scrollStyle}>
          {allCategories.map(cat => {
            const active = (filters.categories ?? []).includes(cat)
            return (
              <button key={cat} onClick={() => {
                const next = active
                  ? (filters.categories ?? []).filter(c => c !== cat)
                  : [...(filters.categories ?? []), cat]
                onChange({ ...filters, categories: next.length ? next : undefined })
              }} className={chip(active)}>{cat}</button>
            )
          })}
        </div>
      )}
    </div>
  )
}
