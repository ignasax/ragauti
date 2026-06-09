const CACHE_KEY = 'ingredient_translation_cache'

function load(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function save(cache: Record<string, string>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch { /* localStorage quota exceeded — ignore */ }
}

export function getCachedTranslation(term: string): string | null {
  return load()[term.toLowerCase().trim()] ?? null
}

export function setCachedTranslation(term: string, english: string): void {
  const cache = load()
  cache[term.toLowerCase().trim()] = english.toLowerCase().trim()
  save(cache)
}
