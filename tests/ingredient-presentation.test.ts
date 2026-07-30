import { describe, expect, it } from 'vitest'
import type {
  IngredientGlossaryEntry,
  IngredientView
} from '../app/types/wiki'
import {
  explainIngredient,
  formatIngredientAlternatives
} from '../app/utils/ingredientPresentation'

describe('ingredient presentation', () => {
  it('collapses repeated translated names for every alternative group', () => {
    expect(formatIngredientAlternatives([
      'Пластинка',
      'Пластинка',
      'Пластинка'
    ])).toBe('Пластинка — любой вариант')
  })

  it('keeps short alternatives readable and abbreviates long distinct lists', () => {
    expect(formatIngredientAlternatives(['Уголь', 'Древесный уголь']))
      .toBe('Уголь или Древесный уголь')
    expect(formatIngredientAlternatives([
      'Дубовые доски',
      'Еловые доски',
      'Берёзовые доски',
      'Вишнёвые доски'
    ])).toBe('Дубовые доски, Еловые доски или ещё 2 варианта')
  })

  it('summarizes alternative acquisition instead of concatenating every hint', () => {
    const ingredient: IngredientView = {
      ids: ['minecraft:first', 'minecraft:second', 'minecraft:third'],
      label: 'Тестовый предмет — любой вариант',
      icons: []
    }
    const glossary: Record<string, IngredientGlossaryEntry> = Object.fromEntries(
      ingredient.ids.map((id, index) => [id, {
        id,
        name: 'Тестовый предмет',
        obtainHint: `Отдельная длинная подсказка ${index + 1}.`
      }])
    )

    expect(explainIngredient(ingredient, glossary)).toBe(
      'Подойдёт любой из 3 вариантов. Выбирайте тот, который уже есть или проще получить.'
    )
  })
})
