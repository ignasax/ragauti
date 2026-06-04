import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.query.url as string
  if (!url || !/^https?:\/\//.test(url)) {
    return res.status(400).json({ error: 'Invalid URL' })
  }
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecipeScraper/1.0)' },
      signal: AbortSignal.timeout(10_000),
    })
    const html = await response.text()
    return res.status(200).json({ html: html.slice(0, 150_000) })
  } catch {
    return res.status(500).json({ error: 'Failed to fetch URL' })
  }
}
