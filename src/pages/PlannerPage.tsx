import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { WeekGrid } from '../components/planner/WeekGrid'
import { getLocalDateStr } from '../hooks/useMealPlan'

function getDefaultWindowStart(): string {
  return getLocalDateStr(-1) // yesterday
}

function formatWindowLabel(start: string): string {
  const [sy, sm, sd] = start.split('-').map(Number)
  const startDate = new Date(sy, sm - 1, sd)
  const endDate = new Date(sy, sm - 1, sd + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${fmt(startDate)} – ${fmt(endDate)}`
}

export function PlannerPage() {
  const [windowStart, setWindowStart] = useState(getDefaultWindowStart)

  const shift = (days: number) => {
    const [y, m, d] = windowStart.split('-').map(Number)
    const date = new Date(y, m - 1, d + days)
    setWindowStart(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`)
  }

  const isOnDefault = windowStart === getDefaultWindowStart()

  return (
    <div className="px-4 pt-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-serif text-2xl font-bold text-warm-primary">Planner</h1>
        <div className="flex items-center gap-1">
          {!isOnDefault && (
            <button
              onClick={() => setWindowStart(getDefaultWindowStart())}
              className="font-sans text-xs text-warm-accent border border-warm-accent px-2 py-1 rounded-full cursor-pointer touch-manipulation mr-1">
              Today
            </button>
          )}
          <button onClick={() => shift(-7)} aria-label="Previous 7 days"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer touch-manipulation">
            <ChevronLeft className="w-5 h-5 text-warm-secondary" />
          </button>
          <span className="font-sans text-sm text-warm-secondary whitespace-nowrap">{formatWindowLabel(windowStart)}</span>
          <button onClick={() => shift(7)} aria-label="Next 7 days"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer touch-manipulation">
            <ChevronRight className="w-5 h-5 text-warm-secondary" />
          </button>
        </div>
      </div>
      <WeekGrid windowStart={windowStart} />
    </div>
  )
}
