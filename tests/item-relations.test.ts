import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { WikiCatalog } from '../app/types/wiki'
import {
  hasTradeExchange,
  playerFacingItemRecipeUses,
  resolveItemRecipeUses
} from '../app/utils/itemRelations'

const rootDir = resolve(import.meta.dirname, '..')
const catalog = JSON.parse(
  readFileSync(resolve(rootDir, 'generated', 'catalog.json'), 'utf8')
) as WikiCatalog

describe('player-facing item relations', () => {
  it('renders Avesta trades as structured exchanges', () => {
    const avesta = catalog.items.find(item => item.model === 'minecraft:avesta')
    expect(avesta).toBeDefined()

    const trades = avesta?.usedIn.filter(hasTradeExchange) ?? []
    expect(trades).toHaveLength(2)
    expect(trades.map(trade => trade.context)).toEqual([
      'Глашатай',
      'Глашатай'
    ])
    expect(trades.map(trade => trade.contextDetail)).toEqual([
      '2-й уровень',
      '2-й уровень'
    ])
    expect(trades.map(trade => trade.cost[0]?.title)).toEqual([
      'Авеста',
      'Авеста'
    ])
    expect(trades.map(trade => trade.result.title)).toEqual([
      'Офуда: Молитва Ахура-Мазде',
      'Офуда: Молитва Митре'
    ])
    expect(trades.map(trade => trade.details)).toEqual([
      ['Эффективность II', 'Прочность I'],
      ['Защита III']
    ])
  })

  it('keeps recipe uses short, linked and free of implementation jargon', () => {
    const avesta = catalog.items.find(item => item.model === 'minecraft:avesta')
    expect(avesta).toBeDefined()
    if (!avesta) return

    const hellBoundBook = resolveItemRecipeUses(catalog, avesta)
      .find(relation => relation.to === '/recipes/blessings/hell_bound_book')

    expect(hellBoundBook).toMatchObject({
      kind: 'recipe',
      title: '§cКнига адских уз',
      context: 'Верстак',
      technical: true
    })
    expect(hellBoundBook?.result?.title).toBe('§cКнига адских уз')
    expect(hellBoundBook?.description).toBe('Нужен как ингредиент.')
    expect(hellBoundBook?.description).not.toMatch(
      /components|minecraft:|техническ/ui
    )
  })

  it('shows carrier recipes only when the recipe names the Matcha item', () => {
    const benzene = catalog.items.find(item => (
      item.id === 'recipe-output:crafting/benzene'
    ))
    const avesta = catalog.items.find(item => item.model === 'minecraft:avesta')
    const fishBones = catalog.items.find(item => item.id === 'minecraft:fish_bones')
    expect(benzene).toBeDefined()
    expect(avesta).toBeDefined()
    expect(fishBones).toBeDefined()
    if (!benzene || !avesta || !fishBones) return

    expect(playerFacingItemRecipeUses(catalog, benzene).map(use => use.to))
      .toEqual([
        '/recipes/blessings/hell_bound_book',
        '/recipes/crafting/stabilised_estus'
      ])
    expect(playerFacingItemRecipeUses(catalog, avesta)).toEqual([])
    expect(playerFacingItemRecipeUses(catalog, fishBones)).toEqual([])
  })

  it('preserves distinct trade results that share one visual model', () => {
    const ofuda = catalog.items.find(item => item.model === 'minecraft:ofuda')
    const results = ofuda?.obtainedFrom
      .filter(hasTradeExchange)
      .map(relation => relation.result.title)

    expect(results).toContain('Офуда: Молитва Митре')
    expect(results).toContain('Офуда: Молитва Ахура-Мазде')
    expect(new Set(results).size).toBeGreaterThan(2)
  })

  it('shows wandering-trader offers without inventing a profession level', () => {
    const asylumSeeker = catalog.items.find(item => (
      item.model === 'minecraft:application'
    ))
    const offers = asylumSeeker?.obtainedFrom.filter(hasTradeExchange) ?? []

    expect(asylumSeeker?.title).toBe('Беженец')
    expect(offers.length).toBeGreaterThan(0)
    expect(offers.every(offer => offer.contextDetail === undefined)).toBe(true)
    expect(offers.every(offer => offer.result.title.startsWith('Беженец'))).toBe(true)
  })

  it('keeps relation labels in Russian and removes visual duplicates', () => {
    const duplicateRelations: string[] = []

    for (const item of catalog.items) {
      for (const relations of [item.obtainedFrom, item.usedIn]) {
        const keys = relations.map(relation => JSON.stringify({
          ...relation,
          sourcePath: undefined
        }))
        for (const key of keys) {
          if (keys.indexOf(key) !== keys.lastIndexOf(key)) {
            duplicateRelations.push(`${item.slug}:${key}`)
          }
        }

        for (const relation of relations) {
          if (relation.kind === 'trade') {
            expect(relation.context, item.slug).not.toMatch(/[A-Za-z]/)
          }
          if (
            relation.kind === 'loot'
            && relation.description.includes('сундук')
          ) {
            expect(relation.title, item.slug).not.toMatch(/[A-Za-z]/)
          }
        }
      }
    }

    expect(duplicateRelations).toEqual([])
  })

  it('keeps compound trade prices and links to the exact offer', () => {
    const opal = catalog.items.find(item => item.model === 'minecraft:opal')
    const earrings = opal?.usedIn
      .filter(hasTradeExchange)
      .find(relation => relation.to === '/traders/toolsmith#opal-earrings')

    expect(earrings?.cost.map(cost => [cost.title, cost.stack.count])).toEqual([
      ['Обол', 4],
      ['Опал', 1]
    ])
    expect(earrings?.result.title).toContain('Опаловые серьги')
  })
})
