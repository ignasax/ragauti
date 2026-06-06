import { useRef, useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { GroceryItem } from './GroceryItem'
import {
  useToggleAllGroceryItems,
  useDeleteGroceryGroup,
  useAddGroceryItemToGroup,
} from '../../hooks/useGroceryList'
import type { GroceryItem as GroceryItemType } from '../../types/app'

interface GroceryGroupProps {
  title: string
  items: GroceryItemType[]
  weekStart: string
  recipeId: string | null
  hideGroupActions?: boolean
}

export function GroceryGroup({
  title,
  items,
  weekStart,
  recipeId,
  hideGroupActions = false,
}: GroceryGroupProps) {
  const { mutate: toggleAll } = useToggleAllGroceryItems(weekStart)
  const { mutate: deleteGroup } = useDeleteGroceryGroup(weekStart)
  const { mutate: addItem } = useAddGroceryItemToGroup(weekStart)
  const [adding, setAdding] = useState(false)
  const [addText, setAddText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const ids = items.map(i => i.id)
  const allChecked = items.length > 0 && items.every(i => i.is_checked)

  const activateAdd = () => {
    setAdding(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const commitAdd = () => {
    const text = addText.trim()
    if (text) {
      addItem({ text, recipeId })
    }
    setAddText('')
    setAdding(false)
  }

  const cancelAdd = () => {
    setAddText('')
    setAdding(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between px-1 mb-1">
        <h3
          className={`font-sans font-bold text-[10px] uppercase tracking-wider ${
            recipeId === null ? 'text-warm-accent' : 'text-warm-secondary'
          }`}
        >
          {title}
        </h3>
        {!hideGroupActions && (
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
        )}
      </div>
      <div className="bg-warm-card border border-warm-border rounded-xl overflow-hidden">
        {items.map((item, i) => (
          <div key={item.id}>
            {i > 0 && <div className="border-t border-warm-border mx-3" />}
            <GroceryItem item={item} />
          </div>
        ))}
        {items.length > 0 && <div className="border-t border-warm-border mx-3" />}
        {adding ? (
          <div className="flex items-center gap-2 px-3 min-h-[44px]">
            <div className="w-5 h-5 rounded border-2 border-dashed border-warm-border flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={addText}
              onChange={e => setAddText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitAdd()
                if (e.key === 'Escape') cancelAdd()
              }}
              placeholder="add item…"
              className="flex-1 font-sans text-base bg-transparent border-none outline-none border-b border-warm-accent min-w-0 py-2 text-warm-primary placeholder:text-warm-muted"
            />
            <button
              onClick={commitAdd}
              aria-label="Add item"
              className="w-7 h-7 flex items-center justify-center bg-warm-accent rounded-md text-white text-sm cursor-pointer touch-manipulation"
            >✓</button>
            <button
              onClick={cancelAdd}
              aria-label="Cancel"
              className="w-7 h-7 flex items-center justify-center border border-warm-border rounded-md text-warm-secondary text-sm cursor-pointer touch-manipulation"
            >✕</button>
          </div>
        ) : (
          <button
            onClick={activateAdd}
            className="flex items-center gap-2 px-3 min-h-[44px] w-full text-left cursor-pointer touch-manipulation active:bg-warm-surface"
          >
            <div className="w-5 h-5 rounded border-2 border-dashed border-warm-border flex-shrink-0" />
            <span className="font-sans text-base text-warm-muted">add item…</span>
          </button>
        )}
      </div>
    </div>
  )
}
