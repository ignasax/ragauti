import { useState } from 'react'
import { scaleIngredients } from '../../utils/servingScaler'

const MULTIPLIERS = [0.5, 1, 2, 3, 4]

function formatCount(n: number): string {
  if (n === 0.5) return '½'
  if (Number.isInteger(n)) return String(n)
  return String(Math.round(n * 10) / 10)
}

export function ServingScaler({ ingredients, baseServings }: { ingredients: string; baseServings: number | null }) {
  const [multiplier, setMultiplier] = useState(1)

  return (
    <div>
      <div className="flex items-center mb-3">
        <span className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider">
          Servings
        </span>
        <div className="flex gap-1 ml-auto">
          {MULTIPLIERS.map(n => {
            const label = baseServings
              ? formatCount(n * baseServings)
              : (n === 0.5 ? '½×' : `${n}×`)
            return (
              <button key={n} onClick={() => setMultiplier(n)}
                className={`font-sans text-xs px-2.5 py-1.5 rounded-lg min-h-[36px] min-w-[36px] cursor-pointer touch-manipulation transition-colors ${
                  multiplier === n ? 'bg-warm-accent text-white' : 'bg-warm-surface text-warm-secondary border border-warm-border'
                }`}>
                {label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="font-sans text-warm-primary text-[15px] leading-[1.7] whitespace-pre-line">
        {scaleIngredients(ingredients, multiplier)}
      </div>
    </div>
  )
}
