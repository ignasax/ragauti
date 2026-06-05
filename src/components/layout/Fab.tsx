import { useLocation, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'

const fabConfig: Record<string, { label: string; action: string }> = {
  '/recipes':  { label: 'Add recipe',  action: '/recipes/new' },
  '/planner':  { label: 'Add to plan', action: '/planner?add=1' },
  '/grocery':  { label: 'Add item',    action: '/grocery?add=1' },
}

export function Fab() {
  const location = useLocation()
  const navigate = useNavigate()
  const config = fabConfig[location.pathname]
  if (!config) return null

  return (
    <button
      type="button"
      onClick={() => navigate(config.action)}
      className="fixed right-4 z-20 bg-warm-accent text-white font-sans font-semibold text-sm px-4 py-2.5 rounded-full flex items-center gap-1.5 shadow-lg min-h-[44px] active:opacity-80 transition-opacity duration-150 touch-manipulation cursor-pointer"
      style={{ bottom: 'calc(60px + env(safe-area-inset-bottom) + 16px)' }}
      aria-label={config.label}
    >
      <Plus className="w-4 h-4" aria-hidden="true" />
      <span>{config.label}</span>
    </button>
  )
}
