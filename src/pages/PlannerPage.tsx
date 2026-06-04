import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { WeekGrid } from '../components/planner/WeekGrid'
import { getMondayOf } from '../hooks/useMealPlan'

function formatWeekLabel(monday: string): string {
  const end = new Date(monday)
  end.setDate(end.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${fmt(new Date(monday))} – ${fmt(end)}`
}

export function PlannerPage() {
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date().toISOString().split('T')[0]))

  const prev = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d.toISOString().split('T')[0])
  }
  const next = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d.toISOString().split('T')[0])
  }

  return (
    <div className="px-4 pt-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-warm-primary">Planner</h1>
        <div className="flex items-center gap-1">
          <button onClick={prev} aria-label="Previous week"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer touch-manipulation">
            <ChevronLeft className="w-5 h-5 text-warm-secondary" />
          </button>
          <span className="font-sans text-sm text-warm-secondary">{formatWeekLabel(weekStart)}</span>
          <button onClick={next} aria-label="Next week"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer touch-manipulation">
            <ChevronRight className="w-5 h-5 text-warm-secondary" />
          </button>
        </div>
      </div>
      <WeekGrid weekStart={weekStart} />
    </div>
  )
}
