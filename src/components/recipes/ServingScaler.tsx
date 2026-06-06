import { useState } from 'react'
import { scaleIngredients } from '../../utils/servingScaler'

interface ServingScalerProps {
  ingredients: string
  baseServings: number | null
  onScaleChange?: (multiplier: number, selected: number) => void
}

export function ServingScaler({ ingredients, baseServings, onScaleChange }: ServingScalerProps) {
  const base = Math.max(1, baseServings ?? 1)
  const [selected, setSelected] = useState(base)

  const change = (delta: number) => {
    const next = Math.max(1, selected + delta)
    setSelected(next)
    onScaleChange?.(next / base, next)
  }

  const multiplier = selected / base

  return (
    <div>
      <div className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider mb-1.5">
        Servings
      </div>
      <div className="flex items-center overflow-hidden rounded-[10px] border border-warm-border bg-warm-card mb-3">
        <button
          onClick={() => change(-1)}
          disabled={selected === 1}
          aria-label="Decrease servings"
          className="w-[52px] h-[38px] flex items-center justify-center border-r border-warm-border text-warm-accent text-xl font-bold disabled:text-warm-muted disabled:opacity-40 cursor-pointer touch-manipulation active:bg-warm-surface"
        >−</button>
        <div className="flex-1 flex items-center justify-center gap-1.5 h-[38px]">
          <span className="font-sans font-bold text-warm-primary text-lg leading-none">{selected}</span>
          <span className="font-sans text-warm-muted text-[10px]">servings · base {base}</span>
        </div>
        <button
          onClick={() => change(1)}
          aria-label="Increase servings"
          className="w-[52px] h-[38px] flex items-center justify-center border-l border-warm-border text-warm-accent text-xl font-bold cursor-pointer touch-manipulation active:bg-warm-surface"
        >+</button>
      </div>
      <div className="font-sans text-warm-primary text-[15px] leading-[1.7] whitespace-pre-line">
        {scaleIngredients(ingredients, multiplier)}
      </div>
    </div>
  )
}
