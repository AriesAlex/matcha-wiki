import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type {
  TradeOfferView,
  TraderView
} from '../app/types/entities'
import type { WikiCatalog } from '../app/types/wiki'
import { tradeSetSelectionNote } from '../app/utils/tradeSetPresentation'
import { loadActiveTradeGraph } from '../scripts/lib/tradeEntities'

const rootDir = resolve(import.meta.dirname, '..')
const catalog = JSON.parse(
  readFileSync(resolve(rootDir, 'generated/catalog.json'), 'utf8')
) as WikiCatalog
const graph = loadActiveTradeGraph({
  dataDir: resolve(rootDir, 'pack/data'),
  rootDir
})
const offers = catalog.traders.flatMap(trader =>
  trader.sets.flatMap(set => set.offers)
)

describe('active villager trade catalog', () => {
  it('follows the live set and tag graph instead of scanning orphan files', () => {
    expect(graph.sets).toHaveLength(68)
    expect(graph.definitionCount).toBe(235)
    expect(graph.referencedTradeIds).toHaveLength(234)
    expect(graph.orphanTradeIds).toEqual([
      'minecraft:mason/4/quartz_emerald'
    ])

    expect(catalog.traders).toHaveLength(14)
    expect(offers).toHaveLength(215)
    expect(offers.some(offer => offer.id.endsWith('/filler'))).toBe(false)
    expect(
      graph.sets.flatMap(set => set.entries).filter(entry => entry.discarded)
    ).toHaveLength(19)
  })

  it('restores all eleven fisherman expert offers including opah', () => {
    const fisherman = trader('fisherman')
    const expert = fisherman.sets.find(set => set.level === 4)

    expect(expert).toMatchObject({
      amount: 11,
      poolSize: 11,
      hiddenOfferCount: 0
    })
    expect(expert?.offers).toHaveLength(11)
    expect(expert?.offers.map(offer => offer.id))
      .toContain('minecraft:fisherman/4/opah')
    expect(expert?.offers.find(offer => offer.id.endsWith('/opah'))?.to)
      .toBe('/traders/fisherman#opah')
  })

  it('keeps every additional price item in the visual exchange', () => {
    const twoPartPrices = offers.filter(offer => offer.costs.length === 2)
    expect(twoPartPrices).toHaveLength(14)

    expect(offer('minecraft:toolsmith/1/opal_earrings').costs.map(cost => ({
      title: cost.title,
      count: cost.stack.count,
      model: cost.stack.model
    }))).toEqual([
      {
        title: 'Обол',
        count: 4,
        model: undefined
      },
      {
        title: 'Опал',
        count: 1,
        model: 'minecraft:opal'
      }
    ])
    expect(offer('minecraft:toolsmith/4/bronze_laurel').costs[1])
      .toMatchObject({
        title: 'Сплав гепатизона',
        stack: {
          carrier: 'minecraft:phantom_membrane',
          count: 2
        }
      })
  })

  it('turns explorer-map modifiers into named filled maps', () => {
    const maps = offers.filter(candidate => (
      candidate.result.stack.carrier === 'minecraft:filled_map'
    ))

    expect(maps).toHaveLength(16)
    expect(maps.every(candidate => (
      candidate.result.title.startsWith('Карта исследователя:')
    ))).toBe(true)
    expect(offer('minecraft:cartographer/4/ancient_city')).toMatchObject({
      result: {
        title: 'Карта исследователя: Древний город',
        stack: {
          carrier: 'minecraft:filled_map'
        }
      },
      details: ['Карта ведёт к месту: Древний город']
    })
  })

  it('explains biome-gated offers without exposing raw predicates', () => {
    const conditioned = offers.filter(candidate => candidate.conditions.length)
    expect(conditioned).toHaveLength(12)
    expect(conditioned.flatMap(candidate => candidate.conditions))
      .toEqual(expect.arrayContaining([
        'Только в холодных биомах',
        'Только в умеренных биомах',
        'Только в тёплых биомах'
      ]))
    expect(JSON.stringify(conditioned)).not.toContain('merchant_predicate')
  })

  it('does not count mutually exclusive biome offers as one random pool', () => {
    const shepherdSet = trader('shepherd').sets.find(set => set.level === 2)
    const farmerSet = trader('farmer').sets.find(set => set.level === 2)

    expect(shepherdSet).toBeDefined()
    expect(farmerSet).toBeDefined()
    expect(tradeSetSelectionNote(shepherdSet!)).toBe(
      'При получении уровня житель получает до 2 подходящих сделок. '
      + 'Учитываются только варианты с пометкой его биома; '
      + 'варианты для остальных групп биомов не конкурируют с ними.'
    )
    expect(tradeSetSelectionNote(farmerSet!)).not.toContain('из 3 вариантов')
  })

  it('preserves the three random wandering-trader pools', () => {
    const wandering = trader('wandering-trader')
    expect(wandering.sets.map(set => ({
      anchor: set.anchor,
      amount: set.amount,
      poolSize: set.poolSize,
      offers: set.offers.length
    }))).toEqual([
      {
        anchor: 'refugees',
        amount: 2,
        poolSize: 6,
        offers: 6
      },
      {
        anchor: 'music-discs',
        amount: 3,
        poolSize: 21,
        offers: 21
      },
      {
        anchor: 'maps',
        amount: 3,
        poolSize: 6,
        offers: 6
      }
    ])
  })

  it('gives every offer an exact stack identity and stable destination', () => {
    const ids = new Set<string>()
    const destinations = new Set<string>()

    for (const candidate of offers) {
      expect(candidate.costs.length).toBeGreaterThan(0)
      expect(candidate.result.stack.carrier).toMatch(/^[a-z0-9_.-]+:/)
      expect(candidate.to).toBe(
        `/traders/${candidate.traderSlug}#${candidate.anchor}`
      )
      expect(ids.has(candidate.id), candidate.id).toBe(false)
      expect(destinations.has(candidate.to), candidate.to).toBe(false)
      ids.add(candidate.id)
      destinations.add(candidate.to)
    }
  })
})

function trader(slug: string): TraderView {
  const result = catalog.traders.find(candidate => candidate.slug === slug)
  if (!result) throw new Error(`Missing trader ${slug}`)
  return result
}

function offer(id: string): TradeOfferView {
  const result = offers.find(candidate => candidate.id === id)
  if (!result) throw new Error(`Missing trade ${id}`)
  return result
}
