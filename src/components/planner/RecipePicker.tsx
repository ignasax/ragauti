import { useState, useEffect, useMemo } from 'react'
import { X, Search, Utensils } from 'lucide-react'
import { useRecipes } from '../../hooks/useRecipes'
import type { Recipe } from '../../types/app'

interface RecipePickerProps {
  onSelect: (recipe: Recipe) => void
  onClose: () => void
}

export function RecipePicker({ onSelect, onClose }: RecipePickerProps) {
  const { data: recipes = [] } = useRecipes()
  const [search, setSearch] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const filtered = useMemo(
    () => [...recipes]
      .sort((a, b) => a.title.localeCompare(b.title))
      .filter(r => r.title.toLowerCase().includes(search.toLowerCase())),
    [recipes, search]
  )

  return (
    <>
      <div className="fixed inset-0 z-40 bg-warm-primary/30 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed bottom-0 inset-x-0 z-50 bg-warm-card rounded-t-2xl flex flex-col"
        style={{ maxHeight: '85svh', paddingBottom: 'env(safe-area-inset-bottom)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recipe-picker-title"
      >
        <div className="w-8 h-1 bg-warm-border rounded-full mx-auto mt-3 mb-2 flex-shrink-0" />
        <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0">
          <h2 id="recipe-picker-title" className="font-serif text-lg font-bold text-warm-primary">Choose Recipe</h2>
          <button onClick={onClose} aria-label="Close"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer touch-manipulation">
            <X className="w-5 h-5 text-warm-secondary" />
          </button>
        </div>
        <div className="px-4 pb-3 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-muted" aria-hidden="true" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              aria-label="Search recipes"
              className="w-full bg-warm-surface border border-warm-border rounded-xl pl-9 pr-4 py-3 text-warm-primary font-sans text-base placeholder:text-warm-muted focus:outline-none focus:border-warm-accent transition-colors min-h-[44px]"
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-4 pb-4 flex flex-col gap-1">
          {filtered.map(r => (
            <button key={r.id} onClick={() => onSelect(r)}
              className="flex items-center gap-3 p-3 rounded-xl bg-warm-base active:bg-warm-surface transition-colors min-h-[56px] cursor-pointer touch-manipulation text-left w-full">
              <div className="w-10 h-10 rounded-lg bg-warm-surface overflow-hidden flex-shrink-0">
                {(r.image_urls?.[0] ?? r.image_url)
                  ? <img src={r.image_urls?.[0] ?? r.image_url!} alt="" className="w-full h-full object-cover" loading="lazy" />
                  : <div aria-hidden="true" className="w-full h-full flex items-center justify-center"><Utensils className="w-5 h-5 text-warm-muted" /></div>
                }
              </div>
              <span className="font-sans text-sm text-warm-primary line-clamp-2">{r.title}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="font-sans text-warm-muted text-sm text-center py-8">
              {search ? 'No recipes match your search' : 'No recipes yet — add one first'}
            </p>
          )}
        </div>
      </div>
    </>
  )
}
