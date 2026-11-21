import { useMealPlan, getLocalDateStr } from '../../hooks/useMealPlan'
import { MealSlot } from './MealSlot'
import type { MealType } from '../../types/app'

interface WeekGridProps { windowStart: string }

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const MEAL_ROWS: { type: MealType; label: string; options: number }[] = [
  { type: 'breakfast', label: 'Breakfast', options: 2 },
  { type: 'snack_am', label: 'Snack', options: 1 },
  { type: 'lunch', label: 'Lunch', options: 2 },
  { type: 'snack_pm', label: 'Snack', options: 1 },
  { type: 'dinner', label: 'Dinner', options: 2 },
]

export function WeekGrid({ windowStart }: WeekGridProps) {
  const { data: slots = [] } = useMealPlan(windowStart)
  const today = getLocalDateStr(0)

  const [startY, startM, startD] = windowStart.split('-').map(Number)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startY, startM - 1, startD + i)
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    let label: string
    if (date === today) label = 'Today'
    else label = `${SHORT_DAYS[d.getDay()]} ${d.getDate()}`
    return { label, date, isToday: date === today }
  })

  const getSlot = (date: string, mealType: MealType, position: number) =>
    slots.find(s => s.slot_date === date && s.meal_type === mealType && (s.position ?? 0) === position)

  return (
    <div className="flex flex-col gap-3 pb-4">
      {days.map(({ label, date, isToday }) => (
        <section
          key={date}
          className={`rounded-xl p-2 flex flex-col gap-1.5 ${isToday ? 'bg-warm-accent/12' : 'bg-warm-surface/40'}`}
        >
          <h2 className={`font-sans text-sm font-semibold px-1 ${isToday ? 'text-warm-accent' : 'text-warm-primary'}`}>
            {label}
          </h2>
          {MEAL_ROWS.map(({ type, label: mealLabel, options }) => (
            <div key={type} className="grid grid-cols-[64px_1fr_1fr] gap-2 items-center">
              <span className={`font-sans font-bold text-[10px] uppercase tracking-wider px-1 ${options === 1 ? 'text-warm-muted' : 'text-warm-secondary'}`}>
                {mealLabel}
              </span>
              {options === 1 ? (
                <div className="col-span-2">
                  <MealSlot date={date} mealType={type} position={0} slot={getSlot(date, type, 0)} windowStart={windowStart} />
                </div>
              ) : (
                [0, 1].map(pos => (
                  <MealSlot key={pos} date={date} mealType={type} position={pos} slot={getSlot(date, type, pos)} windowStart={windowStart} />
                ))
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
