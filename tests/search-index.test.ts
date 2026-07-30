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
import { resolveAcquisitionTargetForStack } from '../app/utils/acquisition'

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
    expect(itemEntries).toHaveLength(
      catalog.items.length
      + catalog.acquisition.targets.filter(target => !target.itemSlug).length
    )

    for (const recipe of catalog.recipes) {
      if (!recipe.result) continue

      const resultItem = catalog.items.find(item => (
        item.recipeIds.includes(recipe.id)
      )) ?? resolveStackItem(catalog.items, recipe.result)
      const recipePath = `/recipes/${recipe.namespace}/${recipe.path}`
      const recipeEntry = searchIndex.find(entry => entry.path === recipePath)

      if (!resultItem) {
        const resultTarget = resolveAcquisitionTargetForStack(
          catalog.acquisition,
          recipe.result
        )
        if (resultTarget && !resultTarget.itemSlug) {
          const targetEntry = searchIndex.find(entry => (
            entry.path === `/items/${resultTarget.slug}`
          ))
          expect(targetEntry?.terms, recipe.id).toContain(recipe.id)
          expect(recipeEntry, recipe.id).toBeUndefined()
          continue
        }

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

  it('finds acquisition guides by player-facing names and aliases', () => {
    const acquisitionEntries = searchIndex.filter(entry => (
      entry.kind === 'location' || entry.kind === 'mob'
    ))

    expect(acquisitionEntries).toHaveLength(
      catalog.acquisition.locations.length + catalog.acquisition.mobs.length
    )
    expect(acquisitionEntries.every(entry => entry.icon)).toBe(true)

    const elderGuardian = acquisitionEntries.find(entry => (
      entry.path === '/mobs/elder-guardian'
    ))
    expect(elderGuardian).toMatchObject({
      kind: 'mob',
      title: 'Древний страж',
      category: 'Моб и добыча'
    })
    expect(elderGuardian?.terms).toContain('Морской Бог')
    expect(elderGuardian?.terms).toContain('Опал')
  })

  it('finds one page for each trader and all of their offers', () => {
    const traderEntries = searchIndex.filter(entry => entry.kind === 'trader')
    expect(traderEntries).toHaveLength(catalog.traders.length)

    const herald = traderEntries.find(entry => entry.path === '/traders/librarian')
    expect(herald).toMatchObject({
      title: 'Глашатай',
      category: 'Торговец'
    })
    expect(herald?.terms).toContain('Авеста')
    expect(herald?.terms).toContain('Офуда: Молитва Ахура-Мазде')
  })

  it('shows one search result per player-facing result', () => {
    const recipeAndItemEntries = searchIndex.filter(entry => (
      entry.kind === 'item' || entry.kind === 'recipe'
    ))
    const normalizedTitles = recipeAndItemEntries.map(entry => (
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
      kind: 'item',
      category: 'Переосмысленный ресурс'
    })
    expect(sulfurChunk?.path).toBe('/items/kusok-sery')
  })

  it('links renamed stack resources to exact player-facing pages', () => {
    for (const title of [
      'Кусок серы',
      'Обол',
      'Слиток серебра',
      'Сплав гепатизона',
      'Солома',
      'Семена помидоров'
    ]) {
      const entry = searchIndex.find(candidate => candidate.title === title)
      expect(entry, title).toMatchObject({ kind: 'item' })
      expect(entry?.path, title).toMatch(/^\/items\/[a-z0-9-]+$/)
      expect(entry?.path, title).not.toBe('/recipes')
    }

    const voidEntries = searchIndex.filter(entry => (
      entry.title.startsWith('Стабильная пустота:')
    ))
    expect(voidEntries).toHaveLength(2)
    expect(new Set(voidEntries.map(entry => entry.path)).size).toBe(2)
  })
})

function stripFormatting(value: string): string {
  return value.replace(/§[0-9a-fk-or]/gi, '')
}
