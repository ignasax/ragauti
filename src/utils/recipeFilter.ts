import type { Recipe } from '../types/app'
import { scaleIngredients } from './servingScaler'
import { HOUSEHOLD_PANTRY } from '../constants/pantry'

export interface RecipeFilters {
  search?: string
  ingredientTerms?: string[]
  ingredientTagTerms?: string[]
  rating?: number
  favouritesOnly?: boolean
  categories?: string[]
}

export function filterRecipes(recipes: Recipe[], filters: RecipeFilters): Recipe[] {
  const { search, ingredientTerms, ingredientTagTerms, rating, favouritesOnly, categories } = filters
  return recipes.filter(r => {
    if (search) {
      if (!r.title.toLowerCase().includes(search.toLowerCase())) return false
    }

    if (ingredientTerms?.length || ingredientTagTerms?.length) {
      const ing = r.ingredients.toLowerCase()
      const tags = r.ingredient_tags ?? []
      const termCount = Math.max(ingredientTerms?.length ?? 0, ingredientTagTerms?.length ?? 0)

      // ingredientTerms[i] and ingredientTagTerms[i] represent the same search term:
      // raw (for text match) and English-translated (for tag match).
      // A recipe passes position i if EITHER the raw term is in the ingredients text
      // OR the translated term is in the ingredient_tags array.
      for (let i = 0; i < termCount; i++) {
        const rawTerm = ingredientTerms?.[i]
        const tagTerm = ingredientTagTerms?.[i]
        const textMatch = rawTerm ? ing.includes(rawTerm.toLowerCase()) : false
        const tagMatch = tagTerm
          ? tags.some(tag => tag.includes(tagTerm.toLowerCase()) || tagTerm.toLowerCase().includes(tag))
          : false
        if (!textMatch && !tagMatch) return false
      }
    }

    if (rating != null && r.rating !== rating) return false
    if (favouritesOnly && !r.is_favourite) return false
    if (categories?.length && !categories.every(c => r.categories.includes(c))) return false
    return true
  })
}

export const PANTRY_STAPLES = new Set([
  'salt', 'pepper', 'black pepper', 'white pepper', 'oil', 'olive oil',
  'vegetable oil', 'sunflower oil', 'water', 'sugar', 'flour', 'butter',
  'vinegar', 'baking powder', 'baking soda', 'yeast', 'cumin', 'paprika',
  'oregano', 'thyme', 'rosemary', 'basil', 'bay leaf', 'bay leaves',
  'cinnamon', 'nutmeg', 'turmeric', 'coriander', 'chili flakes', 'chilli flakes',
])

export function stripQuantity(line: string): string {
  let s = line.trim()
  s = s.replace(/^(juice|zest)\s+of\s+\d*\.?\d*\s*/i, '')
  s = s.replace(/^\d+(\.\d+)?(\s*\/\s*\d+)?\s*(g|kg|ml|l|oz|lb|tbsps?|tsps?|cups?|cloves?|pinch(es)?|bunch(es)?|handful|pieces?|slices?|sprigs?|sticks?|heads?|stalks?)(?![a-zA-Z])\s*/i, '')
  s = s.replace(/^\d+(\.\d+)?%\s*/i, '')
  s = s.replace(/^\d+(\.\d+)?\s+/i, '')
  return s.toLowerCase().trim()
}

function isStaple(stripped: string): boolean {
  return Array.from(PANTRY_STAPLES).some(s => {
    const pattern = new RegExp('(?:^|\\s)' + s.replace(/\s+/g, '\\s+') + '(?:\\s|$)')
    return pattern.test(stripped)
  })
}

export function scoreFridgeMatch(
  recipe: Recipe,
  detected: string[]
): { score: number; matched: number; total: number } {
  if (!detected.length) return { score: 0, matched: 0, total: 0 }
  const lines = recipe.ingredients.split('\n').map(l => l.trim()).filter(Boolean)
  const meaningful = lines.filter(l => {
    const stripped = stripQuantity(l)
    return stripped.length > 0 && !isStaple(stripped)
  })
  if (!meaningful.length) return { score: 0, matched: 0, total: 0 }

  const detectedLower = detected.map(d => d.toLowerCase())
  const tags = recipe.ingredient_tags ?? []

  if (tags.length) {
    // Tag-aware scoring: ingredient_tags are the AI-extracted English names for each
    // meaningful ingredient (non-staples). Use them as the authoritative ingredient list.
    const matchedCount = tags.filter(tag => {
      const tagLower = tag.toLowerCase()
      // Also check raw text as a fallback in case tag matches ingredient text directly
      return detectedLower.some(d => d === tagLower || d.includes(tagLower) || tagLower.includes(d))
    }).length
    const total = tags.length
    return { score: matchedCount / total, matched: matchedCount, total }
  }

  // No tags: fall back to text-based scoring on meaningful lines
  const matched = meaningful.filter(l => {
    const stripped = stripQuantity(l)
    return stripped.length > 0 && detectedLower.some(d => stripped.includes(d) || d.includes(stripped))
  }).length

  return { score: matched / meaningful.length, matched, total: meaningful.length }
}

export type FridgeRecipe = Recipe & {
  fridgeScore: number
  fridgeMatched: number
  fridgeTotal: number
}

export function filterByFridge(
  recipes: Recipe[],
  detected: string[],
  threshold = 0.35
): FridgeRecipe[] {
  if (!detected.length) return []
  const allAvailable = [...detected, ...HOUSEHOLD_PANTRY]
  return recipes
    .map(r => {
      const { score, matched, total } = scoreFridgeMatch(r, allAvailable)
      return { ...r, fridgeScore: score, fridgeMatched: matched, fridgeTotal: total }
    })
    .filter(r => r.fridgeScore >= threshold)
    .sort((a, b) => b.fridgeScore - a.fridgeScore)
}

export function getFridgeIngredientBreakdown(
  recipe: Recipe,
  detected: string[],
  multiplier: number
): {
  matched: Array<{ detectedName: string; scaledIngredient: string }>
  missing: Array<{ scaledIngredient: string }>
} {
  const lines = recipe.ingredients.split('\n').map(l => l.trim()).filter(Boolean)
  const scaledLines = scaleIngredients(recipe.ingredients, multiplier)
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
  const detectedLower = detected.map(d => d.toLowerCase())
  const tags = recipe.ingredient_tags ?? []
  const matched: Array<{ detectedName: string; scaledIngredient: string }> = []
  const missing: Array<{ scaledIngredient: string }> = []

  lines.forEach((line, i) => {
    const stripped = stripQuantity(line)
    if (!stripped || isStaple(stripped)) return
    const scaledIngredient = scaledLines[i] ?? line

    // Text-based match
    let detectedMatch = detectedLower.find(d => stripped.includes(d) || d.includes(stripped))

    // Tag-based match fallback
    if (!detectedMatch && tags.length) {
      const lineTag = tags.find(tag => stripped.includes(tag) || tag.includes(stripped))
      if (lineTag) {
        detectedMatch = detectedLower.find(d => d === lineTag || d.includes(lineTag) || lineTag.includes(d))
      }
    }

    if (detectedMatch) {
      matched.push({ detectedName: detectedMatch, scaledIngredient })
    } else {
      missing.push({ scaledIngredient })
    }
  })

  return { matched, missing }
}
