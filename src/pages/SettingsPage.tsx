import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { GeminiKeyForm } from '../components/settings/GeminiKeyForm'

export function SettingsPage() {
  const { user } = useAuth()

  return (
    <div className="px-4 pt-4 flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-bold text-warm-primary">Settings</h1>

      <div className="bg-warm-card border border-warm-border rounded-xl p-4 flex items-center gap-3">
        {user?.user_metadata?.avatar_url && (
          <img src={user.user_metadata.avatar_url} alt="Profile photo"
            className="w-10 h-10 rounded-full" width={40} height={40} />
        )}
        <div>
          <p className="font-sans font-semibold text-warm-primary text-sm">
            {user?.user_metadata?.full_name ?? user?.email ?? 'User'}
          </p>
          <p className="font-sans text-warm-secondary text-xs">Google account</p>
        </div>
      </div>

      <div>
        <h2 className="font-serif text-lg font-semibold text-warm-primary mb-3">AI Features</h2>
        <GeminiKeyForm />
      </div>

      <button
        onClick={() => supabase.auth.signOut()}
        className="border border-warm-border text-warm-primary font-sans font-medium text-sm px-4 py-3 rounded-xl min-h-[44px] bg-warm-card active:bg-warm-surface transition-colors duration-150 cursor-pointer touch-manipulation"
      >
        Sign out
      </button>
    </div>
  )
}
