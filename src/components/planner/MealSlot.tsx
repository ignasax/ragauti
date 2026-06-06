import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, X, Utensils } from 'lucide-react'
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
        <div className="relative bg-warm-surface rounded-lg overflow-hidden h-[80px]">
          <button
            onClick={() => removeSlot({ id: slot.id, slot_date: date })}
            aria-label="Remove from plan"
            className="absolute top-1 left-1 z-10 w-6 h-6 bg-warm-base/80 rounded-full flex items-center justify-center cursor-pointer touch-manipulation"
          >
            <X className="w-3 h-3 text-warm-secondary" />
          </button>
          <Link
            to={`/recipes/${slot.recipe.id}`}
            className="flex items-stretch h-full active:opacity-70 transition-opacity"
          >
            <div className="w-14 flex-shrink-0 bg-warm-border">
              {slot.recipe.image_url
                ? <img src={slot.recipe.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                : <div className="w-full h-full flex items-center justify-center"><Utensils className="w-4 h-4 text-warm-muted" /></div>
              }
            </div>
            <span className="font-sans text-sm font-semibold text-warm-primary line-clamp-2 min-w-0 flex-1 leading-snug self-center p-2">{slot.recipe.title}</span>
          </Link>
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
