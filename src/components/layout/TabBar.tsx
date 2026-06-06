import { NavLink } from 'react-router-dom'
import { BookOpen, CalendarDays, ShoppingCart, Settings, Snowflake } from 'lucide-react'

const tabs = [
  { to: '/recipes',  icon: BookOpen,    label: 'Recipes'  },
  { to: '/planner',  icon: CalendarDays, label: 'Planner'  },
  { to: '/fridge',   icon: Snowflake,   label: 'Fridge'   },
  { to: '/grocery',  icon: ShoppingCart, label: 'Grocery'  },
  { to: '/settings', icon: Settings,    label: 'Settings' },
]

export function TabBar() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-warm-base border-t border-warm-border flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[60px] cursor-pointer touch-manipulation ${
              isActive ? 'text-warm-accent' : 'text-warm-secondary'
            }`
          }
        >
          <Icon className="w-5 h-5" aria-hidden="true" />
          <span className="font-sans text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
