import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { WikiCatalog } from '../app/types/wiki'
import {
  collectLootOutputs,
  loadLootTables
} from '../scripts/lib/acquisition/lootTraversal'
import {
  acquisitionRoots,
  readAcquisitionGuides
} from '../scripts/lib/acquisition/sourceGuides'

const rootDir = resolve(import.meta.dirname, '..')
const guides = readAcquisitionGuides(
  resolve(rootDir, 'wiki-data/source-guides.ru.json')
)
const roots = acquisitionRoots(guides)
const loaded = loadLootTables(resolve(rootDir, 'pack/data'))
const catalog = JSON.parse(
  readFileSync(resolve(rootDir, 'generated/catalog.json'), 'utf8')
) as WikiCatalog

describe('confirmed acquisition roots', () => {
  it('does not expose helper, abandoned prototype or dormant village tables', () => {
    const tableIds = roots.map(root => root.tableId)

    expect(tableIds.some(id => id.includes('/equipment/'))).toBe(false)
    expect(tableIds.some(id => id.includes('/adventure_old/'))).toBe(false)
    expect(tableIds).not.toContain('minecraft:archaeology/statues')
    expect(tableIds.some(id => id.includes('chests/village/'))).toBe(false)
    expect(tableIds).toContain('minecraft:archaeology/village_plains')
  })

  it('finds exact elder-guardian treasures without the impossible open-water branch', () => {
    const outputs = collectLootOutputs(
      loaded.tables,
      'minecraft:entities/elder_guardian',
      'mob'
    )
    const models = outputs.map(output => (
      output.seed.components['minecraft:item_model']
    ))
    const fragment = outputs.find(output => (
      output.seed.carrier === 'minecraft:turtle_scute'
      && output.seed.components['minecraft:rarity'] === 'rare'
    ))
    const fishingTableOutputs = outputs.filter(output => (
      output.visitedTableIds.includes('minecraft:gameplay/fishing')
    ))

    expect(models).toContain('minecraft:opal')
    expect(fragment?.quantity).toEqual({ min: 1, max: 3 })
    expect(fishingTableOutputs.length).toBeGreaterThan(0)
    expect(fishingTableOutputs.every(output => (
      output.channel === 'fishing_table'
      && output.rolls.min === 3
      && output.rolls.max === 3
    ))).toBe(true)
    expect(outputs.some(output => (
      output.visitedTableIds.includes('minecraft:gameplay/fishing/treasure')
    ))).toBe(false)
  })

  it('presents the boss fishing-table rolls as boss loot, not player fishing', () => {
    const guardian = catalog.acquisition.mobs.find(mob => (
      mob.id === 'minecraft:elder_guardian'
    ))
    const methods = catalog.acquisition.methods.filter(method => (
      guardian?.methodIds.includes(method.id)
    ))
    const fishingTableMethods = methods.filter(method => (
      method.channel === 'fishing_table'
    ))

    expect(fishingTableMethods.length).toBeGreaterThan(0)
    expect(fishingTableMethods.every(method => (
      method.rolls?.min === 3 && method.rolls.max === 3
    ))).toBe(true)
    expect(methods.some(method => method.channel === 'fishing')).toBe(false)
  })

  it('reaches nested archaeology rewards only through registered places', () => {
    const trailRoot = roots.find(root => (
      root.tableId === 'minecraft:archaeology/trail_ruins_rare'
    ))
    expect(trailRoot?.sourceId).toBe('trail-ruins')

    const outputs = collectLootOutputs(
      loaded.tables,
      'minecraft:archaeology/trail_ruins_rare',
      'archaeology'
    )
    expect(outputs.some(output => (
      output.visitedTableIds.includes('minecraft:archaeology/statues')
    ))).toBe(true)
    expect(outputs.some(output => (
      output.visitedTableIds.includes('minecraft:kleis_items/amber')
    ))).toBe(true)
  })
})
