import type { VercelRequest, VercelResponse } from '@vercel/node'

const PRIVATE_HOSTNAME = /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.0\.0\.0|\[::1\])/i

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    const response = await fetch(raw, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecipeScraper/1.0)' },
      signal: AbortSignal.timeout(10_000),
      redirect: 'follow',
    })
    const html = await response.text()
    return res.status(200).json({ html: html.slice(0, 150_000) })
  } catch (err) {
    console.error('[scrape] fetch error:', err)
    return res.status(500).json({ error: 'Failed to fetch URL' })
  }
}
