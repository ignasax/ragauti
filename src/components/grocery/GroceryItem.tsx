import { Trash2 } from 'lucide-react'
import { useToggleGroceryItem, useDeleteGroceryItem } from '../../hooks/useGroceryList'
import type { GroceryItem as GroceryItemType } from '../../types/app'

export function GroceryItem({ item }: { item: GroceryItemType }) {
  const { mutate: toggle } = useToggleGroceryItem()
  const { mutate: deleteItem } = useDeleteGroceryItem()

  return (
    <div className="flex items-center w-full min-h-[44px] px-3 gap-1">
      <button
        onClick={() => toggle({ id: item.id, is_checked: !item.is_checked, week_start: item.week_start })}
        aria-pressed={item.is_checked}
        className="flex items-center gap-3 flex-1 py-2 cursor-pointer touch-manipulation active:opacity-70 text-left"
      >
        <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          item.is_checked ? 'bg-warm-accent border-warm-accent' : 'border-warm-accent'
        }`} aria-hidden="true">
          {item.is_checked && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <span className={`font-sans text-base flex-1 ${item.is_checked ? 'line-through text-warm-muted' : 'text-warm-primary'}`}>
          {item.ingredient_text}
        </span>
      </button>
      {item.recipe_id === null && (
        <button
          onClick={() => deleteItem({ id: item.id, week_start: item.week_start })}
          aria-label="Remove item"
          className="min-w-[36px] min-h-[36px] flex items-center justify-center flex-shrink-0 cursor-pointer touch-manipulation active:opacity-70"
        >
          <Trash2 className="w-4 h-4 text-warm-muted" />
        </button>
      )}
    </div>
  )
}
