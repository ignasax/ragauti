import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Camera, ChevronLeft, ImageIcon, Sparkles, X } from 'lucide-react'
import { RecipeForm } from '../components/recipes/RecipeForm'
import { GeminiKeyBanner } from '../components/auth/GeminiKeyBanner'
import { useAddRecipe } from '../hooks/useRecipes'
import { useGeminiExtract } from '../hooks/useGeminiExtract'
import { useGeminiKey } from '../contexts/GeminiKeyContext'

const MAX_FILES = 5

export function AddRecipePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { mutateAsync, isPending } = useAddRecipe()
  const { geminiKey, groqKey, provider } = useGeminiKey()
  const { extractAuto, isExtracting, extracted, error, missingFields } = useGeminiExtract()
  const hasActiveKey = provider === 'groq' ? !!groqKey : !!geminiKey

  const [textInput, setTextInput] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [thumbnailUrls, setThumbnailUrls] = useState<string[]>([])
  const [formKey, setFormKey] = useState(0)

  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const sharedUrl = (location.state as { sharedUrl?: string } | null)?.sharedUrl

  useEffect(() => {
    if (sharedUrl && hasActiveKey) {
      setTextInput(sharedUrl)
      extractAuto(sharedUrl, [])
    }
  }, [sharedUrl, hasActiveKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (extracted) setFormKey(k => k + 1)
  }, [extracted])

  // Revoke object URLs when files change to avoid memory leaks
  useEffect(() => {
    return () => { thumbnailUrls.forEach(URL.revokeObjectURL) }
  }, [thumbnailUrls])

  function addFile(file: File) {
    if (attachedFiles.length >= MAX_FILES) return
    const url = URL.createObjectURL(file)
    setAttachedFiles(prev => [...prev, file])
    setThumbnailUrls(prev => [...prev, url])
  }

  function removeFile(index: number) {
    URL.revokeObjectURL(thumbnailUrls[index])
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
    setThumbnailUrls(prev => prev.filter((_, i) => i !== index))
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    files.forEach(addFile)
    e.target.value = ''
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setTextInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  const canExtract = (textInput.trim().length > 0 || attachedFiles.length > 0) && !isExtracting
  const sourceUrl = /^https?:\/\//.test(textInput.trim()) ? textInput.trim() : ''

  const topSlot = (
    <div className="flex flex-col gap-3">
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={textInput}
        onChange={handleTextChange}
        placeholder="Paste a URL, YouTube link, or the full recipe text…"
        rows={2}
        className="w-full bg-warm-surface border border-warm-border rounded-lg px-3 py-3 text-warm-primary font-sans text-base placeholder:text-warm-muted focus:outline-none focus:border-warm-accent transition-colors resize-none overflow-hidden"
        style={{ minHeight: '44px' }}
      />

      {/* Controls row */}
      <div className="flex items-center gap-2">
        {hasActiveKey ? (
          <>
            {/* Camera — opens camera directly */}
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={isExtracting || attachedFiles.length >= MAX_FILES}
              aria-label="Take photo"
              className="flex-shrink-0 bg-warm-surface border border-warm-border text-warm-secondary rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center active:opacity-70 disabled:opacity-40 cursor-pointer touch-manipulation"
            >
              <Camera className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* Gallery — opens photo picker */}
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              disabled={isExtracting || attachedFiles.length >= MAX_FILES}
              aria-label="Choose from gallery"
              className="flex-shrink-0 bg-warm-surface border border-warm-border text-warm-secondary rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center active:opacity-70 disabled:opacity-40 cursor-pointer touch-manipulation"
            >
              <ImageIcon className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* Hidden file inputs */}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={handleFileInput} />
            <input ref={galleryRef} type="file" accept="image/*" multiple className="sr-only" onChange={handleFileInput} />

            {/* Thumbnails */}
            {thumbnailUrls.map((url, i) => (
              <div key={url} className="relative flex-shrink-0">
                <img
                  src={url}
                  alt={`Attachment ${i + 1}`}
                  className="w-11 h-11 rounded-lg object-cover border border-warm-border"
                />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Extract button — right */}
            <button
              type="button"
              onClick={() => extractAuto(textInput, attachedFiles)}
              disabled={!canExtract}
              className="flex-shrink-0 bg-warm-accent text-white font-sans font-semibold text-sm px-3 py-2 rounded-lg min-h-[44px] flex items-center gap-1.5 active:opacity-80 disabled:opacity-50 cursor-pointer touch-manipulation"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              {isExtracting ? 'Extracting…' : 'Extract'}
            </button>
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
        initialData={extracted ? { ...extracted, source_url: sourceUrl } : undefined}
        topSlot={topSlot}
        submitLabel="Save Recipe"
        isSubmitting={isPending}
        onSubmit={async (data) => { await mutateAsync(data); navigate('/recipes', { replace: true }) }}
      />
    </div>
  )
}
