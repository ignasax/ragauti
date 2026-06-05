import { useState } from 'react'
import { scaleIngredients } from '../../utils/servingScaler'

export function ServingScaler({ ingredients, baseServings }: { ingredients: string; baseServings: number | null }) {
  const base = Math.max(1, baseServings ?? 1)
  const [selected, setSelected] = useState(base)
  const multiplier = selected / base

  return (
    <div>
      <div className="flex items-center mb-3">
        <span className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider">
          Servings
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => setSelected(s => Math.max(1, s - 1))}
            className="w-9 h-9 flex items-center justify-center bg-warm-surface border border-warm-border rounded-lg font-bold text-warm-primary cursor-pointer touch-manipulation active:opacity-70">−</button>
          <span className="font-sans text-warm-primary text-sm font-semibold w-6 text-center">{selected}</span>
          <button onClick={() => setSelected(s => s + 1)}
            className="w-9 h-9 flex items-center justify-center bg-warm-surface border border-warm-border rounded-lg font-bold text-warm-primary cursor-pointer touch-manipulation active:opacity-70">+</button>
        </div>
      </div>
      <div className="font-sans text-warm-primary text-[15px] leading-[1.7] whitespace-pre-line">
        {scaleIngredients(ingredients, multiplier)}
      </div>
    </div>
  )
}
