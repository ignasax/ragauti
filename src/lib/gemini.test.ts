import { describe, it, expect } from 'vitest'
import { sanitizeExtracted } from './gemini'

describe('sanitizeExtracted – ingredient_tags', () => {
  it('parses a valid string array', () => {
    const result = sanitizeExtracted({ ingredient_tags: ['Chicken', ' Garlic ', 'LEMON'] })
    expect(result.ingredient_tags).toEqual(['chicken', 'garlic', 'lemon'])
  })

  it('filters out non-string entries', () => {
    const result = sanitizeExtracted({ ingredient_tags: ['chicken', 42, null, 'garlic'] })
    expect(result.ingredient_tags).toEqual(['chicken', 'garlic'])
  })

  it('filters out empty/whitespace strings', () => {
    const result = sanitizeExtracted({ ingredient_tags: ['chicken', '', '  '] })
    expect(result.ingredient_tags).toEqual(['chicken'])
  })

  it('omits field when not an array', () => {
    const result = sanitizeExtracted({ ingredient_tags: 'chicken, garlic' })
    expect(result.ingredient_tags).toBeUndefined()
  })

  it('omits field when absent', () => {
    const result = sanitizeExtracted({ title: 'Pasta' })
    expect(result.ingredient_tags).toBeUndefined()
  })

  it('caps at 100 entries', () => {
    const tags = Array.from({ length: 120 }, (_, i) => `ingredient${i}`)
    const result = sanitizeExtracted({ ingredient_tags: tags })
    expect(result.ingredient_tags).toHaveLength(100)
  })
})
