import { describe, expect, it } from 'vitest'
import type { CraftingTargetView } from '../app/types/crafting'
import type { CraftingGraphDemand } from '../app/types/craftingGraph'
import { itemDetail } from '../app/utils/craftingGraph/presentation'

const demand: CraftingGraphDemand = {
  required: 1,
  owned: 0,
  missing: 1,
  batches: 1,
  produced: 1,
  surplus: 0
}

const target: CraftingTargetView = {
  key: 'resource:minecraft:diamond',
  kind: 'resource',
  resourceId: 'minecraft:diamond',
  title: 'Алмаз'
}

describe('crafting graph item presentation', () => {
  it('keeps quantities in the badge instead of repeating them in prose', () => {
    expect(itemDetail(demand, 'craft', target)).toBe('Можно изготовить.')
    expect(itemDetail(demand, 'obtain', target)).toBe(
      'Получить одним из способов ниже.'
    )
  })

  it('keeps concrete obtaining hints more useful than a generic action', () => {
    expect(itemDetail(demand, 'obtain', {
      ...target,
      obtainHint: 'Можно выплавить.'
    })).toBe('Можно выплавить.')
  })

  it('describes partially completed work without duplicating the count', () => {
    const partial = { ...demand, required: 4, owned: 2, missing: 2 }

    expect(itemDetail(partial, 'craft', target)).toBe('Осталось изготовить.')
    expect(itemDetail(partial, 'obtain', target)).toBe('Осталось получить.')
  })
})
