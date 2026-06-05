import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, X } from 'lucide-react'

import { RecipePicker } from './RecipePicker'
import { useAddMealSlot, useRemoveMealSlot } from '../../hooks/useMealPlan'
import type { MealPlanSlot, Recipe } from '../../types/app'

interface MealSlotProps {
  date: string
  mealType: 'lunch' | 'dinner'
  slot?: MealPlanSlot
  windowStart: string
}

export function MealSlot({ date, mealType, slot, windowStart }: MealSlotProps) {
  const [picking, setPicking] = useState(false)
  const { mutate: addSlot } = useAddMealSlot(windowStart)
  const { mutate: removeSlot } = useRemoveMealSlot(windowStart)

  const handleSelect = (recipe: Recipe) => {
    addSlot({ slot_date: date, meal_type: mealType, recipe_id: recipe.id })
    setPicking(false)
  }

  if (slot?.recipe) {
    return (
      <>
        <div className="relative bg-warm-surface rounded-lg overflow-hidden min-h-[80px] flex items-center px-2 gap-2">
          <Link
            to={`/recipes/${slot.recipe.id}`}
            className="flex items-center flex-1 min-w-0 py-2 min-h-[80px] active:opacity-70 transition-opacity"
          >
            <span className="font-sans text-[15px] font-bold text-warm-primary line-clamp-3 flex-1 leading-snug">{slot.recipe.title}</span>
          </Link>
          <button onClick={() => removeSlot({ id: slot.id, slot_date: date })}
            aria-label="Remove from plan"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center flex-shrink-0 cursor-pointer touch-manipulation">
            <X className="w-3.5 h-3.5 text-warm-muted" />
          </button>
        </div>
        {picking && <RecipePicker onSelect={handleSelect} onClose={() => setPicking(false)} />}
      </>
    )
  }

  return (
    <>
      <button onClick={() => setPicking(true)}
        className="w-full min-h-[80px] border-2 border-dashed border-warm-border rounded-lg flex items-center justify-center cursor-pointer touch-manipulation active:bg-warm-surface transition-colors"
        aria-label={`Add ${mealType} for ${date}`}>
        <Plus className="w-4 h-4 text-warm-muted" />
      </button>
      {picking && <RecipePicker onSelect={handleSelect} onClose={() => setPicking(false)} />}
    </>
  )
}
