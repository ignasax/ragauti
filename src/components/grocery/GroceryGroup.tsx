import { Check, Trash2 } from 'lucide-react'
import { GroceryItem } from './GroceryItem'
import { useToggleAllGroceryItems, useDeleteGroceryGroup } from '../../hooks/useGroceryList'
import type { GroceryItem as GroceryItemType } from '../../types/app'

interface GroceryGroupProps {
  title: string
  items: GroceryItemType[]
  weekStart: string
}

export function GroceryGroup({ title, items, weekStart }: GroceryGroupProps) {
  const { mutate: toggleAll } = useToggleAllGroceryItems(weekStart)
  const { mutate: deleteGroup } = useDeleteGroceryGroup(weekStart)

  const allChecked = items.length > 0 && items.every(i => i.is_checked)
  const ids = items.map(i => i.id)

  return (
    <div>
      <div className="flex items-center justify-between px-1 mb-1">
        <h3 className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider">
          {title}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleAll({ ids, is_checked: !allChecked })}
            aria-label={allChecked ? 'Uncheck all' : 'Check all'}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg active:bg-warm-surface transition-colors cursor-pointer touch-manipulation"
          >
            <Check className={`w-4 h-4 ${allChecked ? 'text-warm-accent' : 'text-warm-muted'}`} />
          </button>
          <button
            onClick={() => deleteGroup({ ids })}
            aria-label="Delete group"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg active:bg-warm-surface transition-colors cursor-pointer touch-manipulation"
          >
            <Trash2 className="w-4 h-4 text-warm-muted" />
          </button>
        </div>
      </div>
      <div className="bg-warm-card border border-warm-border rounded-xl overflow-hidden">
        {items.map((item, i) => (
          <div key={item.id}>
            {i > 0 && <div className="border-t border-warm-border mx-3" />}
            <GroceryItem item={item} />
          </div>
        ))}
      </div>
    </div>
  )
}
