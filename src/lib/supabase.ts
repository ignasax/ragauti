import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// iOS PWA and Safari browser have isolated localStorage for the same origin.
// Cookies ARE shared, so storing auth state in cookies lets the PKCE code
// verifier and session tokens survive the PWA → Safari → PWA round-trip.
const cookieStorage = {
  getItem: (key: string): string | null => {
    const match = document.cookie.match(
      new RegExp('(?:^|;\\s*)' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)')
    )
    return match ? decodeURIComponent(match[1]) : null
  },
  setItem: (key: string, value: string): void => {
    const maxAge = 60 * 60 * 24 * 365
    const secure = location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`
  },
  removeItem: (key: string): void => {
    document.cookie = `${key}=; path=/; max-age=0; SameSite=Lax`
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: cookieStorage,
    persistSession: true,
    detectSessionInUrl: true,
  },
})
