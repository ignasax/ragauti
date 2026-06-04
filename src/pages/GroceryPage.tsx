import { useEffect, useState } from 'react'
import { useGroceryList, useGenerateGroceryList, useAddGroceryItem } from '../hooks/useGroceryList'
import { getMondayOf } from '../hooks/useMealPlan'
import { GroceryGroup } from '../components/grocery/GroceryGroup'
import type { GroceryItem } from '../types/app'

export function GroceryPage() {
  const weekStart = getMondayOf(new Date().toISOString().split('T')[0])
  const { data: items = [], isLoading } = useGroceryList(weekStart)
  const { mutateAsync: generate, isPending: isGenerating } = useGenerateGroceryList(weekStart)
  const { mutate: addItem } = useAddGroceryItem(weekStart)
  const [confirmRegen, setConfirmRegen] = useState(false)
  const [newItemText, setNewItemText] = useState('')

  // Scroll lock when confirm modal is open
  useEffect(() => {
    if (confirmRegen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [confirmRegen])

  const grouped = new Map<string, { title: string; items: GroceryItem[] }>()
  const manual: GroceryItem[] = []
  for (const item of items) {
    if (!item.recipe_id) { manual.push(item); continue }
    const key = item.recipe_id
    if (!grouped.has(key)) grouped.set(key, { title: item.recipe?.title ?? 'Recipe', items: [] })
    grouped.get(key)!.items.push(item)
  }

  const handleGenerate = async () => {
    setConfirmRegen(false)
    await generate()
  }

  const handleAddItem = () => {
    if (newItemText.trim()) {
      addItem(newItemText.trim())
      setNewItemText('')
    }
  }

  return (
    <div className="px-4 pt-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-warm-primary">Grocery</h1>
        <button
          onClick={() => items.length > 0 ? setConfirmRegen(true) : handleGenerate()}
          disabled={isGenerating}
          className="bg-warm-accent text-white font-sans font-semibold text-sm px-3 py-2 rounded-lg min-h-[44px] active:opacity-80 disabled:opacity-50 cursor-pointer touch-manipulation">
          {isGenerating ? 'Generating…' : 'Generate list'}
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-warm-surface rounded-xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="font-serif text-warm-secondary text-lg mb-2">No grocery list yet</p>
          <p className="font-sans text-warm-muted text-sm">Add recipes to your meal plan first, then generate the list</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {[...grouped.entries()].map(([recipeId, group]) => (
            <GroceryGroup key={recipeId} title={group.title} items={group.items} />
          ))}
          {manual.length > 0 && <GroceryGroup title="Added manually" items={manual} />}
        </div>
      )}

      <div className="flex gap-2 mt-2">
        <input value={newItemText} onChange={e => setNewItemText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAddItem() }}
          placeholder="Add item manually…"
          aria-label="New grocery item"
          className="flex-1 bg-warm-surface border border-warm-border rounded-lg px-3 py-3 text-warm-primary font-sans text-base placeholder:text-warm-muted focus:outline-none focus:border-warm-accent transition-colors min-h-[44px]" />
        <button onClick={handleAddItem} disabled={!newItemText.trim()}
          className="bg-warm-accent text-white font-sans font-semibold text-sm px-3 py-2 rounded-lg min-h-[44px] active:opacity-80 disabled:opacity-50 cursor-pointer touch-manipulation">
          Add
        </button>
      </div>

      {confirmRegen && (
        <div className="fixed inset-0 z-40 bg-warm-primary/30 backdrop-blur-sm flex items-end"
          onClick={() => setConfirmRegen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="regen-dialog-title"
            className="bg-warm-card w-full rounded-t-2xl p-6 flex flex-col gap-4"
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}>
            <h2 id="regen-dialog-title" className="font-serif text-lg font-bold text-warm-primary">Regenerate list?</h2>
            <p className="font-sans text-warm-secondary text-sm">This will replace the current grocery list.</p>
            <button onClick={handleGenerate}
              className="w-full bg-warm-accent text-white font-sans font-semibold text-sm py-3 rounded-xl min-h-[44px] cursor-pointer touch-manipulation">
              Regenerate
            </button>
            <button onClick={() => setConfirmRegen(false)}
              className="w-full border border-warm-border text-warm-primary font-sans text-sm py-3 rounded-xl min-h-[44px] bg-warm-card active:bg-warm-surface cursor-pointer touch-manipulation">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
