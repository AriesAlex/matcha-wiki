import { describe, expect, it } from 'vitest'
import {
  collectLootOutputs
} from '../scripts/lib/acquisition/lootTraversal'
import type { JsonObject } from '../scripts/lib/acquisition/types'

describe('loot traversal', () => {
  it('keeps nested components, quantities and player-facing conditions', () => {
    const tables = new Map<string, JsonObject>([
      ['minecraft:entities/test', {
        pools: [{
          conditions: [{ condition: 'minecraft:killed_by_player' }],
          entries: [{
            type: 'minecraft:loot_table',
            value: 'minecraft:helpers/reward',
            conditions: [{
              condition: 'minecraft:random_chance_with_enchanted_bonus'
            }]
          }]
        }]
      }],
      ['minecraft:helpers/reward', {
        pools: [{
          entries: [{
            type: 'minecraft:item',
            name: 'minecraft:turtle_scute',
            functions: [
              {
                function: 'minecraft:set_components',
                components: {
                  'minecraft:rarity': 'rare'
                }
              },
              {
                function: 'minecraft:set_count',
                count: { min: 1, max: 3 }
              }
            ]
          }]
        }]
      }]
    ])

    const outputs = collectLootOutputs(
      tables,
      'minecraft:entities/test',
      'mob'
    )

    expect(outputs).toHaveLength(1)
    expect(outputs[0]).toMatchObject({
      seed: {
        carrier: 'minecraft:turtle_scute',
        components: {
          'minecraft:rarity': 'rare'
        }
      },
      quantity: { min: 1, max: 3 },
      visitedTableIds: [
        'minecraft:entities/test',
        'minecraft:helpers/reward'
      ]
    })
    expect(outputs[0]?.notes.map(note => note.text)).toEqual([
      'Выпадет, только если убьёте моба сами.',
      'Чары «Добыча» повышают шанс.'
    ])
  })

  it('does not turn unreachable fishing-hook branches into mob drops', () => {
    const tables = new Map<string, JsonObject>([
      ['minecraft:entities/test', {
        pools: [{
          entries: [{
            type: 'minecraft:loot_table',
            value: 'minecraft:gameplay/fishing'
          }]
        }]
      }],
      ['minecraft:gameplay/fishing', {
        pools: [{
          entries: [
            {
              type: 'minecraft:item',
              name: 'minecraft:cod'
            },
            {
              type: 'minecraft:item',
              name: 'minecraft:treasure',
              conditions: [{
                condition: 'minecraft:entity_properties',
                entity: 'this',
                predicate: {
                  'minecraft:type_specific/fishing_hook': {
                    in_open_water: true
                  }
                }
              }]
            }
          ]
        }]
      }]
    ])

    const outputs = collectLootOutputs(
      tables,
      'minecraft:entities/test',
      'mob'
    )

    expect(outputs.map(output => output.seed.carrier)).toEqual([
      'minecraft:cod'
    ])
  })

  it('keeps outer loot-table rolls separate from the item stack size', () => {
    const tables = new Map<string, JsonObject>([
      ['minecraft:entities/test', {
        pools: [{
          rolls: 3,
          entries: [{
            type: 'minecraft:loot_table',
            value: 'minecraft:gameplay/fishing'
          }]
        }]
      }],
      ['minecraft:gameplay/fishing', {
        pools: [{
          rolls: 1,
          entries: [{
            type: 'minecraft:item',
            name: 'minecraft:cod'
          }]
        }]
      }]
    ])

    const outputs = collectLootOutputs(
      tables,
      'minecraft:entities/test',
      'mob'
    )

    expect(outputs).toHaveLength(1)
    expect(outputs[0]).toMatchObject({
      quantity: { min: 1, max: 1 },
      rolls: { min: 3, max: 3 },
      channel: 'fishing_table'
    })

    const playerFishing = collectLootOutputs(
      tables,
      'minecraft:gameplay/fishing',
      'chest'
    )
    expect(playerFishing[0]).toMatchObject({
      rolls: { min: 1, max: 1 },
      channel: 'fishing'
    })
  })

  it('stops cyclic helper references instead of inventing a route', () => {
    const tables = new Map<string, JsonObject>([
      ['minecraft:chests/root', {
        pools: [{
          entries: [{
            type: 'minecraft:loot_table',
            value: 'minecraft:helpers/cycle'
          }]
        }]
      }],
      ['minecraft:helpers/cycle', {
        pools: [{
          entries: [{
            type: 'minecraft:loot_table',
            value: 'minecraft:chests/root'
          }]
        }]
      }]
    ])

    expect(collectLootOutputs(
      tables,
      'minecraft:chests/root',
      'chest'
    )).toEqual([])
  })
})
