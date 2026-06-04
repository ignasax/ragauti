import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function LoginPage() {
  const { session } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (session) navigate('/recipes', { replace: true })
  }, [session, navigate])

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/recipes` },
    })
  }

  return (
    <div className="min-h-screen bg-warm-base flex flex-col items-center justify-center px-6">
      <div className="mb-10 text-center">
        <h1 className="font-serif text-4xl font-bold text-warm-primary mb-2">Ragauti</h1>
        <p className="font-sans text-warm-secondary text-base">Your personal recipe book</p>
      </div>
      <button
        onClick={handleGoogleLogin}
        className="w-full max-w-xs bg-warm-accent text-white font-sans font-semibold text-sm px-6 py-3 rounded-xl min-h-[44px] active:opacity-80 transition-opacity duration-150 touch-manipulation cursor-pointer"
      >
        Continue with Google
      </button>
    </div>
  )
}
