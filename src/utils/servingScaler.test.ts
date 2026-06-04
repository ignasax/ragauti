import { describe, it, expect } from 'vitest'
import { scaleIngredients } from './servingScaler'

describe('scaleIngredients', () => {
  it('scales a simple integer quantity', () => {
    expect(scaleIngredients('2 eggs', 2)).toBe('4 eggs')
  })
  it('scales a decimal quantity', () => {
    expect(scaleIngredients('1.5 cups flour', 2)).toBe('3 cups flour')
  })
  it('scales a fraction', () => {
    expect(scaleIngredients('1/2 tsp salt', 2)).toBe('1 tsp salt')
  })
  it('scales multiple lines independently', () => {
    expect(scaleIngredients('2 eggs\n1 cup milk', 3)).toBe('6 eggs\n3 cups milk')
  })
  it('leaves lines with no number unchanged', () => {
    expect(scaleIngredients('a pinch of salt', 2)).toBe('a pinch of salt')
  })
  it('returns original on multiplier 1', () => {
    expect(scaleIngredients('3 tomatoes', 1)).toBe('3 tomatoes')
  })
})
