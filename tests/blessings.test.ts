import { describe, expect, it } from 'vitest'
import catalogSource from '../generated/catalog.json'
import craftingPlannerSource from '../generated/crafting-planner.json'
import type { CraftingPlannerSupplement } from '../app/types/crafting'
import type { WikiCatalog } from '../app/types/wiki'
import { buildBlessingRows } from '../app/utils/blessings'
import { buildCraftingGraph } from '../app/utils/craftingGraphModel'
import {
  createCraftingIndex,
  targetForStack
} from '../app/utils/craftingIndex'
import { buildCraftingPlan } from '../app/utils/craftingPlan'

const catalog = catalogSource as WikiCatalog
const craftingPlanner = craftingPlannerSource as CraftingPlannerSupplement
const blessings = buildBlessingRows(catalog)

describe('blessing table data', () => {
  it('builds one linked row for every blessing recipe', () => {
    expect(blessings).toHaveLength(22)
    expect(new Set(blessings.map(blessing => blessing.id)).size).toBe(22)
    expect(blessings.every(blessing => (
      blessing.icon
      && blessing.recipePath === `/recipes/${blessing.id.replace(':', '/')}`
      && blessing.enchantments.length > 0
    ))).toBe(true)
  })

  it('omits the common enchanted book from the material list', () => {
    expect(blessings.flatMap(blessing => blessing.materials).every(requirement => (
      !requirement.ingredient.ids.includes('minecraft:enchanted_book')
    ))).toBe(true)
  })

  it('builds the selected recipe path for every blessing page', () => {
    const index = createCraftingIndex(catalog, craftingPlanner)
    const failures = blessings.flatMap((blessing) => {
      const recipe = catalog.recipes.find(entry => entry.id === blessing.id)
      const target = recipe?.result
        ? targetForStack(catalog, recipe.result)
        : undefined
      if (!recipe || !target) return [`${blessing.id}: result target`]

      const plan = buildCraftingPlan(
        index,
        target,
        1,
        {
          recipeByTarget: { [target.key]: recipe.id },
          optionByRequirement: {}
        },
        {}
      )
      const graph = buildCraftingGraph(plan)

      return plan.recipe?.id === recipe.id
        && plan.requirements.length > 0
        && graph.nodes.length > 1
        ? []
        : [`${blessing.id}: incomplete graph`]
    })

    expect(failures).toEqual([])
  })

  it('uses current catalog names, quantities and localized enchantments', () => {
    expect(blessings.find(blessing => blessing.id === 'blessings:channeling_smite'))
      .toMatchObject({
        title: 'Благословение: Молитва Богу-Царю',
        materials: [
          { count: 4, ingredient: { label: 'Прах эстуса' } },
          { count: 3, ingredient: { label: 'Слиток серебра' } },
          { count: 1, ingredient: { label: 'Железный слиток' } }
        ],
        enchantments: [
          { label: 'Небесная кара III' },
          { label: 'Громовержец I' }
        ]
      })

    expect(blessings.find(blessing => blessing.id === 'blessings:warding')?.enchantments)
      .toEqual([
        expect.objectContaining({
          label: 'Оберег I',
          description: expect.stringContaining('12 блоков')
        }),
        expect.objectContaining({ label: 'Небесная кара II' })
      ])
  })
})
