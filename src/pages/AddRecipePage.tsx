import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Camera, ChevronLeft, Sparkles } from 'lucide-react'
import { RecipeForm } from '../components/recipes/RecipeForm'
import { GeminiKeyBanner } from '../components/auth/GeminiKeyBanner'
import { useAddRecipe } from '../hooks/useRecipes'
import { useGeminiExtract } from '../hooks/useGeminiExtract'
import { useGeminiKey } from '../contexts/GeminiKeyContext'

export function AddRecipePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { mutateAsync, isPending } = useAddRecipe()
  const { geminiKey, groqKey, provider } = useGeminiKey()
  const { extract, extractFromImage, isExtracting, extracted, error, missingFields } = useGeminiExtract()
  const hasActiveKey = provider === 'groq' ? !!groqKey : !!geminiKey
  const [urlInput, setUrlInput] = useState('')
  const [formKey, setFormKey] = useState(0)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Read shared URL from ShareTargetPage redirect
  const sharedUrl = (location.state as { sharedUrl?: string } | null)?.sharedUrl

  // Auto-extract when arriving via share target
  useEffect(() => {
    if (sharedUrl && hasActiveKey) {
      setUrlInput(sharedUrl)
      handleExtract(sharedUrl)
    }
  }, [sharedUrl, hasActiveKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Remount RecipeForm with new initialData when extraction completes
  useEffect(() => {
    if (extracted) setFormKey(k => k + 1)
  }, [extracted])

  const handleExtract = async (url: string) => {
    await extract(url)
  }

  const topSlot = (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="Paste recipe URL…"
          aria-label="Recipe URL"
          className="flex-1 bg-warm-surface border border-warm-border rounded-lg px-3 py-3 text-warm-primary font-sans text-base placeholder:text-warm-muted focus:outline-none focus:border-warm-accent transition-colors min-h-[44px]" />
        {hasActiveKey ? (
          <>
            <button type="button" onClick={() => handleExtract(urlInput)} disabled={!urlInput || isExtracting}
              className="bg-warm-accent text-white font-sans font-semibold text-sm px-3 py-2 rounded-lg min-h-[44px] flex items-center gap-1.5 active:opacity-80 disabled:opacity-50 cursor-pointer touch-manipulation">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              {isExtracting ? 'Extracting…' : 'Extract'}
            </button>
            <button type="button" onClick={() => cameraInputRef.current?.click()} disabled={isExtracting}
              aria-label="Scan recipe from photo"
              className="bg-warm-surface border border-warm-border text-warm-secondary px-3 py-2 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center active:opacity-70 disabled:opacity-50 cursor-pointer touch-manipulation">
              <Camera className="w-5 h-5" aria-hidden="true" />
            </button>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="sr-only"
              onChange={e => { const f = e.target.files?.[0]; if (f) { extractFromImage(f); e.target.value = '' } }} />
          </>
        ) : (
          <div className="flex-1"><GeminiKeyBanner /></div>
        )}
      </div>
      {error && <p className="font-sans text-sm text-red-600">{error}. Fill in the form manually.</p>}
      {missingFields.length > 0 && (
        <p className="font-sans text-sm text-warm-secondary bg-warm-surface border border-warm-border rounded-lg px-3 py-2">
          Couldn't extract: <span className="font-semibold">{missingFields.join(', ')}</span> — please fill these in before saving.
        </p>
      )}
    </div>
  )

  return (
    <div className="bg-warm-base min-h-screen">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <button onClick={() => navigate(-1)} aria-label="Go back"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 cursor-pointer touch-manipulation">
          <ChevronLeft className="w-5 h-5 text-warm-primary" />
        </button>
        <h1 className="font-serif text-xl font-bold text-warm-primary">Add Recipe</h1>
      </div>
      <RecipeForm
        key={formKey}
        initialData={extracted ? { ...extracted, source_url: urlInput } : undefined}
        topSlot={topSlot}
        submitLabel="Save Recipe"
        isSubmitting={isPending}
        onSubmit={async (data) => { await mutateAsync(data); navigate('/recipes', { replace: true }) }}
      />
    </div>
  )
}
