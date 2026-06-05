import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { useGroceryList, useGenerateGroceryList, useAddGroceryItem, useDeleteAllGroceryItems } from '../hooks/useGroceryList'
import { getMondayOf } from '../hooks/useMealPlan'
import { GroceryGroup } from '../components/grocery/GroceryGroup'
import type { GroceryItem } from '../types/app'

export function GroceryPage() {
  const weekStart = getMondayOf(new Date().toISOString().split('T')[0])
  const { data: items = [], isLoading } = useGroceryList(weekStart)
  const { mutateAsync: generate, isPending: isGenerating } = useGenerateGroceryList(weekStart)
  const { mutate: addItem } = useAddGroceryItem(weekStart)
  const { mutate: deleteAll } = useDeleteAllGroceryItems(weekStart)

  const location = useLocation()
  const navigate = useNavigate()
  const showAddOverlay = new URLSearchParams(location.search).get('add') === '1'

  const [confirmRegen, setConfirmRegen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [addText, setAddText] = useState('')
  const addInputRef = useRef<HTMLInputElement>(null)

  // Lock scroll when any modal is open
  useEffect(() => {
    if (confirmRegen || confirmClear || showAddOverlay) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [confirmRegen, confirmClear, showAddOverlay])

  // Focus add input when overlay opens
  useEffect(() => {
    if (showAddOverlay) {
      setTimeout(() => addInputRef.current?.focus(), 50)
    } else {
      setAddText('')
    }
  }, [showAddOverlay])

  // Escape key closes modals
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (showAddOverlay) navigate('/grocery', { replace: true })
      else if (confirmRegen) setConfirmRegen(false)
      else if (confirmClear) setConfirmClear(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showAddOverlay, confirmRegen, confirmClear, navigate])

  const grouped = new Map<string, { title: string; items: GroceryItem[] }>()
  const other: GroceryItem[] = []
  for (const item of items) {
    if (!item.recipe_id) { other.push(item); continue }
    const key = item.recipe_id
    if (!grouped.has(key)) grouped.set(key, { title: item.recipe?.title ?? 'Recipe', items: [] })
    grouped.get(key)!.items.push(item)
  }

  const handleGenerate = async () => {
    setConfirmRegen(false)
    await generate()
  }

  const handleAddItem = () => {
    const text = addText.trim()
    if (!text) return
    addItem(text)
    setAddText('')
    navigate('/grocery', { replace: true })
  }

  const handleClearAll = () => {
    setConfirmClear(false)
    deleteAll()
  }

  return (
    <div className="px-4 pt-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-serif text-2xl font-bold text-warm-primary">Grocery</h1>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              onClick={() => setConfirmClear(true)}
              aria-label="Clear all items"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg active:opacity-70 transition-opacity cursor-pointer touch-manipulation"
            >
              <Trash2 className="w-5 h-5 text-warm-muted" />
            </button>
          )}
          <button
            onClick={() => items.length > 0 ? setConfirmRegen(true) : handleGenerate()}
            disabled={isGenerating}
            className="bg-warm-accent text-white font-sans font-semibold text-sm px-3 py-2 rounded-lg min-h-[44px] active:opacity-80 disabled:opacity-50 cursor-pointer touch-manipulation whitespace-nowrap">
            {isGenerating ? 'Generating…' : 'Generate weekly list'}
          </button>
        </div>
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
        <div className="flex flex-col gap-4 pb-24">
          {[...grouped.entries()].map(([recipeId, group]) => (
            <GroceryGroup key={recipeId} title={group.title} items={group.items} weekStart={weekStart} />
          ))}
          {other.length > 0 && <GroceryGroup title="Other" items={other} weekStart={weekStart} />}
        </div>
      )}

      {/* Add item overlay */}
      {showAddOverlay && (
        <div className="fixed inset-0 z-40 flex items-end"
          onClick={() => navigate('/grocery', { replace: true })}>
          <div className="absolute inset-0 bg-warm-primary/30 backdrop-blur-sm" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add grocery item"
            className="relative bg-warm-card w-full rounded-t-2xl p-5 flex flex-col gap-3"
            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-8 h-1 bg-warm-border rounded-full mx-auto mb-1" />
            <h2 className="font-serif text-lg font-bold text-warm-primary">Add item</h2>
            <input
              ref={addInputRef}
              value={addText}
              onChange={e => setAddText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddItem() }}
              placeholder="e.g. Olive oil"
              aria-label="Item name"
              className="w-full bg-warm-surface border border-warm-border rounded-xl px-4 py-3 text-warm-primary font-sans text-base placeholder:text-warm-muted focus:outline-none focus:border-warm-accent transition-colors min-h-[44px]"
            />
            <button
              onClick={handleAddItem}
              disabled={!addText.trim()}
              className="w-full bg-warm-accent text-white font-sans font-semibold text-sm py-3 rounded-xl min-h-[44px] active:opacity-80 disabled:opacity-50 cursor-pointer touch-manipulation"
            >
              Add to list
            </button>
          </div>
        </div>
      )}

      {/* Regenerate confirm */}
      {confirmRegen && (
        <div className="fixed inset-0 z-40 bg-warm-primary/30 backdrop-blur-sm flex items-end"
          onClick={() => setConfirmRegen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="regen-dialog-title"
            className="bg-warm-card w-full rounded-t-2xl p-6 flex flex-col gap-4"
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}>
            <h2 id="regen-dialog-title" className="font-serif text-lg font-bold text-warm-primary">Regenerate list?</h2>
            <p className="font-sans text-warm-secondary text-sm">This will replace the current grocery list with this week's meal plan.</p>
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

      {/* Clear all confirm */}
      {confirmClear && (
        <div className="fixed inset-0 z-40 bg-warm-primary/30 backdrop-blur-sm flex items-end"
          onClick={() => setConfirmClear(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="clear-dialog-title"
            className="bg-warm-card w-full rounded-t-2xl p-6 flex flex-col gap-4"
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}>
            <h2 id="clear-dialog-title" className="font-serif text-lg font-bold text-warm-primary">Clear grocery list?</h2>
            <p className="font-sans text-warm-secondary text-sm">This will remove all items from the current grocery list.</p>
            <button onClick={handleClearAll}
              className="w-full bg-red-500 text-white font-sans font-semibold text-sm py-3 rounded-xl min-h-[44px] cursor-pointer touch-manipulation">
              Clear all
            </button>
            <button onClick={() => setConfirmClear(false)}
              className="w-full border border-warm-border text-warm-primary font-sans text-sm py-3 rounded-xl min-h-[44px] bg-warm-card active:bg-warm-surface cursor-pointer touch-manipulation">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
