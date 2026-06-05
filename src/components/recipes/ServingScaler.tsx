import { useState } from 'react'
import { scaleIngredients } from '../../utils/servingScaler'

export function ServingScaler({ ingredients, baseServings }: { ingredients: string; baseServings: number | null }) {
  const base = Math.max(1, baseServings ?? 1)
  const [selected, setSelected] = useState(base > 4 ? 4 : base)
  const multiplier = selected / base

  return (
    <div>
      <div className="flex items-center mb-3">
        <span className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider">
          Servings
        </span>
        <div className="flex gap-1 ml-auto">
          {[1, 2, 3, 4].map(n => (
            <button key={n} onClick={() => setSelected(n)}
              className={`font-sans text-xs px-2.5 py-1.5 rounded-lg min-h-[36px] min-w-[36px] cursor-pointer touch-manipulation transition-colors ${
                selected === n ? 'bg-warm-accent text-white' : 'bg-warm-surface text-warm-secondary border border-warm-border'
              }`}>
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="font-sans text-warm-primary text-[15px] leading-[1.7] whitespace-pre-line">
        {scaleIngredients(ingredients, multiplier)}
      </div>
    </div>
  )
}
