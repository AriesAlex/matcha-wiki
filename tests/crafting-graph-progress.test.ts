import { describe, expect, it } from 'vitest'
import type {
  CraftingGraphEdge,
  CraftingGraphItemNode,
  CraftingGraphMethodNode,
  CraftingGraphModel
} from '../app/types/craftingGraph'
import type {
  CraftingPlanNode,
  CraftingTargetView
} from '../app/types/crafting'
import { craftingSubtreeProgress } from '../app/utils/craftingGraphProgress'

describe('crafting graph progress', () => {
  it('collects each item below the selected node once', () => {
    const graph = graphModel([
      itemNode('root', 'item:warding-sword', 1),
      methodNode('forge'),
      itemNode('silver', 'resource:silver', 3),
      itemNode('handle', 'resource:handle', 1)
    ], [
      edge('root', 'forge'),
      edge('forge', 'silver'),
      edge('forge', 'handle'),
      edge('handle', 'silver')
    ])

    expect(craftingSubtreeProgress(graph, 'root', {})).toEqual({
      targetKeys: [
        'item:warding-sword',
        'resource:handle',
        'resource:silver'
      ],
      ownedByTarget: {
        'item:warding-sword': 1,
        'resource:handle': 1,
        'resource:silver': 3
      },
      complete: false
    })
  })

  it('stops on cycles and reports a completed subtree', () => {
    const graph = graphModel([
      itemNode('root', 'item:a', 1),
      methodNode('method'),
      itemNode('child', 'item:b', 2)
    ], [
      edge('root', 'method'),
      edge('method', 'child'),
      edge('child', 'root')
    ])

    expect(craftingSubtreeProgress(graph, 'root', {
      'item:a': 1,
      'item:b': 2
    }).complete).toBe(true)
  })

  it('returns an empty incomplete selection for an unknown node', () => {
    expect(craftingSubtreeProgress(graphModel([], []), 'missing', {}))
      .toEqual({
        targetKeys: [],
        ownedByTarget: {},
        complete: false
      })
  })
})

function graphModel(
  nodes: Array<CraftingGraphItemNode | CraftingGraphMethodNode>,
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
    methodIds: []
  }
}

function methodNode(instanceId: string): CraftingGraphMethodNode {
  const planNode = plan(instanceId, `item:${instanceId}`, 1)
  return {
    instanceId,
    kind: 'method',
    planNode,
    title: 'Верстак',
    detail: '',
    status: 'craft',
    path: [],
    cyclic: false,
    methodKind: 'recipe',
    targetKey: planNode.target.key,
    batches: 1,
    resultCount: 1,
    producedCount: 1
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
