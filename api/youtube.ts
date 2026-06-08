import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

function extractVideoId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/)|youtu\.be\/)([^&\n?#]+)/)
  return m?.[1] ?? null
}

function parseVtt(vtt: string): string {
  return vtt
    .split('\n')
    .filter(line => {
      const t = line.trim()
      return t && !t.includes('-->') && !/^(WEBVTT|NOTE|STYLE|REGION|\d+)$/.test(t)
    })
    .map(line => line.replace(/<[^>]+>/g, '').trim())
    .filter(Boolean)
    .join(' ')
}

async function fetchViaTimedtext(videoId: string): Promise<string> {
  // YouTube's public timedtext endpoint — works without auth for most captioned videos
  const langs = ['en', 'en-US', 'en-GB', 'a.en']
  for (const lang of langs) {
    const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=vtt`
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(15_000),
    })
    if (res.ok) {
      const ct = res.headers.get('content-type') ?? ''
      if (ct.includes('text/vtt') || ct.includes('text/plain')) {
        const text = parseVtt(await res.text())
        if (text.length > 50) return text
      }
    }
  }
  throw new Error('timedtext_failed')
}

async function fetchViaVideoPage(videoId: string): Promise<string> {
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(20_000),
  })
  if (!pageRes.ok) throw new Error(`YouTube page returned ${pageRes.status}`)

  const html = await pageRes.text()

  // Extract captionTracks array from the embedded player response
  const captionMatch = html.match(/"captionTracks":(\[.*?\])(?=,)/)
  if (!captionMatch) throw new Error('No captions in player response')

  let tracks: Array<{ baseUrl: string; languageCode: string }> = []
  try {
    tracks = JSON.parse(captionMatch[1])
  } catch {
    throw new Error('Could not parse caption tracks')
  }

  if (!tracks.length) throw new Error('No caption tracks found')

  // Prefer English, then auto-generated English (a.en), then first available
  const track =
    tracks.find(t => t.languageCode === 'en') ??
    tracks.find(t => t.languageCode?.startsWith('en')) ??
    tracks[0]

  if (!track?.baseUrl) throw new Error('No caption URL found')

  const xmlRes = await fetch(`${track.baseUrl}&fmt=vtt`, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(15_000),
  })
  if (!xmlRes.ok) throw new Error(`Caption fetch returned ${xmlRes.status}`)

  const text = parseVtt(await xmlRes.text())
  if (!text) throw new Error('Empty transcript')
  return text
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
    // Try timedtext endpoint first (fastest, no page parse needed)
    let transcript: string
    try {
      transcript = await fetchViaTimedtext(videoId)
    } catch {
      // Fall back to parsing the video page
      transcript = await fetchViaVideoPage(videoId)
    }
    return res.status(200).json({ transcript })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    console.error('[youtube] transcript error:', msg)
    return res.status(502).json({ error: 'Could not fetch transcript. The video may not have captions, or YouTube is blocking server access.' })
  }
}
