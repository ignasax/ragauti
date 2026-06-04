import { useState } from 'react'
import { scaleIngredients } from '../../utils/servingScaler'

export function ServingScaler({ ingredients, baseServings }: { ingredients: string; baseServings: number | null }) {
  const [multiplier, setMultiplier] = useState(1)
  return (
    <div>
      <div className="flex items-center mb-3">
        <span className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider">
          Servings{baseServings ? ` · base ${baseServings}` : ''}
        </span>
        <div className="flex gap-1 ml-auto">
          {[0.5, 1, 2, 3, 4].map(n => (
            <button key={n} onClick={() => setMultiplier(n)}
              className={`font-sans text-xs px-2.5 py-1.5 rounded-lg min-h-[36px] min-w-[36px] cursor-pointer touch-manipulation transition-colors ${
                multiplier === n ? 'bg-warm-accent text-white' : 'bg-warm-surface text-warm-secondary border border-warm-border'
              }`}>
              {n === 0.5 ? '½×' : `${n}×`}
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
