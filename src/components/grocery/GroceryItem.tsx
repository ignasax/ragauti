import { useToggleGroceryItem } from '../../hooks/useGroceryList'
import type { GroceryItem as GroceryItemType } from '../../types/app'

export function GroceryItem({ item }: { item: GroceryItemType }) {
  const { mutate: toggle } = useToggleGroceryItem()
  return (
    <button
      onClick={() => toggle({ id: item.id, is_checked: !item.is_checked, week_start: item.week_start })}
      aria-pressed={item.is_checked}
      className="flex items-center gap-3 w-full min-h-[44px] px-3 py-2 cursor-pointer touch-manipulation active:bg-warm-surface rounded-lg transition-colors text-left"
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
  )
}
