import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

interface GeminiKeyContextValue {
  geminiKey: string | null
  setGeminiKey: (key: string) => Promise<void>
  isLoading: boolean
}

const GeminiKeyContext = createContext<GeminiKeyContextValue>({
  geminiKey: null,
  setGeminiKey: async () => {},
  isLoading: true,
})

export function GeminiKeyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [geminiKey, setGeminiKeyState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) { setIsLoading(false); return }
    supabase
      .from('profiles')
      .select('gemini_api_key')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error && error.code !== 'PGRST116') console.error('profiles fetch:', error)
        setGeminiKeyState(data?.gemini_api_key ?? null)
        setIsLoading(false)
      })
  }, [user])

  const setGeminiKey = async (key: string) => {
    if (!user) return
    await supabase.from('profiles').update({ gemini_api_key: key }).eq('id', user.id)
    setGeminiKeyState(key)
  }

  return (
    <GeminiKeyContext.Provider value={{ geminiKey, setGeminiKey, isLoading }}>
      {children}
    </GeminiKeyContext.Provider>
  )
}

export const useGeminiKey = () => useContext(GeminiKeyContext)
