import { useState } from 'react'
import { extractRecipe, extractRecipeFromImage, type ExtractedRecipe } from '../lib/gemini'
import { extractRecipeWithGroq, extractRecipeFromImageWithGroq } from '../lib/groq'
import { useGeminiKey } from '../contexts/GeminiKeyContext'
import { supabase } from '../lib/supabase'

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
    ...((!data.servings || data.servings === 0) ? ['servings'] : []),
  ]
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function useGeminiExtract() {
  const { geminiKey, groqKey, provider } = useGeminiKey()
  const [state, setState] = useState<ExtractionState>({
    isExtracting: false, extracted: null, error: null, missingFields: [],
  })

  const activeKey = provider === 'groq' ? groqKey : geminiKey

  const extract = async (url: string) => {
    if (!activeKey) return
    setState({ isExtracting: true, extracted: null, error: null, missingFields: [] })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error((body as { error?: string } | null)?.error ?? 'Could not fetch the URL')
      }
      const { html } = await res.json()
      const data = provider === 'groq'
        ? await extractRecipeWithGroq(html, activeKey)
        : await extractRecipe(html, activeKey)
      setState({ isExtracting: false, extracted: data, error: null, missingFields: computeMissingFields(data) })
    } catch (err) {
      setState({ isExtracting: false, extracted: null, error: (err as Error).message, missingFields: [] })
    }
  }

  const extractFromImage = async (file: File) => {
    if (!activeKey) return
    setState({ isExtracting: true, extracted: null, error: null, missingFields: [] })
    try {
      const base64 = await fileToBase64(file)
      const data = provider === 'groq'
        ? await extractRecipeFromImageWithGroq(base64, file.type, activeKey)
        : await extractRecipeFromImage(base64, file.type, activeKey)
      setState({ isExtracting: false, extracted: data, error: null, missingFields: computeMissingFields(data) })
    } catch (err) {
      setState({ isExtracting: false, extracted: null, error: (err as Error).message, missingFields: [] })
    }
  }

  return { ...state, extract, extractFromImage, activeKey }
}
