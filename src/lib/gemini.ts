import { GoogleGenerativeAI } from '@google/generative-ai'

export async function callGemini(prompt: string, key: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(key)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

export interface ExtractedRecipe {
  title?: string
  ingredients?: string
  instructions?: string
  image_url?: string
  cook_time_mins?: number
  prep_time_mins?: number
  servings?: number
}

export async function extractRecipe(html: string, key: string): Promise<ExtractedRecipe> {
  const prompt = `Extract the recipe from the following HTML and return ONLY valid JSON with these fields (omit any field you cannot find):
{
  "title": string,
  "ingredients": string (one ingredient per line with quantities),
  "instructions": string (numbered steps, one per line),
  "image_url": string (absolute URL to the main recipe image),
  "cook_time_mins": number,
  "prep_time_mins": number,
  "servings": number
}

HTML (truncated):
${html.slice(0, 80_000)}`

  const text = await callGemini(prompt, key)
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in Gemini response')
  const raw = JSON.parse(match[0])
  return sanitizeExtracted(raw)
}

function sanitizeExtracted(raw: unknown): ExtractedRecipe {
  if (typeof raw !== 'object' || raw === null) return {}
  const obj = raw as Record<string, unknown>
  const result: ExtractedRecipe = {}
  if (typeof obj.title === 'string') result.title = obj.title
  if (typeof obj.ingredients === 'string') result.ingredients = obj.ingredients
  if (typeof obj.instructions === 'string') result.instructions = obj.instructions
  if (typeof obj.cook_time_mins === 'number' && Number.isFinite(obj.cook_time_mins)) result.cook_time_mins = Math.max(0, Math.floor(obj.cook_time_mins))
  if (typeof obj.prep_time_mins === 'number' && Number.isFinite(obj.prep_time_mins)) result.prep_time_mins = Math.max(0, Math.floor(obj.prep_time_mins))
  if (typeof obj.servings === 'number' && Number.isFinite(obj.servings)) result.servings = Math.max(1, Math.floor(obj.servings))
  if (typeof obj.image_url === 'string') {
    try {
      const u = new URL(obj.image_url)
      if (u.protocol === 'https:' || u.protocol === 'http:') result.image_url = obj.image_url
    } catch { /* skip invalid image_url */ }
  }
  return result
}
