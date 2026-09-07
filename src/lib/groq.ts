import { extractFromJsonLd, sanitizeExtracted, parseGeneratedRecipe, type ExtractedRecipe, type GeneratedRecipe, type ImageInput } from './gemini'

const GROQ_MODEL = 'qwen/qwen3.6-27b'

function parseGroqJson(content: string): ExtractedRecipe {
  try {
    return sanitizeExtracted(JSON.parse(content))
  } catch {
    const cleaned = content.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON in Groq response')
    return sanitizeExtracted(JSON.parse(match[0]))
  }
}

type GroqErrorBody = { error?: { message?: string } }
type GroqResponse = { choices?: { message?: { content?: string } }[] }

// Groq's free tier has a very small per-minute token budget. On a 429, Groq's own
// error message tells us exactly how long to wait ("Please try again in 9.96s") —
// so wait that long and retry once before surfacing the error to the user.
async function groqFetch(body: Record<string, unknown>, key: string): Promise<GroqResponse> {
  const doFetch = () => fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify(body),
  })

  let res = await doFetch()

  if (res.status === 429) {
    const errBody = await res.json().catch(() => null) as GroqErrorBody | null
    const match = errBody?.error?.message?.match(/try again in ([\d.]+)s/i)
    const waitMs = match ? Math.min(Number(match[1]) * 1000 + 500, 60_000) : 5000
    await new Promise(r => setTimeout(r, waitMs))
    res = await doFetch()
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => null) as GroqErrorBody | null
    throw new Error(errBody?.error?.message ?? `Groq error ${res.status}`)
  }

  return res.json()
}

export async function extractRecipeFromImageWithGroq(
  images: ImageInput[],
  key: string,
  context?: string,
): Promise<ExtractedRecipe> {
  const contextLine = context ? `\n\nAdditional context from user: ${context}` : ''
  const data = await groqFetch({
    model: GROQ_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          ...images.map(img => ({
            type: 'image_url',
            image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
          })),
          {
            type: 'text',
            text: `Look at ${images.length > 1 ? 'these recipe images' : 'this recipe image'} and extract the recipe information.${contextLine}

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
- Return ONLY the JSON object, no explanation`,
          },
        ],
      },
    ],
    temperature: 0.1,
    max_completion_tokens: 900,
    reasoning_effort: 'none',
  }, key)

  return parseGroqJson((data.choices?.[0]?.message?.content ?? '') as string)
}

export async function extractRecipeWithGroq(html: string, key: string): Promise<ExtractedRecipe> {
  const required: (keyof ExtractedRecipe)[] = ['title', 'ingredients', 'instructions']
  const fromLd = extractFromJsonLd(html)
  if (fromLd && required.every(k => fromLd[k])) return fromLd

  // This account's Groq input-token cap is 7000/min (~3.2 chars/token observed),
  // so keep well under that to leave room for the prompt wrapper.
  const text = html.slice(0, 13_000)

  const data = await groqFetch({
    model: GROQ_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are a recipe data extractor. Respond with a single valid JSON object and nothing else — no markdown, no explanation, no code fences.',
      },
      {
        role: 'user',
        content: `This is the text content of a recipe web page. Ignore any blog stories, comments, ads, or unrelated content. Find and extract ONLY the recipe information.

Return a JSON object with these fields (omit fields you cannot find):
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
- ingredients: one ingredient with quantity per line, joined with \\n
- instructions: numbered steps, one per line, joined with \\n
- times and servings must be plain numbers
- ingredient_tags: array of lowercase English ingredient base names only — no quantities, no units, no preparation notes

Page text:
${text}`,
      },
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' },
    max_completion_tokens: 900,
    reasoning_effort: 'none',
  }, key)

  return parseGroqJson((data.choices?.[0]?.message?.content ?? '') as string)
}

export async function detectFridgeIngredientsWithGroq(
  base64: string,
  mimeType: string,
  key: string
): Promise<string[]> {
  const data = await groqFetch({
    model: GROQ_MODEL,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
        {
          type: 'text',
          text: `Look at this photo and identify the food ingredients you can see.

Return ONLY a valid JSON array of ingredient name strings. Rules:
- Include only meaningful food ingredients (vegetables, meat, dairy, fruit, condiments, etc.)
- Do NOT include: salt, pepper, oil, sugar, flour, water, spices, or pantry staples
- Do NOT include quantities, amounts, fat percentages, or units — just the name
- Use simple names: "chicken" not "chicken breast fillet", "cream" not "35% cream"
- Return ONLY the JSON array, no explanation, no markdown

Example: ["chicken", "garlic", "lemon", "cream", "eggs"]`,
        },
      ],
    }],
    temperature: 0.1,
    max_completion_tokens: 400,
    reasoning_effort: 'none',
  }, key)

  const content = (data.choices?.[0]?.message?.content ?? '') as string
  const match = content.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('No ingredient list in Groq response')
  let parsed: unknown
  try {
    parsed = JSON.parse(match[0])
  } catch {
    throw new Error('Malformed JSON in Groq response')
  }
  if (!Array.isArray(parsed)) throw new Error('Expected array from Groq')
  return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

const FRIDGE_VARIATIONS_GROQ = [
  'Mediterranean-style', 'Asian-inspired', 'quick weeknight',
  'hearty comfort food', 'Italian-inspired', 'Middle Eastern',
  'light and fresh', 'rustic one-pot', 'oven-baked', 'stir-fry',
]

export async function generateFridgeRecipeWithGroq(
  detected: string[],
  _slotIndex: number,
  apiKey: string
): Promise<GeneratedRecipe> {
  const style = FRIDGE_VARIATIONS_GROQ[Math.floor(Math.random() * FRIDGE_VARIATIONS_GROQ.length)]
  const data = await groqFetch({
    model: GROQ_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are a helpful cooking assistant for a European household. Respond with a single valid JSON object and nothing else — no markdown, no explanation, no code fences.',
      },
      {
        role: 'user',
        content: `The user has these FRIDGE ingredients:
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
- instructions: array of plain step strings, no numbering`,
      },
    ],
    temperature: 0.9,
    response_format: { type: 'json_object' },
    max_completion_tokens: 900,
    reasoning_effort: 'none',
  }, apiKey)

  return parseGeneratedRecipe((data.choices?.[0]?.message?.content ?? '') as string)
}

export async function generateIngredientTagsWithGroq(
  ingredients: string,
  key: string,
): Promise<string[]> {
  const data = await groqFetch({
    model: GROQ_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an ingredient extractor. Respond with a single valid JSON array and nothing else — no markdown, no explanation.',
      },
      {
        role: 'user',
        content: `Extract a list of English ingredient names from this ingredient list.
Return ONLY a valid JSON array of lowercase strings — no quantities, no units, no preparation notes, just the base name.
Example: ["chicken", "garlic", "cream", "lemon"]

Ingredients:
${ingredients}`,
      },
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' },
    max_completion_tokens: 250,
    reasoning_effort: 'none',
  }, key)

  const content = (data.choices?.[0]?.message?.content ?? '') as string
  // Groq json_object wraps the array; try direct parse then look for array
  let parsed: unknown
  try {
    const obj = JSON.parse(content) as Record<string, unknown>
    // Handle {"ingredients": [...]} or {"tags": [...]} wrapper
    parsed = Array.isArray(obj) ? obj : Object.values(obj).find(v => Array.isArray(v)) ?? obj
  } catch {
    const match = content.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('No ingredient array in Groq response')
    parsed = JSON.parse(match[0])
  }
  if (!Array.isArray(parsed)) throw new Error('Expected array from Groq')
  return parsed.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    .map(t => t.toLowerCase().trim())
}

export async function translateIngredientTermWithGroq(
  term: string,
  key: string,
): Promise<string> {
  try {
    const data = await groqFetch({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'user',
          content: `Translate this food ingredient term to English. Return ONLY the English word, lowercase, nothing else.
If it is already English, return it unchanged.

Term: ${term}`,
        },
      ],
      temperature: 0.1,
      max_completion_tokens: 20,
      reasoning_effort: 'none',
    }, key)
    const translated = ((data.choices?.[0]?.message?.content ?? '') as string)
      .trim().toLowerCase().replace(/[^a-z\s]/g, '').trim()
    return translated || term
  } catch {
    return term
  }
}
