import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export type AIProvider = 'gemini' | 'groq'

interface GeminiKeyContextValue {
  geminiKey: string | null
  groqKey: string | null
  provider: AIProvider
  setGeminiKey: (key: string | null) => Promise<void>
  setGroqKey: (key: string | null) => Promise<void>
  setProvider: (p: AIProvider) => Promise<void>
  isLoading: boolean
}

const GeminiKeyContext = createContext<GeminiKeyContextValue>({
  geminiKey: null,
  groqKey: null,
  provider: 'gemini',
  setGeminiKey: async () => {},
  setGroqKey: async () => {},
  setProvider: async () => {},
  isLoading: true,
})

export function GeminiKeyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [geminiKey, setGeminiKeyState] = useState<string | null>(null)
  const [groqKey, setGroqKeyState] = useState<string | null>(null)
  const [provider, setProviderState] = useState<AIProvider>('gemini')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) { setIsLoading(false); return }
    supabase
      .from('profiles')
      .select('gemini_api_key, groq_api_key, ai_provider')
      .eq('id', user.id)
      .single()
      .then(async ({ data, error }) => {
        if (!error) {
          const row = data as Record<string, unknown> | null
          setGeminiKeyState((row?.gemini_api_key as string | null) ?? null)
          setGroqKeyState((row?.groq_api_key as string | null) ?? null)
          setProviderState(((row?.ai_provider as AIProvider) ?? 'gemini'))
        } else if (error.code === 'PGRST116') {
          // no profile row yet
        } else {
          // migration may not have run — fall back to just gemini_api_key
          const { data: fallback } = await supabase
            .from('profiles')
            .select('gemini_api_key')
            .eq('id', user.id)
            .single()
          setGeminiKeyState((fallback as Record<string, unknown> | null)?.gemini_api_key as string | null ?? null)
        }
        setIsLoading(false)
      })
  }, [user])

  const setGeminiKey = async (key: string | null) => {
    if (!user) return
    setGeminiKeyState(key)
    await supabase.from('profiles').update({ gemini_api_key: key }).eq('id', user.id)
  }

  const setGroqKey = async (key: string | null) => {
    if (!user) return
    setGroqKeyState(key)
    await supabase.from('profiles').update({ groq_api_key: key }).eq('id', user.id)
  }

  const setProvider = async (p: AIProvider) => {
    if (!user) return
    setProviderState(p)
    await supabase.from('profiles').update({ ai_provider: p }).eq('id', user.id)
  }

  return (
    <GeminiKeyContext.Provider value={{ geminiKey, groqKey, provider, setGeminiKey, setGroqKey, setProvider, isLoading }}>
      {children}
    </GeminiKeyContext.Provider>
  )
}

export const useGeminiKey = () => useContext(GeminiKeyContext)
