import { GoogleGenerativeAI } from '@google/generative-ai'

export async function callGemini(prompt: string, key: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(key)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })
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


function parseDuration(d: unknown): number | undefined {
  if (typeof d !== 'string') return undefined
  const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!m) return undefined
  return (parseInt(m[1] ?? '0') * 60) + parseInt(m[2] ?? '0')
}

function schemaToRecipe(r: Record<string, unknown>): ExtractedRecipe {
  const result: ExtractedRecipe = {}

  if (typeof r.name === 'string') result.title = r.name

  if (Array.isArray(r.recipeIngredient))
    result.ingredients = r.recipeIngredient.filter(Boolean).join('\n')

  if (Array.isArray(r.recipeInstructions)) {
    const steps = (r.recipeInstructions as unknown[]).flatMap((step, i) => {
      if (typeof step === 'string') return [`${i + 1}. ${step}`]
      const s = step as Record<string, unknown>
      if (s['@type'] === 'HowToSection' && Array.isArray(s.itemListElement))
        return (s.itemListElement as Record<string, unknown>[]).map((sub, j) => `${i + 1}.${j + 1}. ${sub.text ?? sub.name ?? ''}`)
      return [`${i + 1}. ${s.text ?? s.name ?? ''}`]
    }).filter(Boolean)
    result.instructions = steps.join('\n')
  } else if (typeof r.recipeInstructions === 'string') {
    result.instructions = r.recipeInstructions
  }

  const img = r.image
  if (typeof img === 'string') result.image_url = img
  else if (Array.isArray(img) && typeof img[0] === 'string') result.image_url = img[0]
  else if (img && typeof (img as Record<string, unknown>).url === 'string')
    result.image_url = (img as Record<string, unknown>).url as string

  const prep = parseDuration(r.prepTime)
  const cook = parseDuration(r.cookTime)
  if (prep !== undefined) result.prep_time_mins = prep
  if (cook !== undefined) result.cook_time_mins = cook

  const y = r.recipeYield
  const yNum = Array.isArray(y) ? parseInt(String(y[0])) : typeof y === 'string' ? parseInt(y) : typeof y === 'number' ? y : NaN
  if (!isNaN(yNum) && yNum > 0) result.servings = yNum

  return result
}

export function extractFromJsonLd(html: string): ExtractedRecipe | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1])
      const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed]
      for (const item of items) {
        const obj = item as Record<string, unknown>
        const candidates: Record<string, unknown>[] = Array.isArray(obj['@graph'])
          ? (obj['@graph'] as Record<string, unknown>[])
          : [obj]
        for (const c of candidates) {
          const type = c['@type']
          const isRecipe = type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))
          if (isRecipe) return schemaToRecipe(c)
        }
      }
    } catch { /* malformed JSON-LD — skip */ }
  }
  return null
}

export async function extractRecipeFromImage(base64: string, mimeType: string, key: string): Promise<ExtractedRecipe> {
  const genAI = new GoogleGenerativeAI(key)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })
  const prompt = `Look at this recipe image and extract the recipe information.

Return ONLY a valid JSON object with these fields (omit fields you cannot find):
{
  "title": "Recipe name",
  "ingredients": "2 cups flour\\n1 tsp salt\\n...",
  "instructions": "1. Preheat oven to 350F\\n2. Mix ingredients\\n...",
  "cook_time_mins": 45,
  "prep_time_mins": 20,
  "servings": 8
}

Rules:
- title: maximum 50 characters — write a concise, natural name; do not truncate mid-word
- ingredients: one ingredient with quantity per line, joined with \\n
- instructions: numbered steps, one per line, joined with \\n
- times and servings must be plain numbers
- Return ONLY the JSON object, no explanation`

  const result = await model.generateContent([
    { inlineData: { mimeType, data: base64 } },
    { text: prompt },
  ])
  const response = result.response.text()
  const match = response.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in Gemini response')
  return sanitizeExtracted(JSON.parse(match[0]))
}

export async function extractRecipe(html: string, key: string): Promise<ExtractedRecipe> {
  const required: (keyof ExtractedRecipe)[] = ['title', 'ingredients', 'instructions']
  const fromLd = extractFromJsonLd(html)
  if (fromLd && required.every(k => fromLd[k])) return fromLd

  const text = html.slice(0, 50_000)
  const prompt = `This is the text content of a recipe web page. Ignore any blog stories, comments, ads, or unrelated content. Find and extract ONLY the recipe information.

Return ONLY a valid JSON object with these fields (omit fields you cannot find):
{
  "title": "Recipe name",
  "ingredients": "2 cups flour\\n1 tsp salt\\n...",
  "instructions": "1. Preheat oven to 350F\\n2. Mix ingredients\\n...",
  "image_url": "https://...",
  "cook_time_mins": 45,
  "prep_time_mins": 20,
  "servings": 8
}

Rules:
- title: maximum 50 characters — write a concise, natural name; do not truncate mid-word
- ingredients: one ingredient with quantity per line, joined with \\n
- instructions: numbered steps, one per line, joined with \\n
- times and servings must be plain numbers
- Return ONLY the JSON object, no explanation

Page text:
${text}`

  const response = await callGemini(prompt, key)
  const match = response.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in Gemini response')
  const raw = JSON.parse(match[0])
  return sanitizeExtracted(raw)
}

export function sanitizeExtracted(raw: unknown): ExtractedRecipe {
  if (typeof raw !== 'object' || raw === null) return {}
  const obj = raw as Record<string, unknown>
  const result: ExtractedRecipe = {}
  if (typeof obj.title === 'string') result.title = obj.title.slice(0, 50).trimEnd()
  if (typeof obj.ingredients === 'string') result.ingredients = obj.ingredients
  if (typeof obj.instructions === 'string') result.instructions = obj.instructions
  if (typeof obj.cook_time_mins === 'number' && Number.isFinite(obj.cook_time_mins)) result.cook_time_mins = Math.max(0, Math.floor(obj.cook_time_mins))
  if (typeof obj.prep_time_mins === 'number' && Number.isFinite(obj.prep_time_mins)) result.prep_time_mins = Math.max(0, Math.floor(obj.prep_time_mins))
  if (typeof obj.servings === 'number' && Number.isFinite(obj.servings)) result.servings = Math.max(0, Math.floor(obj.servings))
  if (typeof obj.image_url === 'string') {
    try {
      const u = new URL(obj.image_url)
      if (u.protocol === 'https:' || u.protocol === 'http:') result.image_url = obj.image_url
    } catch { /* skip invalid image_url */ }
  }
  return result
}
