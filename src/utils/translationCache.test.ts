import { describe, it, expect, beforeEach } from 'vitest'
import { getCachedTranslation, setCachedTranslation } from './translationCache'

const CACHE_KEY = 'ingredient_translation_cache'

beforeEach(() => localStorage.removeItem(CACHE_KEY))

describe('getCachedTranslation', () => {
  it('returns null when cache is empty', () => {
    expect(getCachedTranslation('vištiena')).toBeNull()
  })

  it('returns stored translation', () => {
    setCachedTranslation('vištiena', 'chicken')
    expect(getCachedTranslation('vištiena')).toBe('chicken')
  })

  it('normalizes key: lowercases and trims', () => {
    setCachedTranslation('  Vištiena  ', 'chicken')
    expect(getCachedTranslation('vištiena')).toBe('chicken')
    expect(getCachedTranslation('VIŠTIENA')).toBe('chicken')
  })

  it('returns null for unknown term', () => {
    setCachedTranslation('vištiena', 'chicken')
    expect(getCachedTranslation('citrina')).toBeNull()
  })
})

describe('setCachedTranslation', () => {
  it('persists multiple entries', () => {
    setCachedTranslation('vištiena', 'chicken')
    setCachedTranslation('citrina', 'lemon')
    expect(getCachedTranslation('vištiena')).toBe('chicken')
    expect(getCachedTranslation('citrina')).toBe('lemon')
  })

  it('normalizes value: lowercases and trims', () => {
    setCachedTranslation('vištiena', '  Chicken  ')
    expect(getCachedTranslation('vištiena')).toBe('chicken')
  })

  it('overwrites existing entry', () => {
    setCachedTranslation('vištiena', 'chicken')
    setCachedTranslation('vištiena', 'turkey')
    expect(getCachedTranslation('vištiena')).toBe('turkey')
  })
})
