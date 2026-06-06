import { extractFromJsonLd, sanitizeExtracted, type ExtractedRecipe } from './gemini'

const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

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

export async function extractRecipeFromImageWithGroq(base64: string, mimeType: string, key: string): Promise<ExtractedRecipe> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
            {
              type: 'text',
              text: `Look at this recipe image and extract the recipe information.

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
- ingredients: one ingredient with quantity per line, joined with \\n
- instructions: numbered steps, one per line, joined with \\n
- times and servings must be plain numbers
- Return ONLY the JSON object, no explanation`,
            },
          ],
        },
      ],
      temperature: 0.1,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error((body as { error?: { message?: string } } | null)?.error?.message ?? `Groq error ${res.status}`)
  }

  const data = await res.json()
  return parseGroqJson((data.choices?.[0]?.message?.content ?? '') as string)
}

export async function extractRecipeWithGroq(html: string, key: string): Promise<ExtractedRecipe> {
  const required: (keyof ExtractedRecipe)[] = ['title', 'ingredients', 'instructions']
  const fromLd = extractFromJsonLd(html)
  if (fromLd && required.every(k => fromLd[k])) return fromLd

  const text = html.slice(0, 50_000)

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
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
  "servings": 8
}

Rules:
- ingredients: one ingredient with quantity per line, joined with \\n
- instructions: numbered steps, one per line, joined with \\n
- times and servings must be plain numbers

Page text:
${text}`,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(
      (body as { error?: { message?: string } } | null)?.error?.message ?? `Groq error ${res.status}`
    )
  }

  const data = await res.json()
  return parseGroqJson((data.choices?.[0]?.message?.content ?? '') as string)
}
