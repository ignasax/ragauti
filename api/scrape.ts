import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const PRIVATE_HOSTNAME = /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.0\.0\.0|\[::1\])/i

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Require a valid Supabase session — prevents unauthenticated abuse
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

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return res.status(400).json({ error: 'Invalid URL' })
  }

  if (parsed.protocol !== 'https:') {
    return res.status(400).json({ error: 'Only https URLs are allowed' })
  }
  if (PRIVATE_HOSTNAME.test(parsed.hostname)) {
    return res.status(400).json({ error: 'Private addresses are not allowed' })
  }

  try {
    const response = await fetch(`https://r.jina.ai/${raw}`, {
      headers: {
        'Accept': 'text/plain',
        'X-Respond-With': 'markdown',
      },
      signal: AbortSignal.timeout(20_000),
    })
    if (!response.ok) {
      return res.status(502).json({ error: `Jina reader returned ${response.status}` })
    }
    const text = await response.text()
    return res.status(200).json({ html: text })
  } catch (err) {
    console.error('[scrape] fetch error:', err instanceof Error ? err.message : 'unknown error')
    return res.status(500).json({ error: 'Failed to fetch URL' })
  }
}
