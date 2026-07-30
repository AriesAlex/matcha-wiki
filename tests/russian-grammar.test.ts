import { describe, expect, it } from 'vitest'
import { russianWordForm } from '../scripts/lib/russianGrammar'

describe('Russian word forms', () => {
  it.each([
    [1, 'рецепт'],
    [2, 'рецепта'],
    [5, 'рецептов'],
    [11, 'рецептов'],
    [14, 'рецептов'],
    [21, 'рецепт'],
    [23, 'рецепта'],
    [100, 'рецептов']
  ])('selects the right form for %i', (count, expected) => {
    expect(
      russianWordForm(count, ['рецепт', 'рецепта', 'рецептов'])
    ).toBe(expected)
  })
})
