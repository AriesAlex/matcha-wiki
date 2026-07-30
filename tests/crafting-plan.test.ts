import { describe, expect, it } from 'vitest'
import type {
  CraftingIndex,
  CraftingPlanSelections,
  CraftingRecipeView,
  CraftingTargetView
} from '../app/types/crafting'
import type {
  IngredientView,
  RecipeRequirementView,
  RecipeView,
  WikiCatalog
} from '../app/types/wiki'
import {
  buildCraftingPlan,
  recipeChoiceKey
} from '../app/utils/craftingPlan'

const emptySelections: CraftingPlanSelections = {
  modeByTarget: {},
  recipeByTarget: {},
  optionByRequirement: {}
}

const toolRecipe = recipe('matcha:tool', 'matcha:tool', 1, [
  requirement('metal', ingredient(['minecraft:iron_ingot'], 'Железный слиток'), 2),
  requirement('handle', ingredient(['minecraft:stick'], 'Палка'), 1)
])
const blastIron = recipe('minecraft:iron_from_blasting', 'minecraft:iron_ingot', 1, [
  requirement('ore', ingredient(['minecraft:raw_iron'], 'Рудное железо'), 1)
], 'minecraft:blasting', 'Плавильная печь')
const recyclingIron = recipe('matcha:recycling_iron', 'minecraft:iron_ingot', 1, [
  requirement('same', ingredient(['minecraft:iron_ingot'], 'Железный слиток'), 1)
])
const sticks = recipe('minecraft:sticks', 'minecraft:stick', 4, [
  requirement(
    'planks',
    ingredient(
      ['minecraft:oak_planks', 'minecraft:spruce_planks'],
      'Доски'
    ),
    2
  )
])

const catalog: WikiCatalog = {
  generatedAt: '',
  pack: {
    title: 'Test',
    version: 'test',
    minecraft: 'test'
  },
  stats: {
    files: 0,
    items: 0,
    customItems: 0,
    recipes: 4,
    advancements: 0
  },
  ingredientGlossary: {
    'minecraft:iron_ingot': { id: 'minecraft:iron_ingot', name: 'Железный слиток' },
    'minecraft:raw_iron': {
      id: 'minecraft:raw_iron',
      name: 'Рудное железо',
      obtainHint: 'Добывается железной киркой в каменных слоях.'
    },
    'minecraft:stick': { id: 'minecraft:stick', name: 'Палка' },
    'minecraft:oak_planks': { id: 'minecraft:oak_planks', name: 'Дубовые доски' },
    'minecraft:spruce_planks': { id: 'minecraft:spruce_planks', name: 'Еловые доски' }
  },
  items: [],
  recipes: [toolRecipe, blastIron, recyclingIron, sticks],
  advancements: []
}

const index: CraftingIndex = {
  catalog,
  recipesByTarget: new Map([
    ['resource:matcha:tool', [toolRecipe]],
    ['resource:minecraft:iron_ingot', [recyclingIron, blastIron]],
    ['resource:minecraft:stick', [sticks]]
  ]),
  preferredRecipeByTarget: new Map()
}
const target: CraftingTargetView = {
  key: 'resource:matcha:tool',
  kind: 'resource',
  resourceId: 'matcha:tool',
  title: 'Инструмент'
}

describe('crafting plan', () => {
  it('uses owned counts once and expands only the missing quantities', () => {
    const plan = buildCraftingPlan(
      index,
      target,
      1,
      emptySelections,
      { 'resource:minecraft:iron_ingot': 1 }
    )

    const iron = plan.requirements[0]?.node
    const stick = plan.requirements[1]?.node

    expect(iron).toMatchObject({
      requiredCount: 2,
      ownedCount: 1,
      missingCount: 1,
      state: 'craft',
      recipe: { id: 'minecraft:iron_from_blasting' }
    })
    expect(iron?.requirements[0]?.node).toMatchObject({
      requiredCount: 1,
      state: 'obtain',
      target: {
        title: 'Рудное железо',
        obtainHint: 'Добывается железной киркой в каменных слоях.'
      }
    })
    expect(stick).toMatchObject({
      requiredCount: 1,
      batches: 1,
      resultCount: 4
    })
  })

  it('persists a deliberate alternative ingredient choice', () => {
    const requirementKey = recipeChoiceKey(
      {
        key: 'resource:minecraft:stick',
        kind: 'resource',
        resourceId: 'minecraft:stick',
        title: 'Палка'
      },
      sticks.id,
      'planks'
    )
    const plan = buildCraftingPlan(
      index,
      target,
      1,
      {
        ...emptySelections,
        optionByRequirement: {
          [requirementKey]: 'resource:minecraft:spruce_planks'
        }
      },
      {}
    )

    const planks = plan.requirements[1]?.node.requirements[0]
    expect(planks?.selectedOptionKey).toBe('resource:minecraft:spruce_planks')
    expect(planks?.node.target.title).toBe('Еловые доски')
  })

  it('reports a selected circular recipe instead of recursing forever', () => {
    const plan = buildCraftingPlan(
      index,
      target,
      1,
      {
        ...emptySelections,
        recipeByTarget: {
          'resource:minecraft:iron_ingot': recyclingIron.id
        }
      },
      {}
    )

    expect(plan.requirements[0]?.node.requirements[0]?.node.state).toBe('cycle')
  })
})

function ingredient(ids: string[], label: string): IngredientView {
  return {
    ids,
    label,
    icons: []
  }
}

function requirement(
  id: string,
  value: IngredientView,
  count: number
): RecipeRequirementView {
  return {
    id,
    role: 'ingredient',
    count,
    ingredient: value
  }
}

function recipe(
  id: string,
  resultId: string,
  resultCount: number,
  requirements: RecipeRequirementView[],
  type = 'minecraft:crafting_shaped',
  station = 'Верстак'
): RecipeView & CraftingRecipeView {
  const [namespace, ...pathParts] = id.split(':')
  return {
    id,
    origin: 'pack',
    namespace: namespace ?? 'minecraft',
    path: pathParts.join(':'),
    sourcePath: `${id}.json`,
    type,
    station,
    targetKey: `resource:${resultId}`,
    resultCount,
    ingredients: requirements.map(entry => entry.ingredient),
    requirements,
    result: {
      carrier: resultId,
      count: resultCount,
      name: resultId
    }
  }
}
