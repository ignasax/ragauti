import { useMealPlan, getLocalDateStr } from '../../hooks/useMealPlan'
import { MealSlot } from './MealSlot'

interface WeekGridProps { windowStart: string }

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function WeekGrid({ windowStart }: WeekGridProps) {
  const { data: slots = [] } = useMealPlan(windowStart)
  const today = getLocalDateStr(0)
  const yesterday = getLocalDateStr(-1)

  const [startY, startM, startD] = windowStart.split('-').map(Number)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startY, startM - 1, startD + i)
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    let label: string
    if (date === today) label = 'Today'
    else if (date === yesterday) label = 'Yest'
    else label = `${SHORT_DAYS[d.getDay()]} ${d.getDate()}`
    return { label, date, isToday: date === today }
  })

  const getSlot = (date: string, mealType: 'lunch' | 'dinner') =>
    slots.find(s => s.slot_date === date && s.meal_type === mealType)

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-[68px_1fr_1fr] gap-2 px-1 pb-1">
        <div />
        <span className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider text-center">Lunch</span>
        <span className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider text-center">Dinner</span>
      </div>
      {days.map(({ label, date, isToday }) => (
        <div key={date} className={`grid grid-cols-[68px_1fr_1fr] gap-2 items-start rounded-xl px-1 ${isToday ? 'bg-warm-accent/8' : ''}`}>
          <div className="min-h-[80px] flex items-center">
            <span className={`font-sans text-sm font-semibold ${isToday ? 'text-warm-accent' : 'text-warm-primary'}`}>
              {label}
            </span>
          </div>
          <MealSlot date={date} mealType="lunch" slot={getSlot(date, 'lunch')} windowStart={windowStart} />
          <MealSlot date={date} mealType="dinner" slot={getSlot(date, 'dinner')} windowStart={windowStart} />
        </div>
      ))}
    </div>
  )
}
