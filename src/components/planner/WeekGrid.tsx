import { useMealPlan } from '../../hooks/useMealPlan'
import { MealSlot } from './MealSlot'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface WeekGridProps { weekStart: string }

export function WeekGrid({ weekStart }: WeekGridProps) {
  const { data: slots = [] } = useMealPlan(weekStart)

  const days = DAY_NAMES.map((name, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return { name, date: d.toISOString().split('T')[0], display: `${name} ${d.getDate()}` }
  })

  const getSlot = (date: string, mealType: 'lunch' | 'dinner') =>
    slots.find(s => s.slot_date === date && s.meal_type === mealType)

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-[100px_1fr_1fr] gap-2 px-1 pb-1">
        <div />
        <span className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider text-center">Lunch</span>
        <span className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider text-center">Dinner</span>
      </div>
      {days.map(({ display, date }) => (
        <div key={date} className="grid grid-cols-[100px_1fr_1fr] gap-2 items-start">
          <div className="min-h-[52px] flex items-center">
            <span className="font-sans text-sm font-semibold text-warm-primary">{display}</span>
          </div>
          <MealSlot date={date} mealType="lunch" slot={getSlot(date, 'lunch')} />
          <MealSlot date={date} mealType="dinner" slot={getSlot(date, 'dinner')} />
        </div>
      ))}
    </div>
  )
}
