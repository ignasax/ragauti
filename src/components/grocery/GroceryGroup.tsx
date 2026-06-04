import { GroceryItem } from './GroceryItem'
import type { GroceryItem as GroceryItemType } from '../../types/app'

interface GroceryGroupProps {
  title: string
  items: GroceryItemType[]
}

export function GroceryGroup({ title, items }: GroceryGroupProps) {
  return (
    <div>
      <span className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider block px-3 mb-1">
        {title}
      </span>
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
