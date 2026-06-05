import { useState } from 'react'
import { extractRecipe, type ExtractedRecipe } from '../lib/gemini'
import { extractRecipeWithGroq } from '../lib/groq'
import { useGeminiKey } from '../contexts/GeminiKeyContext'

interface ExtractionState {
  isExtracting: boolean
  extracted: ExtractedRecipe | null
  error: string | null
  missingFields: string[]
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
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error((body as { error?: string } | null)?.error ?? 'Could not fetch the URL')
      }
      const { html } = await res.json()
      const data = provider === 'groq'
        ? await extractRecipeWithGroq(html, activeKey)
        : await extractRecipe(html, activeKey)
      const required: (keyof ExtractedRecipe)[] = ['title', 'ingredients', 'instructions']
      const missingFields = required.filter(k => !data[k])
      setState({ isExtracting: false, extracted: data, error: null, missingFields })
    } catch (err) {
      setState({ isExtracting: false, extracted: null, error: (err as Error).message, missingFields: [] })
    }
  }

  return { ...state, extract, activeKey }
}
