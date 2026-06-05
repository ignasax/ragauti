import { htmlToText, extractFromJsonLd, sanitizeExtracted, type ExtractedRecipe } from './gemini'

export async function extractRecipeWithGroq(html: string, key: string): Promise<ExtractedRecipe> {
  const required: (keyof ExtractedRecipe)[] = ['title', 'ingredients', 'instructions']
  const fromLd = extractFromJsonLd(html)
  console.log('[groq] JSON-LD result:', fromLd)
  if (fromLd && required.every(k => fromLd[k])) return fromLd

  const text = htmlToText(html).slice(0, 50_000)
  console.log('[groq] text length:', text.length, 'preview:', text.slice(0, 300))

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
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
  const content = (data.choices?.[0]?.message?.content ?? '') as string
  console.log('[groq] response:', content)

  try {
    return sanitizeExtracted(JSON.parse(content))
  } catch {
    // Fall back: strip markdown fences then regex-extract the object
    const cleaned = content.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON in Groq response')
    return sanitizeExtracted(JSON.parse(match[0]))
  }
}
