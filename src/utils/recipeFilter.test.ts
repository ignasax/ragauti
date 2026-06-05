import { describe, it, expect } from 'vitest'
import { filterRecipes } from './recipeFilter'
import type { Recipe } from '../types/app'

const base: Recipe = {
  id: '1', user_id: 'u1', title: 'Pasta', ingredients: 'garlic\npasta',
  instructions: 'cook', image_url: null, cook_time_mins: 20, prep_time_mins: 5,
  servings: 2, rating: 4, categories: ['Italian'], comments: null,
  is_favourite: false, source_url: null, created_at: '', updated_at: '',
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
