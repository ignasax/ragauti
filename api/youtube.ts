import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { YoutubeTranscript } from 'youtube-transcript'

function extractVideoId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/)|youtu\.be\/)([^&\n?#]+)/)
  return m?.[1] ?? null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const token = authHeader.slice(7)
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const raw = req.query.url as string
  if (!raw) return res.status(400).json({ error: 'Missing url parameter' })

  const videoId = extractVideoId(raw)
  if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL' })

  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId, {
      fetch: (url: string, init?: RequestInit) => fetch(url, { ...init, signal: AbortSignal.timeout(15_000) })
    })
    const transcript = segments.map(s => s.text).join(' ')
    return res.status(200).json({ transcript })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    console.error('[youtube] transcript error:', msg)
    return res.status(502).json({ error: 'Could not fetch transcript. The video may not have captions enabled.' })
  }
}
