import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { RecipePicker } from './RecipePicker'
import { useAddMealSlot, useRemoveMealSlot } from '../../hooks/useMealPlan'
import type { MealPlanSlot, Recipe } from '../../types/app'

interface MealSlotProps {
  date: string
  mealType: 'lunch' | 'dinner'
  slot?: MealPlanSlot
}

export function MealSlot({ date, mealType, slot }: MealSlotProps) {
  const [picking, setPicking] = useState(false)
  const { mutate: addSlot } = useAddMealSlot()
  const { mutate: removeSlot } = useRemoveMealSlot()

  const handleSelect = (recipe: Recipe) => {
    addSlot({ slot_date: date, meal_type: mealType, recipe_id: recipe.id })
    setPicking(false)
  }

  if (slot?.recipe) {
    return (
      <>
        <div className="relative bg-warm-surface rounded-lg overflow-hidden min-h-[52px] flex items-center px-2 gap-2">
          {slot.recipe.image_url && (
            <div className="w-8 h-8 rounded flex-shrink-0 overflow-hidden">
              <img src={slot.recipe.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}
          <span className="font-sans text-xs text-warm-primary line-clamp-2 flex-1 leading-tight">{slot.recipe.title}</span>
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
        className="w-full min-h-[52px] border-2 border-dashed border-warm-border rounded-lg flex items-center justify-center cursor-pointer touch-manipulation active:bg-warm-surface transition-colors"
        aria-label={`Add ${mealType} for ${date}`}>
        <Plus className="w-4 h-4 text-warm-muted" />
      </button>
      {picking && <RecipePicker onSelect={handleSelect} onClose={() => setPicking(false)} />}
    </>
  )
}
