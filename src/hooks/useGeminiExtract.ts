import { useState } from 'react'
import { extractRecipe, type ExtractedRecipe } from '../lib/gemini'

interface ExtractionState {
  isExtracting: boolean
  extracted: ExtractedRecipe | null
  error: string | null
  hasPartialData: boolean
}

export function useGeminiExtract(geminiKey: string | null) {
  const [state, setState] = useState<ExtractionState>({
    isExtracting: false, extracted: null, error: null, hasPartialData: false,
  })

  const extract = async (url: string) => {
    if (!geminiKey) return
    setState({ isExtracting: true, extracted: null, error: null, hasPartialData: false })
    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`)
      if (!res.ok) throw new Error('Could not fetch the URL')
      const { html } = await res.json()
      const data = await extractRecipe(html, geminiKey)
      const required: (keyof ExtractedRecipe)[] = ['title', 'ingredients', 'instructions']
      const hasPartialData = required.some(k => !data[k])
      setState({ isExtracting: false, extracted: data, error: null, hasPartialData })
    } catch (err) {
      setState({ isExtracting: false, extracted: null, error: (err as Error).message, hasPartialData: false })
    }
  }

  return { ...state, extract }
}
