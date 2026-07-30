import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type {
  WikiCatalog,
  WikiSearchEntry
} from '../app/types/wiki'
import {
  resolveIngredientItem,
  resolveStackItem
} from '../app/utils/itemReference'

const rootDir = resolve(import.meta.dirname, '..')
const catalog = JSON.parse(
  readFileSync(resolve(rootDir, 'generated', 'catalog.json'), 'utf8')
) as WikiCatalog
const searchIndex = JSON.parse(
  readFileSync(resolve(rootDir, 'generated', 'search-index.json'), 'utf8')
) as WikiSearchEntry[]

describe('player-facing search index', () => {
  it('uses each item page as the single result for its recipes', () => {
    const itemEntries = searchIndex.filter(entry => entry.kind === 'item')
    expect(itemEntries).toHaveLength(catalog.items.length)

    for (const recipe of catalog.recipes) {
      if (!recipe.result) continue

      const resultItem = catalog.items.find(item => (
        item.recipeIds.includes(recipe.id)
      )) ?? resolveStackItem(catalog.items, recipe.result)
      const recipePath = `/recipes/${recipe.namespace}/${recipe.path}`
      const recipeEntry = searchIndex.find(entry => entry.path === recipePath)

      if (!resultItem) {
        const groupedRecipeEntry = searchIndex.find(entry => (
          entry.kind === 'recipe' && entry.terms.includes(recipe.id)
        ))
        expect(groupedRecipeEntry?.kind, recipe.id).toBe('recipe')
        continue
      }

      expect(recipeEntry, recipe.id).toBeUndefined()

      const itemEntry = searchIndex.find(entry => (
        entry.path === `/items/${resultItem.slug}`
      ))
      expect(itemEntry?.terms, recipe.id).toContain(recipe.id)
      expect(itemEntry?.terms, recipe.id).toContain(recipe.station)

      for (const ingredient of recipe.ingredients) {
        const ingredientTitle = resolveIngredientItem(catalog.items, ingredient)?.title
          ?? ingredient.label
        expect(itemEntry?.terms, `${recipe.id} → ${ingredientTitle}`)
          .toContain(ingredientTitle)
      }
    }
  })

  it('keeps player-facing labels separate from technical search terms', () => {
    for (const entry of searchIndex) {
      expect(entry.title).toBeTruthy()
      expect(entry.description).toBeTruthy()
      expect(entry.category).toBeTruthy()
      expect(entry.category).not.toMatch(/\w+:\w+/)
    }

    const copperPickaxe = searchIndex.find(entry => (
      entry.path === '/items/minecraft-copper-pickaxe'
    ))
    expect(copperPickaxe).toMatchObject({
      kind: 'item',
      title: 'Медная кирка',
      category: 'Снаряжение'
    })
    expect(copperPickaxe?.terms).toContain('crafting:copper_pickaxe')
    expect(copperPickaxe?.terms).toContain('Медный слиток')
  })

  it('shows one search result per player-facing result', () => {
    const normalizedTitles = searchIndex.map(entry => (
      stripFormatting(entry.title)
        .toLocaleLowerCase('ru-RU')
        .replaceAll('ё', 'е')
        .trim()
    ))
    const duplicates = normalizedTitles.filter((title, index) => (
      normalizedTitles.indexOf(title) !== index
    ))

    expect(duplicates).toEqual([])

    const sulfurChunk = searchIndex.find(entry => entry.title === 'Кусок серы')
    expect(sulfurChunk).toMatchObject({
      kind: 'recipe',
      category: '2 способа изготовления'
    })
    expect(sulfurChunk?.path).toBe('/recipes?q=%D0%9A%D1%83%D1%81%D0%BE%D0%BA%20%D1%81%D0%B5%D1%80%D1%8B')
  })
})

function stripFormatting(value: string): string {
  return value.replace(/§[0-9a-fk-or]/gi, '')
}
