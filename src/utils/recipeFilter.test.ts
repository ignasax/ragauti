import { describe, it, expect } from 'vitest'
import { filterRecipes, stripQuantity, scoreFridgeMatch, filterByFridge } from './recipeFilter'
import type { Recipe } from '../types/app'

const base: Recipe = {
  id: '1', user_id: 'u1', title: 'Pasta', ingredients: 'garlic\npasta',
  instructions: 'cook', image_url: null, image_urls: [], cook_time_mins: 20, prep_time_mins: 5,
  servings: 2, rating: 4, categories: ['Italian'], comments: null,
  is_favourite: false, source_url: null, ingredient_tags: [], created_at: '', updated_at: '',
}

describe('filterRecipes', () => {
  it('returns all when no filters', () => {
    expect(filterRecipes([base], {})).toHaveLength(1)
  })
  it('filters by name search (title only)', () => {
    expect(filterRecipes([base], { search: 'past' })).toHaveLength(1)
    expect(filterRecipes([base], { search: 'soup' })).toHaveLength(0)
    expect(filterRecipes([base], { search: 'garlic' })).toHaveLength(0)
  })
  it('filters by ingredient terms (partial match, must match all)', () => {
    expect(filterRecipes([base], { ingredientTerms: ['garlic'] })).toHaveLength(1)
    expect(filterRecipes([base], { ingredientTerms: ['chicken'] })).toHaveLength(0)
    expect(filterRecipes([base], { ingredientTerms: ['past'] })).toHaveLength(0)
    expect(filterRecipes([base], { ingredientTerms: ['garlic', 'pasta'] })).toHaveLength(1)
    expect(filterRecipes([base], { ingredientTerms: ['garlic', 'chicken'] })).toHaveLength(0)
  })
  it('filters by exact rating', () => {
    expect(filterRecipes([base], { rating: 4 })).toHaveLength(1)
    expect(filterRecipes([base], { rating: 5 })).toHaveLength(0)
    expect(filterRecipes([base], { rating: 3 })).toHaveLength(0)
  })
  it('filters by favourites only', () => {
    expect(filterRecipes([base], { favouritesOnly: true })).toHaveLength(0)
    expect(filterRecipes([{ ...base, is_favourite: true }], { favouritesOnly: true })).toHaveLength(1)
  })
  it('filters by category', () => {
    expect(filterRecipes([base], { categories: ['Italian'] })).toHaveLength(1)
    expect(filterRecipes([base], { categories: ['Mexican'] })).toHaveLength(0)
  })
  it('composes multiple filters', () => {
    const r2 = { ...base, id: '2', title: 'Soup', rating: 3, categories: ['French'] }
    expect(filterRecipes([base, r2], { search: 'soup', rating: 4 })).toHaveLength(0)
    expect(filterRecipes([base, r2], { search: 'soup', rating: 3 })).toHaveLength(1)
    expect(filterRecipes([base, r2], { ingredientTerms: ['garlic'], rating: 4 })).toHaveLength(1)
    expect(filterRecipes([base, r2], { ingredientTerms: ['garlic'], rating: 3 })).toHaveLength(0)
  })
})

describe('stripQuantity', () => {
  it('strips grams prefix', () => expect(stripQuantity('500g chicken breast')).toBe('chicken breast'))
  it('strips ml prefix', () => expect(stripQuantity('200ml chicken stock')).toBe('chicken stock'))
  it('strips percentage', () => expect(stripQuantity('35% thick cream')).toBe('thick cream'))
  it('strips "juice of N"', () => expect(stripQuantity('juice of 1 lemon')).toBe('lemon'))
  it('strips tbsp', () => expect(stripQuantity('3 tbsp butter')).toBe('butter'))
  it('strips cloves unit', () => expect(stripQuantity('4 cloves garlic')).toBe('garlic'))
  it('strips plain leading number', () => expect(stripQuantity('2 eggs')).toBe('eggs'))
  it('leaves plain text unchanged', () => expect(stripQuantity('chicken')).toBe('chicken'))
  it('lowercases result', () => expect(stripQuantity('Chicken Breast')).toBe('chicken breast'))
})

describe('scoreFridgeMatch', () => {
  const recipe: Recipe = {
    ...base,
    ingredients: '500g chicken\n4 cloves garlic\njuice of 1 lemon\nsalt\npepper',
  }

  it('matches all meaningful ingredients, skips salt and pepper', () => {
    const r = scoreFridgeMatch(recipe, ['chicken', 'garlic', 'lemon'])
    expect(r.matched).toBe(3)
    expect(r.total).toBe(3)
    expect(r.score).toBeCloseTo(1.0)
  })

  it('partial match returns correct ratio', () => {
    const r = scoreFridgeMatch(recipe, ['chicken'])
    expect(r.matched).toBe(1)
    expect(r.total).toBe(3)
    expect(r.score).toBeCloseTo(0.333, 2)
  })

  it('returns zero score for empty detected list', () => {
    expect(scoreFridgeMatch(recipe, []).score).toBe(0)
  })

  it('returns zero score for no meaningful ingredients', () => {
    const r = scoreFridgeMatch({ ...base, ingredients: 'salt\npepper' }, ['chicken'])
    expect(r.score).toBe(0)
    expect(r.total).toBe(0)
  })
})

describe('filterByFridge', () => {
  const chicken: Recipe = { ...base, id: '1', ingredients: 'chicken\ngarlic\nlemon\nsalt' }
  const pasta: Recipe = { ...base, id: '2', title: 'Pasta', ingredients: 'pasta\nonion\ntomato\nsalt' }

  it('returns recipes above threshold, sorted by score descending', () => {
    const result = filterByFridge([chicken, pasta], ['chicken', 'garlic', 'lemon'])
    expect(result[0].id).toBe('1')
    expect(result[0].fridgeScore).toBeCloseTo(1.0)
    expect(result[0].fridgeMatched).toBe(3)
    expect(result[0].fridgeTotal).toBe(3)
  })

  it('filters out recipes below threshold', () => {
    // pasta has no matching ingredients → score 0, filtered out
    const result = filterByFridge([chicken, pasta], ['chicken'], 0.30)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('returns empty array when detected list is empty', () => {
    expect(filterByFridge([chicken, pasta], [])).toHaveLength(0)
  })
})

describe('filterRecipes – ingredientTagTerms', () => {
  const withTags: Recipe = {
    ...base,
    ingredients: '2 vištiena filė\n1 citrina',
    ingredient_tags: ['chicken', 'lemon'],
  }

  it('matches recipe via ingredient_tags when raw term not in ingredients text', () => {
    expect(filterRecipes([withTags], { ingredientTagTerms: ['chicken'] })).toHaveLength(1)
  })

  it('no match when tag term absent from ingredient_tags', () => {
    expect(filterRecipes([withTags], { ingredientTagTerms: ['garlic'] })).toHaveLength(0)
  })

  it('matches via ingredients text even when ingredientTagTerms present', () => {
    expect(filterRecipes([withTags], {
      ingredientTerms: ['vištiena'],
      ingredientTagTerms: ['chicken'],
    })).toHaveLength(1)
  })

  it('requires ALL terms to match (tag or text) when multiple given', () => {
    // lemon matches via tags, vištiena matches via text
    expect(filterRecipes([withTags], {
      ingredientTerms: ['vištiena', 'nothere'],
      ingredientTagTerms: ['chicken', 'garlic'],
    })).toHaveLength(0)
  })

  it('a single term matches if raw OR tag matches', () => {
    // "chicken" is in ingredient_tags; not in ingredients text
    expect(filterRecipes([withTags], {
      ingredientTerms: ['chicken'],
      ingredientTagTerms: ['chicken'],
    })).toHaveLength(1)
  })

  it('partial tag match — tag contains the search term', () => {
    const r = { ...base, ingredients: 'pasta', ingredient_tags: ['pasta', 'tomato sauce'] }
    expect(filterRecipes([r], { ingredientTagTerms: ['tomato'] })).toHaveLength(1)
  })
})

describe('scoreFridgeMatch – with ingredient_tags', () => {
  const lithuanian: Recipe = {
    ...base,
    ingredients: '2 vištiena filė\n100g grietinė\njuice of 1 citrina\ndruskos',
    ingredient_tags: ['chicken', 'cream', 'lemon'],
  }

  it('matches via tags when AI detected English names', () => {
    const r = scoreFridgeMatch(lithuanian, ['chicken', 'cream', 'lemon'])
    expect(r.matched).toBe(3)
    expect(r.total).toBe(3)
    expect(r.score).toBeCloseTo(1.0)
  })

  it('partial match via tags', () => {
    const r = scoreFridgeMatch(lithuanian, ['chicken'])
    expect(r.matched).toBe(1)
    expect(r.total).toBe(3)
  })

  it('falls back to text match when ingredient_tags is empty', () => {
    const noTags: Recipe = { ...base, ingredients: 'chicken\ngarlic', ingredient_tags: [] }
    const r = scoreFridgeMatch(noTags, ['chicken'])
    expect(r.matched).toBe(1)
    expect(r.total).toBe(2)
  })
})
