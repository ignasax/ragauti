import type { Recipe } from '../types/app'
import { scaleIngredients } from './servingScaler'

export interface RecipeFilters {
  search?: string
  ingredientTerms?: string[]
  rating?: number
  favouritesOnly?: boolean
  categories?: string[]
}

export function filterRecipes(recipes: Recipe[], filters: RecipeFilters): Recipe[] {
  const { search, ingredientTerms, rating, favouritesOnly, categories } = filters
  return recipes.filter(r => {
    if (search) {
      if (!r.title.toLowerCase().includes(search.toLowerCase())) return false
    }
    if (ingredientTerms?.length) {
      const ing = r.ingredients.toLowerCase()
      if (!ingredientTerms.every(term => ing.includes(term.toLowerCase()))) return false
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
  s = s.replace(/^\d+(\.\d+)?(\s*\/\s*\d+)?\s*(g|kg|ml|l|oz|lb|tbsps?|tsps?|cups?|cloves?|pinch(es)?|bunch(es)?|handful|pieces?|slices?|sprigs?|sticks?|heads?|stalks?)\s*/i, '')
  s = s.replace(/^\d+(\.\d+)?%\s*/i, '')
  s = s.replace(/^\d+(\.\d+)?\s+/i, '')
  return s.toLowerCase().trim()
}

function isStaple(stripped: string): boolean {
  return Array.from(PANTRY_STAPLES).some(s => stripped.includes(s))
}

export function scoreFridgeMatch(
  recipe: Recipe,
  detected: string[]
): { score: number; matched: number; total: number } {
  if (!detected.length) return { score: 0, matched: 0, total: 0 }
  const lines = recipe.ingredients.split('\n').map(l => l.trim()).filter(Boolean)
  const meaningful = lines.filter(l => !isStaple(stripQuantity(l)))
  if (!meaningful.length) return { score: 0, matched: 0, total: 0 }
  const detectedLower = detected.map(d => d.toLowerCase())
  const matched = meaningful.filter(l => {
    const stripped = stripQuantity(l)
    return detectedLower.some(d => stripped.includes(d) || d.includes(stripped))
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
  return recipes
    .map(r => {
      const { matched, total } = scoreFridgeMatch(r, detected)
      const fridgeScore = matched / detected.length
      return { ...r, fridgeScore, fridgeMatched: matched, fridgeTotal: total }
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
  const matched: Array<{ detectedName: string; scaledIngredient: string }> = []
  const missing: Array<{ scaledIngredient: string }> = []

  lines.forEach((line, i) => {
    const stripped = stripQuantity(line)
    if (isStaple(stripped)) return
    const scaledIngredient = scaledLines[i] ?? line
    const detectedMatch = detectedLower.find(d => stripped.includes(d) || d.includes(stripped))
    if (detectedMatch) {
      matched.push({ detectedName: detectedMatch, scaledIngredient })
    } else {
      missing.push({ scaledIngredient })
    }
  })

  return { matched, missing }
}
