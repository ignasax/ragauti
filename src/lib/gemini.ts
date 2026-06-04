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
  return JSON.parse(match[0]) as ExtractedRecipe
}
