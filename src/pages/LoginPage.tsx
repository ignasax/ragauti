import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UtensilsCrossed, CalendarDays, ShoppingCart, Share } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { TermsModal } from '../components/TermsModal'
import { PrivacyModal } from '../components/PrivacyModal'

const FEATURES = [
  { icon: UtensilsCrossed, text: 'Save recipes or paste a URL — AI fills the form for you' },
  { icon: CalendarDays,    text: 'Plan your meals for the week in a tap' },
  { icon: ShoppingCart,    text: 'Auto-generate a grocery list from your meal plan' },
]

export function LoginPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [modal, setModal] = useState<'terms' | 'privacy' | null>(null)

  useEffect(() => {
    if (session) navigate('/recipes', { replace: true })
  }, [session, navigate])

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/recipes`,
        queryParams: { prompt: 'select_account' },
      },
    })
  }

  return (
    <div className="min-h-screen bg-warm-base flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-xs flex flex-col items-center gap-8">

        {/* Branding */}
        <div className="text-center">
          <h1 className="font-serif text-4xl font-bold text-warm-primary mb-2">Ragauti</h1>
          <p className="font-sans text-warm-secondary text-base">Your personal recipe book</p>
        </div>

        {/* How it works */}
        <div className="w-full flex flex-col gap-3">
          {FEATURES.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-3 bg-warm-surface border border-warm-border rounded-xl px-4 py-3">
              <Icon className="w-4 h-4 text-warm-accent mt-0.5 shrink-0" aria-hidden="true" />
              <p className="font-sans text-warm-primary text-sm leading-snug">{text}</p>
            </div>
          ))}
        </div>

        {/* Install tip */}
        <div className="w-full bg-warm-surface border border-warm-border rounded-xl px-4 py-3 flex items-start gap-3">
          <Share className="w-4 h-4 text-warm-accent mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex flex-col gap-0.5">
            <p className="font-sans font-semibold text-warm-primary text-sm">Install as an app</p>
            <p className="font-sans text-warm-secondary text-xs leading-relaxed">
              Open <span className="font-medium">ragauti.vercel.app</span> in Chrome or Safari, tap <span className="font-medium">Share → Add to Home Screen</span>. Full screen, no browser bar, real app icon.
            </p>
          </div>
        </div>

        {/* Sign in */}
        <div className="w-full flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full bg-warm-accent text-white font-sans font-semibold text-sm px-6 py-3 rounded-xl min-h-[44px] active:opacity-80 transition-opacity duration-150 touch-manipulation cursor-pointer"
          >
            Continue with Google
          </button>
          <p className="font-sans text-warm-muted text-xs text-center">
            Free to use. AI features require your own API key —{' '}
            <span className="text-warm-secondary">add it in Settings after signing in.</span>
          </p>
        </div>

        {/* Legal links */}
        <div className="flex gap-4">
          <button onClick={() => setModal('terms')}
            className="font-sans text-warm-muted text-xs underline underline-offset-2 cursor-pointer touch-manipulation">
            Terms of Service
          </button>
          <span className="text-warm-muted text-xs">·</span>
          <button onClick={() => setModal('privacy')}
            className="font-sans text-warm-muted text-xs underline underline-offset-2 cursor-pointer touch-manipulation">
            Privacy Policy
          </button>
        </div>
      </div>

      {modal === 'terms'   && <TermsModal   onClose={() => setModal(null)} />}
      {modal === 'privacy' && <PrivacyModal onClose={() => setModal(null)} />}
    </div>
  )
}
