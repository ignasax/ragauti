export type InputType = 'youtube' | 'url' | 'text' | 'empty'

export function detectInputType(text: string): InputType {
  const t = text.trim()
  if (!t) return 'empty'
  if (/^https?:\/\/(www\.)?(youtube\.com\/(watch|shorts)|youtu\.be\/)/.test(t)) return 'youtube'
  if (/^https?:\/\//.test(t)) return 'url'
  return 'text'
}

export function extractYoutubeVideoId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/)|youtu\.be\/)([^&\n?#]+)/)
  return m?.[1] ?? null
}
