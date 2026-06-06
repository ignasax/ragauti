import { useRef, useState } from 'react'
import { RotateCcw, Camera, Plus } from 'lucide-react'
import { useFridge } from '../contexts/FridgeContext'
import { useGeminiKey } from '../contexts/GeminiKeyContext'
import { useRecipes } from '../hooks/useRecipes'
import { filterByFridge } from '../utils/recipeFilter'
import { detectFridgeIngredients } from '../lib/gemini'
import { detectFridgeIngredientsWithGroq } from '../lib/groq'
import { GeminiKeyBanner } from '../components/auth/GeminiKeyBanner'
import { FridgeRecipeCard } from '../components/fridge/FridgeRecipeCard'
import { AISuggestionCard } from '../components/fridge/AISuggestionCard'
import { useToast } from '../contexts/ToastContext'
import { HOUSEHOLD_PANTRY } from '../constants/pantry'

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function FridgePage() {
  const { status, detected, startScan, setScanResult, setScanError, updateDetected, reset } =
    useFridge()
  const { geminiKey, groqKey, provider, isLoading: keyLoading } = useGeminiKey()
  const { data: recipes = [] } = useRecipes()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scanModeRef = useRef<'replace' | 'add'>('replace')
  const [isAddingPhoto, setIsAddingPhoto] = useState(false)

  const hasKey = provider === 'groq' ? !!groqKey : !!geminiKey

  const openCamera = () => {
    scanModeRef.current = 'replace'
    fileInputRef.current?.click()
  }

  const openCameraAdditive = () => {
    scanModeRef.current = 'add'
    fileInputRef.current?.click()
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const isAdditive = scanModeRef.current === 'add'

    if (!isAdditive) {
      startScan()
    } else {
      setIsAddingPhoto(true)
    }

    try {
      const base64 = await fileToBase64(file)
      const newIngredients =
        provider === 'groq' && groqKey
          ? await detectFridgeIngredientsWithGroq(base64, file.type, groqKey)
          : await detectFridgeIngredients(base64, file.type, geminiKey!)

      if (isAdditive) {
        const existingLower = new Set(detected.map(d => d.toLowerCase()))
        const toAdd = newIngredients.filter(i => !existingLower.has(i.toLowerCase()))
        updateDetected([...detected, ...toAdd])
        if (toAdd.length > 0) {
          showToast(`+${toAdd.length} ingredient${toAdd.length === 1 ? '' : 's'} found`)
        } else {
          showToast('No new ingredients found')
        }
      } else {
        setScanResult(newIngredients)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to scan fridge'
      setScanError(msg)
      showToast(msg, 'error')
    } finally {
      if (isAdditive) setIsAddingPhoto(false)
    }
  }

  const removeChip = (chip: string) => updateDetected(detected.filter(d => d !== chip))

  const fridgeRecipes = filterByFridge(recipes, detected)

  if (keyLoading) return <div className="min-h-screen bg-warm-base" />

  return (
    <div className="px-4 pt-4 flex flex-col gap-3 min-h-screen bg-warm-base">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-warm-primary">Fridge</h1>
        {status === 'results' && (
          <div className="flex items-center gap-3">
            <button
              onClick={openCameraAdditive}
              disabled={isAddingPhoto}
              aria-label="Add another photo"
              className="flex items-center gap-1.5 font-sans text-sm text-warm-accent cursor-pointer touch-manipulation disabled:opacity-50"
            >
              {isAddingPhoto
                ? <div className="w-4 h-4 border-2 border-warm-accent border-t-transparent rounded-full animate-spin" />
                : <Plus className="w-4 h-4" />
              }
              Add photo
            </button>
            <button
              onClick={() => { reset(); openCamera() }}
              aria-label="Rescan"
              className="flex items-center gap-1.5 font-sans text-sm text-warm-accent cursor-pointer touch-manipulation"
            >
              <RotateCcw className="w-4 h-4" />
              Rescan
            </button>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {!hasKey && <GeminiKeyBanner />}

      {hasKey && status === 'empty' && (
        <div className="flex flex-col items-center justify-center flex-1 py-20 gap-4">
          <button
            onClick={openCamera}
            className="flex flex-col items-center gap-3 cursor-pointer touch-manipulation active:opacity-70"
          >
            <div className="w-20 h-20 rounded-full bg-warm-accent/10 flex items-center justify-center">
              <Camera className="w-10 h-10 text-warm-accent" />
            </div>
            <p className="font-sans text-warm-secondary text-base">Tap to scan your fridge</p>
          </button>
        </div>
      )}

      {status === 'scanning' && (
        <div className="flex flex-col items-center justify-center flex-1 py-20 gap-3">
          <div className="w-8 h-8 border-2 border-warm-accent border-t-transparent rounded-full animate-spin" />
          <p className="font-sans text-warm-secondary text-sm">Scanning fridge…</p>
        </div>
      )}

      {status === 'results' && (
        <>
          {/* Detected ingredient chips */}
          {detected.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                {detected.map(chip => (
                  <button
                    key={chip}
                    onClick={() => removeChip(chip)}
                    className="flex items-center gap-1 bg-warm-accent/10 text-warm-accent border border-warm-accent/30 rounded-full px-3 py-1 font-sans text-sm cursor-pointer touch-manipulation active:opacity-70"
                  >
                    {chip}
                    <span className="text-warm-accent/60 text-xs leading-none">×</span>
                  </button>
                ))}
              </div>
              <div>
                <p className="font-sans text-[10px] uppercase tracking-wider text-warm-muted font-bold mb-1.5 px-1">📦 Pantry — always available</p>
                <div className="flex flex-wrap gap-1.5">
                  {HOUSEHOLD_PANTRY.map(item => (
                    <span key={item} className="bg-warm-surface border border-warm-border rounded-full px-2.5 py-1 font-sans text-xs text-warm-secondary">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recipe grid */}
          {fridgeRecipes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
              <p className="font-serif text-warm-secondary text-lg">No matches found</p>
              <p className="font-sans text-warm-muted text-sm">Try scanning another angle or rescan</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {fridgeRecipes.map(r => (
                <FridgeRecipeCard key={r.id} recipe={r} />
              ))}
            </div>
          )}

          {/* AI suggestions */}
          {detected.length > 0 && (
            <div className="flex flex-col gap-3 pb-8">
              <div className="font-sans font-bold text-[10px] uppercase tracking-wider text-warm-secondary px-1">
                AI Suggestions
              </div>
              {[0, 1].map(slotIndex => (
                <AISuggestionCard
                  key={slotIndex}
                  slotIndex={slotIndex}
                  detected={detected}
                  provider={provider}
                  geminiKey={geminiKey}
                  groqKey={groqKey}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
