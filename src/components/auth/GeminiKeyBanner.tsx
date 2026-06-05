import { Link } from 'react-router-dom'
import { KeyRound } from 'lucide-react'

export function GeminiKeyBanner() {
  return (
    <Link to="/settings"
      className="flex items-center gap-2 bg-warm-surface border border-warm-border rounded-lg px-3 py-2 min-h-[44px] cursor-pointer touch-manipulation">
      <KeyRound className="w-4 h-4 text-warm-accent flex-shrink-0" aria-hidden="true" />
      <span className="font-sans text-xs text-warm-secondary">Add an AI key in Settings to extract recipes</span>
    </Link>
  )
}
