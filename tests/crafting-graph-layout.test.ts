import { describe, expect, it } from 'vitest'
import type {
  CraftingPlanNode,
  CraftingRecipeView,
  CraftingTargetView
} from '../app/types/crafting'
import {
  CRAFTING_GRAPH_CONTEXT_SIZE,
  CRAFTING_GRAPH_ITEM_SIZE,
  CRAFTING_GRAPH_METHOD_SIZE,
  layoutCraftingGraph
} from '../app/utils/craftingGraphLayout'
import { buildCraftingGraph } from '../app/utils/craftingGraphModel'

describe('crafting graph layout', () => {
  it('places the root on top and uses the fixed dimensions per node kind', () => {
    const child = obtainNode(target('minecraft:stick', 'Палка'))
    const root = craftNode(
      target('matcha:tool', 'Инструмент'),
      child
    )
    const view = layoutCraftingGraph(buildCraftingGraph(root))
    const rootView = view.nodes.find(node => node.instanceId === view.rootId)

    expect(rootView).toMatchObject({
      x: expect.any(Number),
      y: 32,
      width: CRAFTING_GRAPH_ITEM_SIZE.width,
      height: CRAFTING_GRAPH_ITEM_SIZE.height,
      depth: 0
    })
    expect(view.nodes.every(node => node.y >= (rootView?.y ?? 0))).toBe(true)
    expect(view.nodes.find(node => node.kind === 'method')).toMatchObject({
      width: CRAFTING_GRAPH_METHOD_SIZE.width,
      height: CRAFTING_GRAPH_METHOD_SIZE.height,
      depth: 1
    })
    expect(view.nodes.filter(node => node.kind === 'context').every(node => (
      node.width === CRAFTING_GRAPH_CONTEXT_SIZE.width
      && node.height === CRAFTING_GRAPH_CONTEXT_SIZE.height
    ))).toBe(true)
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
  recipeId = 'matcha:tool'
): CraftingPlanNode {
  const recipe: CraftingRecipeView = {
    id: recipeId,
    origin: 'pack',
    type: 'minecraft:crafting_shaped',
    station: 'Инвентарь',
    targetKey: currentTarget.key,
    resultCount: 1,
    requirements: [{
      id: 'ingredient',
      role: 'ingredient',
      count: 1,
      ingredient: {
        ids: [child.target.resourceId],
        label: child.target.title,
        icons: []
      }
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
      options: [child.target],
      selectedOptionKey: child.target.key,
      node: child
    }]
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
