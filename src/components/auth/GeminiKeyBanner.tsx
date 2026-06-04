import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

export function GeminiKeyBanner() {
  return (
    <div className="flex items-center gap-3 bg-warm-surface border border-warm-border rounded-xl px-4 py-3">
      <Sparkles className="w-4 h-4 text-warm-secondary flex-shrink-0" aria-hidden="true" />
      <p className="font-sans text-sm text-warm-secondary">
        Add your Gemini API key in{' '}
        <Link to="/settings" className="text-warm-accent underline touch-manipulation">
          Settings
        </Link>{' '}
        to enable AI features.
      </p>
    </div>
  )
}
