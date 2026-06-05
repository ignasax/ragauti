import { useState, useEffect, useRef } from 'react'
import { useGeminiKey, type AIProvider } from '../../contexts/GeminiKeyContext'

const PROVIDER_LABEL: Record<AIProvider, string> = { gemini: 'Gemini', groq: 'Groq' }
const PROVIDER_HINT:  Record<AIProvider, string> = { gemini: 'AIza…', groq: 'gsk_…' }
const PROVIDER_DESC: Record<AIProvider, string> = {
  gemini: 'Google Gemini — requires billing in EU/EEA regions.',
  groq:   'Groq — free globally, no billing needed.',
}

const PROVIDER_KEY_URL: Record<AIProvider, string> = {
  gemini: 'https://aistudio.google.com/apikey',
  groq:   'https://console.groq.com/keys',
}

export function GeminiKeyForm() {
  const { geminiKey, groqKey, provider, setGeminiKey, setGroqKey, setProvider, isLoading } = useGeminiKey()

  const [editing, setEditing]               = useState(false)
  const [input, setInput]                   = useState('')
  const [ready, setReady]                   = useState(false)
  const [status, setStatus]                 = useState<'idle' | 'saving' | 'removing' | 'error'>('idle')

  const lastProvider = useRef(provider)
  const activeKey = provider === 'groq' ? groqKey : geminiKey

  // Initialise once context loads
  useEffect(() => {
    if (!isLoading && !ready) {
      setInput(activeKey ?? '')
      setEditing(!activeKey)
      setReady(true)
      lastProvider.current = provider
    }
  }, [isLoading, ready]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset field when provider actually changes
  useEffect(() => {
    if (!ready) return
    if (provider === lastProvider.current) return
    lastProvider.current = provider
    const newKey = provider === 'groq' ? groqKey : geminiKey
    setInput(newKey ?? '')
    setEditing(!newKey)
    setStatus('idle')
  }, [provider, ready, geminiKey, groqKey])

  const handleProviderClick = (p: AIProvider) => {
    if (p === provider) return
    setProvider(p)
  }

  const handleSave = async () => {
    if (!input.trim()) return
    setStatus('saving')
    try {
      if (provider === 'groq') await setGroqKey(input.trim())
      else await setGeminiKey(input.trim())
      setEditing(false)
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  const handleRemove = async () => {
    setStatus('removing')
    try {
      if (provider === 'groq') await setGroqKey(null)
      else await setGeminiKey(null)
      setInput('')
      setEditing(true)
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  const sharedCls = "w-full border border-warm-border rounded-lg px-3 py-3 min-h-[44px]"
  const masked = activeKey ? `${activeKey.slice(0, 8)} ··· ${activeKey.slice(-4)}` : ''

  return (
    <>
      <div className="flex flex-col gap-5">

        {/* Provider selector */}
        <div>
          <span className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider block mb-2">
            AI Provider
          </span>
          {isLoading ? (
            <div className="flex gap-2">
              <div className="flex-1 min-h-[44px] rounded-xl bg-warm-surface animate-pulse" />
              <div className="flex-1 min-h-[44px] rounded-xl bg-warm-surface animate-pulse" />
            </div>
          ) : (
            <div className="flex gap-2">
              {(['gemini', 'groq'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => handleProviderClick(p)}
                  className={`flex-1 font-sans font-semibold text-sm py-3 rounded-xl min-h-[44px] border transition-colors cursor-pointer touch-manipulation ${
                    provider === p
                      ? 'bg-warm-accent text-white border-warm-accent'
                      : 'bg-warm-card text-warm-primary border-warm-border active:bg-warm-surface'
                  }`}
                >
                  {PROVIDER_LABEL[p]}
                </button>
              ))}
            </div>
          )}
          <p className="font-sans text-warm-muted text-xs mt-1.5">
            {PROVIDER_DESC[provider]}{' '}
            <a href={PROVIDER_KEY_URL[provider]} target="_blank" rel="noopener noreferrer"
              className="text-warm-accent underline underline-offset-2">
              Get a free key →
            </a>
          </p>
        </div>

        {/* Key field */}
        <div className="flex flex-col gap-2">
          <label className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider block">
            {PROVIDER_LABEL[provider]} API Key
          </label>

          {!ready ? (
            <div className={`${sharedCls} bg-warm-surface animate-pulse`} />
          ) : editing ? (
            <input
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={PROVIDER_HINT[provider]}
              className={`${sharedCls} bg-warm-surface text-warm-primary font-sans text-base focus:outline-none focus:border-warm-accent transition-colors`}
            />
          ) : (
            <div className={`${sharedCls} bg-warm-surface/60 flex items-center`}>
              <span className="font-sans text-warm-muted text-sm font-mono">{masked}</span>
            </div>
          )}

          {ready && (editing ? (
            <div className="flex gap-2">
              {activeKey && (
                <button
                  onClick={() => { setInput(activeKey); setEditing(false); setStatus('idle') }}
                  className="flex-1 border border-warm-border text-warm-primary font-sans font-medium text-sm px-4 py-3 rounded-xl min-h-[44px] bg-warm-card active:bg-warm-surface transition-colors cursor-pointer touch-manipulation"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={status === 'saving' || !input.trim()}
                className="flex-1 bg-warm-accent text-white font-sans font-semibold text-sm px-4 py-3 rounded-xl min-h-[44px] active:opacity-80 disabled:opacity-50 transition-opacity cursor-pointer touch-manipulation"
              >
                {status === 'saving' ? 'Saving…' : 'Save Key'}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => { setInput(activeKey ?? ''); setEditing(true); setStatus('idle') }}
                className="flex-1 border border-warm-border text-warm-primary font-sans font-medium text-sm px-4 py-3 rounded-xl min-h-[44px] bg-warm-card active:bg-warm-surface transition-colors cursor-pointer touch-manipulation"
              >
                Edit Key
              </button>
              <button
                onClick={handleRemove}
                disabled={status === 'removing'}
                className="flex-1 border border-red-200 text-red-600 font-sans font-medium text-sm px-4 py-3 rounded-xl min-h-[44px] bg-warm-card active:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer touch-manipulation"
              >
                {status === 'removing' ? 'Removing…' : 'Remove Key'}
              </button>
            </div>
          ))}

          {status === 'error' && (
            <p className="font-sans text-sm text-red-600">Failed. Try again.</p>
          )}
        </div>

        <p className="font-sans text-warm-muted text-xs -mt-2">
          Keys are stored in your account and never sent to our servers.
        </p>
      </div>

    </>
  )
}
