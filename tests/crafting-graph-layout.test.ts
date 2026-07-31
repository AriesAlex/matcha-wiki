import { describe, expect, it } from 'vitest'
import type {
  CraftingPlanNode,
  CraftingRecipeView,
  CraftingTargetView
} from '../app/types/crafting'
import {
  CRAFTING_GRAPH_ALTERNATIVES_BOTTOM_PADDING,
  CRAFTING_GRAPH_ALTERNATIVES_HEADER_HEIGHT,
  CRAFTING_GRAPH_ALTERNATIVES_MORE_HEIGHT,
  CRAFTING_GRAPH_ALTERNATIVE_OPTION_HEIGHT,
  CRAFTING_GRAPH_ALTERNATIVE_SEPARATOR_HEIGHT,
  CRAFTING_GRAPH_ITEM_SIZE,
  CRAFTING_GRAPH_RECIPE_GRID_SIZE,
  craftingGraphNodeSize,
  layoutCraftingGraph
} from '../app/utils/craftingGraphLayout'
import {
  CRAFTING_GRAPH_VISIBLE_ALTERNATIVE_LIMIT,
  hiddenCraftingAlternativeCount
} from '../app/utils/craftingGraphAlternatives'
import { buildCraftingGraph } from '../app/utils/craftingGraphModel'

describe('crafting graph layout', () => {
  it('places the root on top and applies the player-facing node sizes', () => {
    const child = obtainNode(target('minecraft:stick', 'Палка'))
    const root = craftNode(target('matcha:tool', 'Инструмент'), child)
    const view = layoutCraftingGraph(buildCraftingGraph(root))
    const rootView = view.nodes.find(node => node.instanceId === view.rootId)
    const recipeView = view.nodes.find(node => node.node.kind === 'recipe')

    expect(rootView).toMatchObject({
      x: expect.any(Number),
      y: 32,
      width: CRAFTING_GRAPH_ITEM_SIZE.width,
      height: CRAFTING_GRAPH_ITEM_SIZE.height,
      depth: 0
    })
    expect(recipeView).toMatchObject({
      width: CRAFTING_GRAPH_RECIPE_GRID_SIZE.width,
      height: CRAFTING_GRAPH_RECIPE_GRID_SIZE.height,
      depth: 1
    })
    expect(recipeView?.height).toBeLessThan(240)
    expect(view.nodes.every(node => node.y >= (rootView?.y ?? 0))).toBe(true)
    expect(view.nodes.every(node => (
      node.width === craftingGraphNodeSize(node.node).width
      && node.height === craftingGraphNodeSize(node.node).height
    ))).toBe(true)
  })

  it('keeps short source cards compact and grows only for useful copy', () => {
    const shortTarget: CraftingTargetView = {
      ...target('matcha:short-source', 'Короткий источник'),
      sources: [{
        id: 'nether-fortress',
        kind: 'location',
        title: 'Адская крепость',
        detail: 'Ищите сундуки внутри переходов.',
        path: '/locations/nether-fortress'
      }]
    }
    const longTarget: CraftingTargetView = {
      ...target('matcha:long-source', 'Подробный источник'),
      sources: [{
        id: 'bastion-remnant',
        kind: 'location',
        title: 'Развалины бастиона с сокровищницей',
        detail: 'Проверяйте перекрёстки и закрытые коридоры. Сундук находится внутри проходов и может быть спрятан за стеной.',
        path: '/locations/bastion-remnant'
      }]
    }
    const shortSource = buildCraftingGraph(obtainNode(shortTarget)).nodes
      .find(node => node.kind === 'source')
    const longSource = buildCraftingGraph(obtainNode(longTarget)).nodes
      .find(node => node.kind === 'source')

    expect(shortSource).toBeDefined()
    expect(longSource).toBeDefined()
    if (!shortSource || !longSource) return

    const shortSize = craftingGraphNodeSize(shortSource)
    const longSize = craftingGraphNodeSize(longSource)
    expect(shortSize.height).toBeLessThan(174)
    expect(longSize.height).toBeGreaterThan(shortSize.height)
  })

  it('reserves the full dynamic height of an OR group without overlap', () => {
    const options = Array.from(
      { length: 8 },
      (_, index) => target(`matcha:wood_${index + 1}`, `Древесина ${index + 1}`)
    )
    const selected = obtainNode(options[0]!)
    const graph = buildCraftingGraph(craftNode(
      target('matcha:tool', 'Инструмент'),
      selected,
      'matcha:tool',
      options
    ))
    const view = layoutCraftingGraph(graph)
    const alternatives = view.nodes.find(node => node.node.kind === 'alternatives')
    const selectedItem = view.nodes.find(node => (
      node.node.kind === 'item'
      && node.node.target.key === selected.target.key
    ))

    expect(alternatives?.node.kind).toBe('alternatives')
    if (!alternatives || alternatives.node.kind !== 'alternatives') return

    expect(alternatives.node.options).toHaveLength(8)
    expect(alternatives.height).toBe(craftingGraphNodeSize(alternatives.node).height)
    expect(selectedItem?.y).toBeGreaterThanOrEqual(
      alternatives.y + alternatives.height
    )
    expect(hasAnyOverlap(view.nodes)).toBe(false)
  })

  it('summarizes very long OR groups instead of stretching the whole map', () => {
    const options = Array.from(
      { length: 20 },
      (_, index) => target(`matcha:disc_${index + 1}`, `Пластинка ${index + 1}`)
    )
    const graph = buildCraftingGraph(craftNode(
      target('matcha:fragment', 'Осколок пластинки'),
      obtainNode(options[0]!),
      'matcha:fragment',
      options
    ))
    const alternatives = graph.nodes.find(node => node.kind === 'alternatives')

    expect(alternatives?.kind).toBe('alternatives')
    if (!alternatives || alternatives.kind !== 'alternatives') return

    expect(hiddenCraftingAlternativeCount(alternatives)).toBe(12)
    expect(craftingGraphNodeSize(alternatives).height).toBe(
      CRAFTING_GRAPH_ALTERNATIVES_HEADER_HEIGHT
      + CRAFTING_GRAPH_VISIBLE_ALTERNATIVE_LIMIT
      * CRAFTING_GRAPH_ALTERNATIVE_OPTION_HEIGHT
      + (CRAFTING_GRAPH_VISIBLE_ALTERNATIVE_LIMIT - 1)
      * CRAFTING_GRAPH_ALTERNATIVE_SEPARATOR_HEIGHT
      + CRAFTING_GRAPH_ALTERNATIVES_MORE_HEIGHT
      + CRAFTING_GRAPH_ALTERNATIVES_BOTTOM_PADDING
    )
  })

  it('returns bounded nodes and deterministic SVG paths for every edge', () => {
    const child = obtainNode(target('minecraft:stick', 'Палка'))
    const graph = buildCraftingGraph(craftNode(
      target('matcha:tool', 'Инструмент'),
      child
    ))
    const first = layoutCraftingGraph(graph)
    const second = layoutCraftingGraph(graph)

    expect(first.edges).toHaveLength(graph.edges.length)
    expect(first.edges.every(edge => /^M [-\d.]+ [-\d.]+ C /.test(edge.path)))
      .toBe(true)
    expect(first.edges.map(edge => edge.path))
      .toEqual(second.edges.map(edge => edge.path))
    expect(first.nodes.every(node => (
      node.x >= first.bounds.x
      && node.y >= first.bounds.y
      && node.x + node.width <= first.bounds.width
      && node.y + node.height <= first.bounds.height
    ))).toBe(true)
  })

  it('places shared items below every non-cyclic parent', () => {
    const sharedTarget = target('minecraft:copper_ingot', 'Медный слиток')
    const directShared = obtainNode(sharedTarget)
    const nestedShared = obtainNode(sharedTarget)
    const component = craftNode(
      target('matcha:component', 'Компонент'),
      nestedShared,
      'matcha:component'
    )
    const root = craftNodeWithChildren(
      target('matcha:assembly', 'Сборка'),
      [directShared, component],
      'matcha:assembly'
    )
    const view = layoutCraftingGraph(buildCraftingGraph(root))
    const nodesById = new Map(view.nodes.map(node => [node.instanceId, node]))

    expect(view.edges.filter(edge => !edge.cyclic).every((edge) => {
      const from = nodesById.get(edge.from)
      const to = nodesById.get(edge.to)
      return Boolean(from && to && to.depth > from.depth)
    })).toBe(true)
  })

  it('keeps cycle back-edges finite and routed outside normal layers', () => {
    const targetA = target('matcha:a', 'Предмет А')
    const targetB = target('matcha:b', 'Предмет Б')
    const cycleBack = {
      ...obtainNode(targetA),
      state: 'cycle' as const
    }
    const nodeB = craftNode(targetB, cycleBack, 'matcha:b')
    const root = craftNode(targetA, nodeB, 'matcha:a')
    const view = layoutCraftingGraph(buildCraftingGraph(root))
    const cyclic = view.edges.find(edge => edge.cyclic)

    expect(cyclic).toBeDefined()
    expect(cyclic?.path).toMatch(/^M [-\d.]+ [-\d.]+ C /)
    expect(view.nodes).toHaveLength(4)
    expect(Math.max(...view.nodes.map(node => node.depth))).toBe(3)
    expect(Number.isFinite(view.bounds.width)).toBe(true)
    expect(Number.isFinite(view.bounds.height)).toBe(true)
  })
})

function craftNode(
  currentTarget: CraftingTargetView,
  child: CraftingPlanNode,
  recipeId = 'matcha:tool',
  options: CraftingTargetView[] = [child.target]
): CraftingPlanNode {
  const ingredient = {
    ids: options.map(option => option.resourceId),
    label: child.target.title,
    icons: options.flatMap(option => option.icon ? [option.icon] : [])
  }
  const recipe: CraftingRecipeView = {
    id: recipeId,
    origin: 'pack',
    type: 'minecraft:crafting_shaped',
    station: 'Инвентарь',
    targetKey: currentTarget.key,
    resultCount: 1,
    ingredients: [ingredient],
    requirements: [{
      id: 'ingredient',
      role: 'ingredient',
      count: 1,
      ingredient
    }]
  }

  return {
    id: `plan|${currentTarget.key}`,
    target: currentTarget,
    requiredCount: 1,
    ownedCount: 0,
    missingCount: 1,
    state: 'craft',
    recipeOptions: [recipe],
    recipe,
    batches: 1,
    resultCount: 1,
    requirements: [{
      id: `${currentTarget.key}|${recipe.id}|ingredient`,
      role: 'ingredient',
      count: 1,
      label: child.target.title,
      options,
      selectedOptionKey: child.target.key,
      node: child
    }]
  }
}

function craftNodeWithChildren(
  currentTarget: CraftingTargetView,
  children: CraftingPlanNode[],
  recipeId: string
): CraftingPlanNode {
  const ingredients = children.map(child => ({
    ids: [child.target.resourceId],
    label: child.target.title,
    icons: child.target.icon ? [child.target.icon] : []
  }))
  const recipe: CraftingRecipeView = {
    id: recipeId,
    origin: 'pack',
    type: 'minecraft:crafting_shaped',
    station: 'Верстак',
    targetKey: currentTarget.key,
    resultCount: 1,
    ingredients,
    requirements: ingredients.map((ingredient, index) => ({
      id: `ingredient-${index}`,
      role: 'ingredient',
      count: 1,
      ingredient
    }))
  }

  return {
    id: `plan|${currentTarget.key}`,
    target: currentTarget,
    requiredCount: 1,
    ownedCount: 0,
    missingCount: 1,
    state: 'craft',
    recipeOptions: [recipe],
    recipe,
    batches: 1,
    resultCount: 1,
    requirements: children.map((child, index) => ({
      id: `${currentTarget.key}|${recipe.id}|ingredient-${index}`,
      role: 'ingredient',
      count: 1,
      label: child.target.title,
      options: [child.target],
      selectedOptionKey: child.target.key,
      node: child
    }))
  }
}

function obtainNode(currentTarget: CraftingTargetView): CraftingPlanNode {
  return {
    id: `plan|${currentTarget.key}`,
    target: currentTarget,
    requiredCount: 1,
    ownedCount: 0,
    missingCount: 1,
    state: 'obtain',
    recipeOptions: [],
    batches: 0,
    resultCount: 1,
    requirements: []
  }
}

function target(resourceId: string, title: string): CraftingTargetView {
  return {
    key: `resource:${resourceId}`,
    kind: 'resource',
    resourceId,
    title
  }
}

function hasAnyOverlap(
  nodes: ReturnType<typeof layoutCraftingGraph>['nodes']
): boolean {
  return nodes.some((left, index) => nodes.slice(index + 1).some(right => !(
    left.x + left.width <= right.x
    || right.x + right.width <= left.x
    || left.y + left.height <= right.y
    || right.y + right.height <= left.y
  )))
}
