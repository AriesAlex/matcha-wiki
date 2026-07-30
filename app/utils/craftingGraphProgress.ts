import type {
  CraftingGraphModel
} from '../types/craftingGraph'

export interface CraftingSubtreeProgress {
  readonly targetKeys: readonly string[]
  readonly ownedByTarget: Readonly<Record<string, number>>
  readonly complete: boolean
}

export function craftingSubtreeProgress(
  graph: CraftingGraphModel,
  instanceId: string,
  currentOwnedByTarget: Readonly<Record<string, number>>
): CraftingSubtreeProgress {
  const nodesById = new Map(
    graph.nodes.map(node => [node.instanceId, node] as const)
  )
  const childrenById = Map.groupBy(graph.edges, edge => edge.from)
  const targetCounts = new Map<string, number>()
  const pending = [instanceId]
  const visited = new Set<string>()

  while (pending.length) {
    const nodeId = pending.pop()
    if (!nodeId || visited.has(nodeId)) continue
    visited.add(nodeId)

    const node = nodesById.get(nodeId)
    if (!node) continue
    if (node.kind === 'item') {
      targetCounts.set(
        node.target.key,
        Math.max(
          targetCounts.get(node.target.key) ?? 0,
          node.demand.required
        )
      )
    }

    for (const edge of childrenById.get(nodeId) ?? []) {
      pending.push(edge.to)
    }
  }

  const ownedByTarget = Object.fromEntries(targetCounts)
  return {
    targetKeys: [...targetCounts.keys()],
    ownedByTarget,
    complete: targetCounts.size > 0
      && [...targetCounts].every(([targetKey, count]) => (
        (currentOwnedByTarget[targetKey] ?? 0) >= count
      ))
  }
}
