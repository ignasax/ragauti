import { useEffect, useState } from 'react'
import { RefreshCcw, Trash2 } from 'lucide-react'
import {
  useGroceryList,
  useGenerateGroceryList,
  useDeleteAllGroceryItems,
} from '../hooks/useGroceryList'
import { getLocalDateStr } from '../hooks/useMealPlan'
import { GroceryGroup } from '../components/grocery/GroceryGroup'
import type { GroceryItem } from '../types/app'

export function GroceryPage() {
  const weekStart = getLocalDateStr(0)
  const { data: items = [], isLoading } = useGroceryList(weekStart)
  const { mutateAsync: generate, isPending: isGenerating } = useGenerateGroceryList(weekStart)
  const { mutate: deleteAll } = useDeleteAllGroceryItems(weekStart)
  const [confirmRegen, setConfirmRegen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    if (confirmRegen || confirmClear) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [confirmRegen, confirmClear])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (confirmRegen) setConfirmRegen(false)
      else if (confirmClear) setConfirmClear(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmRegen, confirmClear])

  const grouped = new Map<string, { title: string; items: GroceryItem[]; recipeId: string }>()
  const other: GroceryItem[] = []
  for (const item of items) {
    if (!item.recipe_id) { other.push(item); continue }
    const key = item.recipe_id
    if (!grouped.has(key))
      grouped.set(key, { title: item.recipe?.title ?? 'Recipe', items: [], recipeId: key })
    grouped.get(key)!.items.push(item)
  }

  const handleGenerate = async () => {
    setConfirmRegen(false)
    await generate()
  }

  return (
    <div className="px-4 pt-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-serif text-2xl font-bold text-warm-primary">Grocery</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => items.length > 0 ? setConfirmRegen(true) : handleGenerate()}
            disabled={isGenerating}
            aria-label={isGenerating ? 'Generating…' : 'Generate weekly list'}
            className="bg-warm-accent text-white min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg active:opacity-80 disabled:opacity-50 cursor-pointer touch-manipulation"
          >
            <RefreshCcw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
          {items.length > 0 && (
            <button
              onClick={() => setConfirmClear(true)}
              aria-label="Clear all"
              className="bg-warm-accent text-white min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg active:opacity-80 cursor-pointer touch-manipulation"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-warm-surface rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-28">
          {[...grouped.entries()].map(([recipeId, group]) => (
            <GroceryGroup
              key={recipeId}
              title={group.title}
              items={group.items}
              weekStart={weekStart}
              recipeId={recipeId}
            />
          ))}
          <GroceryGroup
            title="Other"
            items={other}
            weekStart={weekStart}
            recipeId={null}
            hideGroupActions
          />
        </div>
      )}

      {confirmRegen && (
        <div
          className="fixed inset-0 z-40 bg-warm-primary/30 backdrop-blur-sm flex items-end"
          onClick={() => setConfirmRegen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="regen-dialog-title"
            className="bg-warm-card w-full rounded-t-2xl p-6 flex flex-col gap-4"
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 id="regen-dialog-title" className="font-serif text-lg font-bold text-warm-primary">
              Regenerate list?
            </h2>
            <p className="font-sans text-warm-secondary text-sm">
              This will replace the current grocery list with this week's meal plan.
            </p>
            <button
              onClick={handleGenerate}
              className="w-full bg-warm-accent text-white font-sans font-semibold text-sm py-3 rounded-xl min-h-[44px] cursor-pointer touch-manipulation"
            >
              Regenerate
            </button>
            <button
              onClick={() => setConfirmRegen(false)}
              className="w-full border border-warm-border text-warm-primary font-sans text-sm py-3 rounded-xl min-h-[44px] bg-warm-card active:bg-warm-surface cursor-pointer touch-manipulation"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {confirmClear && (
        <div
          className="fixed inset-0 z-40 bg-warm-primary/30 backdrop-blur-sm flex items-end"
          onClick={() => setConfirmClear(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-dialog-title"
            className="bg-warm-card w-full rounded-t-2xl p-6 flex flex-col gap-4"
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 id="clear-dialog-title" className="font-serif text-lg font-bold text-warm-primary">
              Clear grocery list?
            </h2>
            <p className="font-sans text-warm-secondary text-sm">
              This will remove all items from the current grocery list.
            </p>
            <button
              onClick={() => { setConfirmClear(false); deleteAll() }}
              className="w-full bg-red-500 text-white font-sans font-semibold text-sm py-3 rounded-xl min-h-[44px] cursor-pointer touch-manipulation"
            >
              Clear all
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="w-full border border-warm-border text-warm-primary font-sans text-sm py-3 rounded-xl min-h-[44px] bg-warm-card active:bg-warm-surface cursor-pointer touch-manipulation"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
