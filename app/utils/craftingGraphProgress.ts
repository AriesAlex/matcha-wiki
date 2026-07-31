import type {
  CraftingGraphModel
} from '../types/craftingGraph'

export interface CraftingItemProgress {
  readonly targetKey: string
  readonly required: number
}

export interface CraftingGraphActivity {
  readonly activeNodeIds: readonly string[]
  readonly inactiveNodeIds: readonly string[]
  readonly activeEdgeIds: readonly string[]
  readonly inactiveEdgeIds: readonly string[]
}

export function craftingGraphActivity(
  graph: CraftingGraphModel,
  completedItemNodeIds: ReadonlySet<string>
): CraftingGraphActivity {
  const nodesById = new Map(
    graph.nodes.map(node => [node.instanceId, node] as const)
  )
  const edgesBySource = Map.groupBy(
    graph.edges.map((edge, index) => ({ edge, index })),
    ({ edge }) => edge.from
  )
  const activeNodeIds = new Set<string>()
  const activeEdgeIndexes = new Set<number>()
  const pending = [graph.rootId]

  while (pending.length) {
    const nodeId = pending.pop()
    if (!nodeId || activeNodeIds.has(nodeId)) continue

    const node = nodesById.get(nodeId)
    if (!node) continue
    activeNodeIds.add(nodeId)

    const isCompletedItem = node.kind === 'item'
      && completedItemNodeIds.has(nodeId)
    if (isCompletedItem) continue

    for (const { edge, index } of edgesBySource.get(nodeId) ?? []) {
      if (!nodesById.has(edge.to)) continue
      activeEdgeIndexes.add(index)
      pending.push(edge.to)
    }
  }

  return {
    activeNodeIds: graph.nodes
      .filter(node => activeNodeIds.has(node.instanceId))
      .map(node => node.instanceId),
    inactiveNodeIds: graph.nodes
      .filter(node => !activeNodeIds.has(node.instanceId))
      .map(node => node.instanceId),
    activeEdgeIds: graph.edges
      .filter((_, index) => activeEdgeIndexes.has(index))
      .map(edge => edge.id),
    inactiveEdgeIds: graph.edges
      .filter((_, index) => !activeEdgeIndexes.has(index))
      .map(edge => edge.id)
  }
}

export function craftingItemProgress(
  graph: CraftingGraphModel,
  instanceId: string
): CraftingItemProgress | undefined {
  const node = graph.nodes.find(candidate => candidate.instanceId === instanceId)
  if (node?.kind !== 'item') return undefined

  return {
    targetKey: node.target.key,
    required: node.demand.required
  }
}
