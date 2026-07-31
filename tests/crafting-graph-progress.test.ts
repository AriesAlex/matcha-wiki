import { describe, expect, it } from 'vitest'
import type {
  CraftingGraphEdge,
  CraftingGraphItemNode,
  CraftingGraphModel,
  CraftingGraphRecipeNode
} from '../app/types/craftingGraph'
import type {
  CraftingPlanNode,
  CraftingRecipeView,
  CraftingTargetView
} from '../app/types/crafting'
import {
  craftingGraphActivity,
  craftingItemProgress
} from '../app/utils/craftingGraphProgress'

describe('crafting graph progress', () => {
  it('dims only exclusive descendants while keeping a shared item active', () => {
    const graph = graphModel([
      itemNode('root', 'item:root', 1),
      itemNode('complete', 'item:complete', 1),
      itemNode('open', 'item:open', 1),
      recipeNode('complete-recipe'),
      recipeNode('open-recipe'),
      itemNode('shared', 'item:shared', 1),
      itemNode('exclusive', 'item:exclusive', 1)
    ], [
      edge('root', 'complete'),
      edge('root', 'open'),
      edge('complete', 'complete-recipe'),
      edge('complete-recipe', 'shared'),
      edge('complete-recipe', 'exclusive'),
      edge('open', 'open-recipe'),
      edge('open-recipe', 'shared')
    ])

    expect(craftingGraphActivity(graph, new Set(['complete']))).toEqual({
      activeNodeIds: [
        'root',
        'complete',
        'open',
        'open-recipe',
        'shared'
      ],
      inactiveNodeIds: ['complete-recipe', 'exclusive'],
      activeEdgeIds: [
        'root-complete',
        'root-open',
        'open-open-recipe',
        'open-recipe-shared'
      ],
      inactiveEdgeIds: [
        'complete-complete-recipe',
        'complete-recipe-shared',
        'complete-recipe-exclusive'
      ]
    })
  })

  it('keeps cycles finite and treats broken references as inactive', () => {
    const graph = graphModel([
      itemNode('root', 'item:root', 1),
      recipeNode('recipe'),
      itemNode('detached', 'item:detached', 1)
    ], [
      edge('root', 'recipe'),
      edge('recipe', 'root'),
      edge('recipe', 'missing'),
      edge('missing', 'detached')
    ])

    expect(craftingGraphActivity(graph, new Set(['recipe', 'missing'])))
      .toEqual({
        activeNodeIds: ['root', 'recipe'],
        inactiveNodeIds: ['detached'],
        activeEdgeIds: ['root-recipe', 'recipe-root'],
        inactiveEdgeIds: ['recipe-missing', 'missing-detached']
      })
  })

  it('returns a fully inactive graph when the root is missing', () => {
    const graph = {
      ...graphModel([
        itemNode('item', 'item:detached', 1)
      ], []),
      rootId: 'missing'
    }

    expect(craftingGraphActivity(graph, new Set())).toEqual({
      activeNodeIds: [],
      inactiveNodeIds: ['item'],
      activeEdgeIds: [],
      inactiveEdgeIds: []
    })
  })

  it('stores only the checked item and leaves shared requirements alone', () => {
    const graph = graphModel([
      itemNode('sword', 'item:warding-sword', 1),
      recipeNode('forge'),
      itemNode('iron', 'resource:iron', 8)
    ], [
      edge('sword', 'forge'),
      edge('forge', 'iron')
    ])

    expect(craftingItemProgress(graph, 'sword')).toEqual({
      targetKey: 'item:warding-sword',
      required: 1
    })
  })

  it('ignores recipes and unknown node IDs', () => {
    const graph = graphModel([
      itemNode('root', 'item:root', 1),
      recipeNode('recipe')
    ], [edge('root', 'recipe')])

    expect(craftingItemProgress(graph, 'recipe')).toBeUndefined()
    expect(craftingItemProgress(graph, 'missing')).toBeUndefined()
  })
})

function graphModel(
  nodes: Array<CraftingGraphItemNode | CraftingGraphRecipeNode>,
  edges: CraftingGraphEdge[]
): CraftingGraphModel {
  return {
    rootId: nodes[0]?.instanceId ?? '',
    nodes,
    edges
  }
}

function itemNode(
  instanceId: string,
  targetKey: string,
  required: number
): CraftingGraphItemNode {
  const planNode = plan(instanceId, targetKey, required)
  return {
    instanceId,
    kind: 'item',
    planNode,
    title: planNode.target.title,
    detail: '',
    status: 'craft',
    path: [],
    cyclic: false,
    target: planNode.target,
    demand: {
      required,
      owned: 0,
      missing: required,
      batches: 1,
      produced: 1,
      surplus: 0
    },
    occurrences: 1,
    recipeIds: []
  }
}

function recipeNode(instanceId: string): CraftingGraphRecipeNode {
  const planNode = plan(instanceId, `item:${instanceId}`, 1)
  const recipe = recipeView(instanceId, planNode.target.key)
  return {
    instanceId,
    kind: 'recipe',
    planNode,
    title: 'Верстак',
    detail: '',
    status: 'craft',
    path: [],
    cyclic: false,
    targetKey: planNode.target.key,
    recipe,
    batches: 1,
    resultCount: 1,
    producedCount: 1,
    surplus: 0
  }
}

function edge(from: string, to: string): CraftingGraphEdge {
  return {
    id: `${from}-${to}`,
    from,
    to,
    kind: 'requirement',
    detail: '',
    status: 'craft',
    cyclic: false
  }
}

function plan(
  id: string,
  key: string,
  requiredCount: number
): CraftingPlanNode {
  const target: CraftingTargetView = {
    key,
    kind: key.startsWith('item:') ? 'item' : 'resource',
    resourceId: key,
    title: key
  }
  return {
    id,
    target,
    requiredCount,
    ownedCount: 0,
    missingCount: requiredCount,
    state: 'craft',
    recipeOptions: [],
    batches: 1,
    resultCount: 1,
    requirements: []
  }
}

function recipeView(id: string, targetKey: string): CraftingRecipeView {
  return {
    id,
    origin: 'pack',
    type: 'minecraft:crafting_shaped',
    station: 'Верстак',
    targetKey,
    resultCount: 1,
    ingredients: [],
    requirements: []
  }
}
