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
  ingredient_tags?: string[]
}

export interface GeneratedRecipe {
  title: string
  prep_time_mins: number | null
  cook_time_mins: number | null
  servings: number
  ingredients: string   // one ingredient per line, e.g. "2 chicken breasts\n4 cloves garlic"
  instructions: string  // numbered steps joined with \n, e.g. "1. Season chicken.\n2. Heat pan."
}

export function parseGeneratedRecipe(content: string): GeneratedRecipe {
  let raw: string
  try {
    JSON.parse(content)
    raw = content
  } catch {
    const cleaned = content.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON in AI response')
    raw = match[0]
  }
  const obj = JSON.parse(raw) as Record<string, unknown>
  return {
    title:          typeof obj.title === 'string'          ? obj.title.slice(0, 100) : 'Untitled Recipe',
    prep_time_mins: typeof obj.prep_time_mins === 'number' ? obj.prep_time_mins       : null,
    cook_time_mins: typeof obj.cook_time_mins === 'number' ? obj.cook_time_mins       : null,
    servings:       typeof obj.servings === 'number' && obj.servings > 0 ? obj.servings : 2,
    ingredients:    typeof obj.ingredients === 'string'    ? obj.ingredients.trim()   : '',
    instructions:   Array.isArray(obj.instructions)
      ? (obj.instructions as string[]).map((s, i) => `${i + 1}. ${String(s)}`).join('\n')
      : typeof obj.instructions === 'string'
        ? obj.instructions.trim()
        : '',
  }
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

export interface ImageInput {
  base64: string
  mimeType: string
}

export async function extractRecipeFromImage(
  images: ImageInput[],
  key: string,
  context?: string,
): Promise<ExtractedRecipe> {
  const genAI = new GoogleGenerativeAI(key)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })
  const contextLine = context ? `\n\nAdditional context from user: ${context}` : ''
  const prompt = `Look at ${images.length > 1 ? 'these recipe images' : 'this recipe image'} and extract the recipe information.${contextLine}

Return ONLY a valid JSON object with these fields (omit fields you cannot find):
{
  "title": "Recipe name",
  "ingredients": "2 cups flour\\n1 tsp salt\\n...",
  "instructions": "1. Preheat oven to 350F\\n2. Mix ingredients\\n...",
  "cook_time_mins": 45,
  "prep_time_mins": 20,
  "servings": 8,
  "ingredient_tags": ["flour", "salt"]
}

Rules:
- title: maximum 50 characters — write a concise, natural name; do not truncate mid-word
- ingredients: one ingredient with quantity per line, joined with \\n
- instructions: numbered steps, one per line, joined with \\n
- times and servings must be plain numbers
- ingredient_tags: array of lowercase English ingredient base names only — no quantities, no units, no preparation notes
- Return ONLY the JSON object, no explanation`

  const parts = [
    ...images.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } })),
    { text: prompt },
  ]
  const result = await model.generateContent(parts)
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
  "servings": 8,
  "ingredient_tags": ["flour", "salt"]
}

Rules:
- title: maximum 50 characters — write a concise, natural name; do not truncate mid-word
- ingredients: one ingredient with quantity per line, joined with \\n
- instructions: numbered steps, one per line, joined with \\n
- times and servings must be plain numbers
- ingredient_tags: array of lowercase English ingredient base names only — no quantities, no units, no preparation notes
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
  if (Array.isArray(obj.ingredient_tags)) {
    result.ingredient_tags = obj.ingredient_tags
      .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      .map(t => t.toLowerCase().trim())
      .slice(0, 100)
  }
  return result
}

export async function detectFridgeIngredients(
  base64: string,
  mimeType: string,
  key: string
): Promise<string[]> {
  const genAI = new GoogleGenerativeAI(key)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })
  const prompt = `Look at this photo and identify the food ingredients you can see.

Return ONLY a valid JSON array of ingredient name strings. Rules:
- Include only meaningful food ingredients (vegetables, meat, dairy, fruit, condiments, etc.)
- Do NOT include: salt, pepper, oil, sugar, flour, water, spices, or pantry staples
- Do NOT include quantities, amounts, fat percentages, or units — just the name
- Use simple names: "chicken" not "chicken breast fillet", "cream" not "35% cream"
- Return ONLY the JSON array, no explanation, no markdown

Example: ["chicken", "garlic", "lemon", "cream", "eggs"]`

  const result = await model.generateContent([
    { inlineData: { mimeType, data: base64 } },
    { text: prompt },
  ])
  const response = result.response.text()
  const match = response.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('No ingredient list in Gemini response')
  let parsed: unknown
  try {
    parsed = JSON.parse(match[0])
  } catch {
    throw new Error('Malformed JSON in Gemini response')
  }
  if (!Array.isArray(parsed)) throw new Error('Expected array from Gemini')
  return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

const FRIDGE_VARIATIONS = [
  'Mediterranean-style', 'Asian-inspired', 'quick weeknight',
  'hearty comfort food', 'Italian-inspired', 'Middle Eastern',
  'light and fresh', 'rustic one-pot', 'oven-baked', 'stir-fry',
]

export async function generateFridgeRecipe(
  detected: string[],
  _slotIndex: number,
  apiKey: string
): Promise<GeneratedRecipe> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })
  const style = FRIDGE_VARIATIONS[Math.floor(Math.random() * FRIDGE_VARIATIONS.length)]

  const prompt = `You are a helpful cooking assistant for a European household. The user has these FRIDGE ingredients:
${detected.join(', ')}

The following pantry staples are ALWAYS available and do not need to be bought: rice, pasta, spaghetti, potatoes, carrots, onions, garlic, bread, flour, butter, olive oil, eggs, oats, lentils, canned tomatoes, salt, pepper, sugar, and common spices.

Suggest a ${style} recipe using the fridge ingredients as the focus, supplemented by pantry staples. Respond ONLY with valid JSON matching this exact schema:
{
  "title": "Recipe name",
  "prep_time_mins": 10,
  "cook_time_mins": 25,
  "servings": 2,
  "ingredients": "2 chicken breasts\\n200g pasta\\n4 cloves garlic, minced",
  "instructions": ["Season chicken with salt and pepper.", "Boil pasta in salted water for 10 minutes.", "Cook chicken 6 min per side."]
}

Rules:
- Use metric units only: grams (g), kilograms (kg), millilitres (ml), litres (l), Celsius (°C) — no cups, oz, lbs, or °F
- ingredients: one ingredient with quantity per line, joined with \\n
- instructions: array of plain step strings, no numbering
- Return ONLY the JSON object, no explanation, no markdown`

  const result = await model.generateContent(prompt)
  return parseGeneratedRecipe(result.response.text())
}

export async function generateIngredientTags(
  ingredients: string,
  key: string,
): Promise<string[]> {
  const prompt = `Extract a list of English ingredient names from this ingredient list.
Return ONLY a valid JSON array of lowercase strings — no quantities, no units, no preparation notes, just the base name.
Example: ["chicken", "garlic", "cream", "lemon"]

Ingredients:
${ingredients}`

  const response = await callGemini(prompt, key)
  const match = response.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('No ingredient array in Gemini response')
  const parsed: unknown = JSON.parse(match[0])
  if (!Array.isArray(parsed)) throw new Error('Expected array from Gemini')
  return parsed.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    .map(t => t.toLowerCase().trim())
}

export async function translateIngredientTerm(
  term: string,
  key: string,
): Promise<string> {
  const prompt = `Translate this food ingredient term to English. Return ONLY the English word, lowercase, nothing else.
If it is already English, return it unchanged.

Term: ${term}`

  try {
    const response = await callGemini(prompt, key)
    const translated = response.trim().toLowerCase().replace(/[^a-z\s]/g, '').trim()
    return translated || term
  } catch {
    return term
  }
}
