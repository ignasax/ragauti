import { useState } from 'react'
import {
  extractRecipe,
  extractRecipeFromImage,
  type ExtractedRecipe,
  type ImageInput,
} from '../lib/gemini'
import { extractRecipeWithGroq, extractRecipeFromImageWithGroq } from '../lib/groq'
import { useGeminiKey } from '../contexts/GeminiKeyContext'
import { supabase } from '../lib/supabase'
import { detectInputType } from '../utils/extractionInput'

interface ExtractionState {
  isExtracting: boolean
  extracted: ExtractedRecipe | null
  error: string | null
  missingFields: string[]
}

function computeMissingFields(data: ExtractedRecipe): string[] {
  const required: (keyof ExtractedRecipe)[] = ['title', 'ingredients', 'instructions']
  return [
    ...required.filter(k => !data[k]),
    ...(!data.servings || data.servings === 0 ? ['servings'] : []),
  ]
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

export function useGeminiExtract() {
  const { geminiKey, groqKey, provider } = useGeminiKey()
  const [state, setState] = useState<ExtractionState>({
    isExtracting: false, extracted: null, error: null, missingFields: [],
  })

  const activeKey = provider === 'groq' ? groqKey : geminiKey

  async function run(fn: () => Promise<ExtractedRecipe>) {
    setState({ isExtracting: true, extracted: null, error: null, missingFields: [] })
    try {
      const data = await fn()
      setState({ isExtracting: false, extracted: data, error: null, missingFields: computeMissingFields(data) })
    } catch (err) {
      setState({ isExtracting: false, extracted: null, error: (err as Error).message, missingFields: [] })
    }
  }

  const extractAuto = async (text: string, files: File[]) => {
    if (!activeKey) return
    const trimmed = text.trim()
    if (!trimmed && files.length === 0) return

    // Images always take precedence; plain text (not a URL) is passed as optional context
    if (files.length > 0) {
      await run(async () => {
        const images: ImageInput[] = await Promise.all(
          files.map(async f => ({ base64: await fileToBase64(f), mimeType: f.type }))
        )
        const context = trimmed && detectInputType(trimmed) === 'text' ? trimmed : undefined
        return provider === 'groq'
          ? extractRecipeFromImageWithGroq(images, activeKey, context)
          : extractRecipeFromImage(images, activeKey, context)
      })
      return
    }

    const inputType = detectInputType(trimmed)

    if (inputType === 'youtube' || inputType === 'url') {
      await run(async () => {
        const headers = await getAuthHeaders()
        const res = await fetch(`/api/scrape?url=${encodeURIComponent(trimmed)}`, { headers })
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error((body as { error?: string } | null)?.error ?? 'Could not fetch the URL')
        }
        const { html } = await res.json() as { html: string }
        return provider === 'groq'
          ? extractRecipeWithGroq(html, activeKey)
          : extractRecipe(html, activeKey)
      })
      return
    }

    // Plain text — send directly to AI
    await run(() =>
      provider === 'groq'
        ? extractRecipeWithGroq(trimmed, activeKey)
        : extractRecipe(trimmed, activeKey)
    )
  }

  return { ...state, extractAuto, activeKey }
}
