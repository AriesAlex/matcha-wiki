import { describe, expect, it } from 'vitest'
import type { AcquisitionCatalog } from '../app/types/acquisition'
import {
  acquisitionMethodsForItemSlug,
  acquisitionMethodsForTarget,
  acquisitionTargetForSlug,
  acquisitionTargetPath
} from '../app/utils/acquisition'

const acquisition: AcquisitionCatalog = {
  targets: [{
    id: 'item:opal',
    slug: 'opal',
    title: 'Опал',
    itemSlug: 'opal',
    stack: {
      carrier: 'minecraft:fermented_spider_eye',
      count: 1,
      model: 'minecraft:opal',
      name: 'Опал'
    }
  }],
  methods: [{
    id: 'method:guardian-opal',
    sourceId: 'minecraft:elder_guardian',
    targetId: 'item:opal',
    kind: 'mob',
    context: 'Добыча после победы',
    action: 'Победите древнего стража.',
    quantity: { min: 1, max: 1 },
    notes: [],
    sourcePath: 'pack/data/minecraft/loot_table/entities/elder_guardian.json'
  }],
  locations: [],
  mobs: [{
    id: 'minecraft:elder_guardian',
    slug: 'elder-guardian',
    name: 'Древний страж',
    summary: 'Мини-босс океанского монумента.',
    where: 'Океанский монумент.',
    action: 'Победите древнего стража.',
    aliases: ['Морской Бог'],
    methodIds: ['method:guardian-opal']
  }]
}

describe('acquisition resolver', () => {
  it('links an item to a concrete source page without title matching', () => {
    expect(acquisitionMethodsForItemSlug(acquisition, 'opal')).toEqual([{
      method: acquisition.methods[0],
      target: acquisition.targets[0],
      source: acquisition.mobs[0],
      sourcePath: '/mobs/elder-guardian'
    }])
  })

  it('does not cross-link a different item with the same display title', () => {
    expect(acquisitionMethodsForItemSlug(acquisition, 'other-opal')).toEqual([])
  })

  it('keeps item-backed targets on their canonical item route', () => {
    expect(acquisitionTargetForSlug(acquisition, 'opal')).toBeUndefined()
    expect(acquisitionTargetPath(acquisition.targets[0])).toBe('/items/opal')
    expect(acquisitionMethodsForTarget(acquisition, 'item:opal')).toHaveLength(1)
  })
})
