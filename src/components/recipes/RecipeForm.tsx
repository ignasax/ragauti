import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, X, Camera, ImagePlus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { uploadRecipeImage } from '../../utils/uploadImage'
import type { Recipe } from '../../types/app'

type RecipeFormData = Omit<Recipe, 'id' | 'user_id' | 'created_at' | 'updated_at'>

interface RecipeFormProps {
  initialData?: Partial<RecipeFormData>
  onSubmit: (data: RecipeFormData) => Promise<void>
  isSubmitting: boolean
  submitLabel: string
  topSlot?: React.ReactNode
}

const empty: RecipeFormData = {
  title: '', ingredients: '', instructions: '', image_url: null, image_urls: [],
  cook_time_mins: null, prep_time_mins: null, servings: 1,
  rating: null, categories: [], comments: null, is_favourite: false, source_url: null,
}

export function RecipeForm({ initialData, onSubmit, isSubmitting, submitLabel, topSlot }: RecipeFormProps) {
  const navigate = useNavigate()
  const [data, setData] = useState<RecipeFormData>({ ...empty, ...initialData, servings: initialData?.servings ?? 1 })
  const [categoryInput, setCategoryInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Existing images (already uploaded URLs)
  const [existingUrls, setExistingUrls] = useState<string[]>(() => {
    if (initialData?.image_urls?.length) return initialData.image_urls
    if (initialData?.image_url) return [initialData.image_url]
    return []
  })
  // New files to upload
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])

  const allPreviews = [...existingUrls, ...newPreviews]

  const set = <K extends keyof RecipeFormData>(key: K, value: RecipeFormData[K]) =>
    setData(d => ({ ...d, [key]: value }))

  const handleImageFile = (file: File) => {
    setNewFiles(f => [...f, file])
    setNewPreviews(p => [...p, URL.createObjectURL(file)])
  }

  const removeImage = (index: number) => {
    if (index < existingUrls.length) {
      setExistingUrls(u => u.filter((_, i) => i !== index))
    } else {
      const ni = index - existingUrls.length
      setNewFiles(f => f.filter((_, i) => i !== ni))
      setNewPreviews(p => p.filter((_, i) => i !== ni))
    }
  }

  const addCategory = () => {
    const t = categoryInput.trim()
    if (t && !data.categories.includes(t)) set('categories', [...data.categories, t])
    setCategoryInput('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data.title.trim()) { setError('Title is required'); return }
    setError(null)

    let finalData = { ...data }

    if (newFiles.length > 0) {
      setIsUploading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const uploadedUrls = await Promise.all(newFiles.map(f => uploadRecipeImage(f, user.id)))
          const allUrls = [...existingUrls, ...uploadedUrls]
          finalData.image_urls = allUrls
          finalData.image_url = allUrls[0] ?? null
        }
      } catch {
        setError('Image upload failed — please try again or skip the image.')
        setIsUploading(false)
        return
      }
      setIsUploading(false)
    } else {
      finalData.image_urls = existingUrls
      finalData.image_url = existingUrls[0] ?? null
    }

    await onSubmit(finalData)
  }

  const inputCls = "w-full bg-warm-surface border border-warm-border rounded-lg px-3 py-3 text-warm-primary font-sans text-base placeholder:text-warm-muted focus:outline-none focus:border-warm-accent transition-colors min-h-[44px]"

  return (
    <form onSubmit={handleSubmit} className="px-4 pt-4 pb-8 flex flex-col gap-5">
      {topSlot}
      <div>
        <label htmlFor="title" className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider block mb-1">Title *</label>
        <input id="title" value={data.title} onChange={e => set('title', e.target.value)} placeholder="Recipe name" className={inputCls} />
      </div>

      <div>
        <span className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider block mb-2">Images</span>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <label htmlFor="image-camera"
            className="flex-shrink-0 flex items-center gap-1.5 bg-warm-surface border border-warm-border text-warm-secondary font-sans text-sm px-3 py-2 rounded-lg min-h-[44px] cursor-pointer touch-manipulation active:opacity-70 transition-opacity">
            <Camera className="w-4 h-4" aria-hidden="true" />
            Take Photo
          </label>
          <input id="image-camera" type="file" accept="image/*" capture="environment" className="sr-only"
            onChange={e => { const f = e.target.files?.[0]; if (f) { handleImageFile(f); e.target.value = '' } }} />
          <label htmlFor="image-gallery"
            className="flex-shrink-0 flex items-center gap-1.5 bg-warm-surface border border-warm-border text-warm-secondary font-sans text-sm px-3 py-2 rounded-lg min-h-[44px] cursor-pointer touch-manipulation active:opacity-70 transition-opacity">
            <ImagePlus className="w-4 h-4" aria-hidden="true" />
            Choose File
          </label>
          <input id="image-gallery" type="file" accept="image/*" multiple className="sr-only"
            onChange={e => {
              const files = Array.from(e.target.files ?? [])
              files.forEach(f => handleImageFile(f))
              e.target.value = ''
            }} />
          {allPreviews.map((src, i) => (
            <div key={i} className="relative flex-shrink-0 w-11 h-11 rounded-lg overflow-hidden self-center">
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => removeImage(i)} aria-label="Remove image"
                className="absolute inset-0 flex items-center justify-center bg-warm-base/60 opacity-0 hover:opacity-100 active:opacity-100 cursor-pointer touch-manipulation">
                <X className="w-3 h-3 text-warm-primary" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="prep" className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider block mb-1">Prep (min)</label>
          <input id="prep" type="number" min={0} value={data.prep_time_mins ?? ''} onChange={e => set('prep_time_mins', e.target.value ? parseInt(e.target.value) : null)} className={inputCls} />
        </div>
        <div className="flex-1">
          <label htmlFor="cook" className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider block mb-1">Cook (min)</label>
          <input id="cook" type="number" min={0} value={data.cook_time_mins ?? ''} onChange={e => set('cook_time_mins', e.target.value ? parseInt(e.target.value) : null)} className={inputCls} />
        </div>
        <div className="flex-1">
          <label htmlFor="servings" className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider block mb-1">Servings</label>
          <select id="servings" value={data.servings ?? 1} onChange={e => set('servings', parseInt(e.target.value))} className={inputCls}>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </div>
      </div>

      <div>
        <span className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider block mb-2">Rating</span>
        <div className="flex gap-2">
          {[1,2,3].map(n => (
            <button key={n} type="button" onClick={() => set('rating', data.rating === n ? null : n)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer touch-manipulation" aria-label={`${n} star`}>
              <Star className={`w-6 h-6 ${(data.rating ?? 0) >= n ? 'text-warm-accent fill-warm-accent' : 'text-warm-muted'}`} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider block mb-2">Categories</span>
        <div className="flex flex-wrap gap-2 mb-2">
          {data.categories.map(c => (
            <span key={c} className="bg-warm-surface text-warm-secondary font-sans text-xs px-2 py-1 rounded-full flex items-center gap-1">
              {c}
              <button type="button" onClick={() => set('categories', data.categories.filter(x => x !== c))}
                aria-label={`Remove ${c}`} className="min-w-[20px] min-h-[20px] flex items-center justify-center touch-manipulation">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input id="category-input" aria-label="New category" value={categoryInput} onChange={e => setCategoryInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategory() } }}
            placeholder="Add category" className={`${inputCls} flex-1`} />
          <button type="button" onClick={addCategory}
            className="bg-warm-surface border border-warm-border text-warm-primary font-sans text-sm px-3 py-2 rounded-lg min-h-[44px] cursor-pointer touch-manipulation">Add</button>
        </div>
      </div>

      <div>
        <label htmlFor="ingredients" className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider block mb-1">Ingredients</label>
        <textarea id="ingredients" rows={6} value={data.ingredients} onChange={e => set('ingredients', e.target.value)}
          placeholder={"One ingredient per line\ne.g. 2 cloves garlic"} className={`${inputCls} resize-none`} />
      </div>
      <div>
        <label htmlFor="instructions" className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider block mb-1">Instructions</label>
        <textarea id="instructions" rows={8} value={data.instructions} onChange={e => set('instructions', e.target.value)}
          placeholder="Step by step instructions..." className={`${inputCls} resize-none`} />
      </div>
      <div>
        <label htmlFor="comments" className="font-sans font-bold text-warm-secondary text-[10px] uppercase tracking-wider block mb-1">Notes</label>
        <textarea id="comments" rows={3} value={data.comments ?? ''} onChange={e => set('comments', e.target.value || null)}
          placeholder="Personal notes, tips..." className={`${inputCls} resize-none`} />
      </div>

      {error && <p className="font-sans text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={() => navigate(-1)}
          className="flex-1 border border-warm-border text-warm-primary font-sans font-medium text-sm px-4 py-3 rounded-lg min-h-[44px] bg-warm-card active:bg-warm-surface transition-colors duration-150 cursor-pointer touch-manipulation">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting || isUploading}
          className="flex-1 bg-warm-accent text-white font-sans font-semibold text-sm px-4 py-3 rounded-xl min-h-[44px] active:opacity-80 disabled:opacity-50 transition-opacity duration-150 cursor-pointer touch-manipulation">
          {isUploading ? 'Uploading…' : isSubmitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
