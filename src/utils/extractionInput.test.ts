import { describe, it, expect } from 'vitest'
import { detectInputType, extractYoutubeVideoId } from './extractionInput'

describe('detectInputType', () => {
  it('returns empty for blank string', () => {
    expect(detectInputType('')).toBe('empty')
    expect(detectInputType('   ')).toBe('empty')
  })
  it('detects youtube.com/watch URLs', () => {
    expect(detectInputType('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube')
    expect(detectInputType('https://youtube.com/watch?v=abc')).toBe('youtube')
  })
  it('detects youtu.be short URLs', () => {
    expect(detectInputType('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube')
  })
  it('detects youtube.com/shorts URLs', () => {
    expect(detectInputType('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('youtube')
    expect(detectInputType('https://youtube.com/shorts/abc123')).toBe('youtube')
  })
  it('detects regular URLs', () => {
    expect(detectInputType('https://www.allrecipes.com/recipe/123')).toBe('url')
    expect(detectInputType('https://example.com')).toBe('url')
  })
  it('returns text for plain text', () => {
    expect(detectInputType('1 cup flour\n2 eggs\nMix together')).toBe('text')
    expect(detectInputType('Paste a recipe here')).toBe('text')
  })
})

describe('extractYoutubeVideoId', () => {
  it('extracts ID from watch URL', () => {
    expect(extractYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })
  it('extracts ID from watch URL with extra params', () => {
    expect(extractYoutubeVideoId('https://www.youtube.com/watch?v=abc123&t=30s')).toBe('abc123')
  })
  it('extracts ID from youtu.be URL', () => {
    expect(extractYoutubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })
  it('returns null for non-youtube URL', () => {
    expect(extractYoutubeVideoId('https://example.com')).toBeNull()
  })
})
