import { useState } from 'react'
import { useGeminiKey } from '../../contexts/GeminiKeyContext'

export function GeminiKeyForm() {
  const { geminiKey, setGeminiKey } = useGeminiKey()
  const [input, setInput] = useState(geminiKey ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const handleSave = async () => {
    if (!input.trim()) return
    setStatus('saving')
    try {
      await setGeminiKey(input.trim())
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 3000)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label htmlFor="gemini-key" className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider block mb-1">
          Gemini API Key
        </label>
        <input
          id="gemini-key"
          type="password"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="AIza…"
          className="w-full bg-warm-surface border border-warm-border rounded-lg px-3 py-3 text-warm-primary font-sans text-base placeholder:text-warm-muted focus:outline-none focus:border-warm-accent transition-colors min-h-[44px]"
        />
        <p className="font-sans text-warm-muted text-xs mt-1">
          Used client-side only — never sent to our servers.
        </p>
      </div>
      <button
        onClick={handleSave}
        disabled={status === 'saving' || !input.trim()}
        className="bg-warm-accent text-white font-sans font-semibold text-sm px-4 py-3 rounded-xl min-h-[44px] active:opacity-80 disabled:opacity-50 transition-opacity duration-150 cursor-pointer touch-manipulation"
      >
        {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved ✓' : 'Save Key'}
      </button>
      {status === 'error' && <p className="font-sans text-sm text-red-600">Failed to save. Try again.</p>}
    </div>
  )
}
