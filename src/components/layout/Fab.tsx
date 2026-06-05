import { useLocation, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'

const fabRoutes: Record<string, { label: string; action: string }> = {
  '/recipes': { label: 'Add recipe', action: '/recipes/new' },
}

export function Fab() {
  const location = useLocation()
  const navigate = useNavigate()
  const config = fabRoutes[location.pathname]
  if (!config) return null

  return (
    <button
      type="button"
      onClick={() => navigate(config.action)}
      className="fixed right-4 z-20 bg-warm-accent text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:opacity-80 transition-opacity duration-150 touch-manipulation cursor-pointer"
      style={{ bottom: 'calc(60px + env(safe-area-inset-bottom) + 16px)' }}
      aria-label={config.label}
    >
      <Plus className="w-6 h-6" aria-hidden="true" />
    </button>
  )
}
