import type {
  CraftingGraphBounds,
  CraftingGraphEdge,
  CraftingGraphEdgeView,
  CraftingGraphLayoutOptions,
  CraftingGraphModel,
  CraftingGraphNode,
  CraftingGraphNodeKind,
  CraftingGraphNodeSize,
  CraftingGraphNodeView,
  CraftingGraphView
} from '../types/craftingGraph'

export const CRAFTING_GRAPH_ITEM_SIZE: CraftingGraphNodeSize
  = Object.freeze({ width: 172, height: 76 })

export const CRAFTING_GRAPH_METHOD_SIZE: CraftingGraphNodeSize
  = Object.freeze({ width: 148, height: 50 })

export const CRAFTING_GRAPH_CONTEXT_SIZE: CraftingGraphNodeSize
  = Object.freeze({ width: 132, height: 46 })

export const CRAFTING_GRAPH_NODE_SIZES: Readonly<
  Record<CraftingGraphNodeKind, CraftingGraphNodeSize>
> = Object.freeze({
  item: CRAFTING_GRAPH_ITEM_SIZE,
  method: CRAFTING_GRAPH_METHOD_SIZE,
  context: CRAFTING_GRAPH_CONTEXT_SIZE
})

const DEFAULT_COLUMN_GAP = 48
const DEFAULT_ROW_GAP = 64
const DEFAULT_PADDING = 32

export function layoutCraftingGraph(
  graph: CraftingGraphModel,
  options: CraftingGraphLayoutOptions = {}
): CraftingGraphView {
  const root = graph.nodes.find(node => node.instanceId === graph.rootId)
  if (!root) {
    throw new Error(`Crafting graph root is missing: ${graph.rootId}`)
  }

  const columnGap = positiveOr(options.columnGap, DEFAULT_COLUMN_GAP)
  const rowGap = positiveOr(options.rowGap, DEFAULT_ROW_GAP)
  const padding = nonNegativeOr(options.padding, DEFAULT_PADDING)
  const nodeOrder = new Map(
    graph.nodes.map((node, index) => [node.instanceId, index])
  )
  const depths = assignDepths(graph, nodeOrder)
  const layers = groupLayers(graph.nodes, depths, nodeOrder)
  const layerWidths = layers.map(layer => layerWidth(layer, columnGap))
  const contentWidth = Math.max(...layerWidths, CRAFTING_GRAPH_ITEM_SIZE.width)
  const positions = new Map<string, CraftingGraphNodeView>()
  let y = padding

  layers.forEach((layer, depth) => {
    const currentLayerWidth = layerWidths[depth] ?? 0
    const layerHeight = Math.max(...layer.map(node => nodeSize(node).height))
    let x = padding + (contentWidth - currentLayerWidth) / 2

    for (const node of layer) {
      const size = nodeSize(node)
      const view = Object.freeze<CraftingGraphNodeView>({
        instanceId: node.instanceId,
        node,
        planNode: node.planNode,
        kind: node.kind,
        path: node.path,
        detail: node.detail,
        status: node.status,
        x,
        y: y + (layerHeight - size.height) / 2,
        width: size.width,
        height: size.height,
        depth
      })
      positions.set(node.instanceId, view)
      x += size.width + columnGap
    }

    y += layerHeight + rowGap
  })

  const nodes = graph.nodes
    .map(node => positions.get(node.instanceId))
    .filter((node): node is CraftingGraphNodeView => Boolean(node))
    .sort((left, right) => (
      left.depth - right.depth
      || left.x - right.x
      || left.instanceId.localeCompare(right.instanceId)
    ))
  const bounds = graphBounds(nodes, padding)
  const edges = graph.edges
    .map(edge => layoutEdge(edge, positions))
    .filter((edge): edge is CraftingGraphEdgeView => Boolean(edge))

  return Object.freeze({
    rootId: graph.rootId,
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    bounds
  })
}

function assignDepths(
  graph: CraftingGraphModel,
  nodeOrder: ReadonlyMap<string, number>
): Map<string, number> {
  const outgoing = new Map<string, CraftingGraphEdge[]>()
  for (const edge of graph.edges) {
    const edges = outgoing.get(edge.from) ?? []
    edges.push(edge)
    outgoing.set(edge.from, edges)
  }
  for (const edges of outgoing.values()) {
    edges.sort((left, right) => (
      (nodeOrder.get(left.to) ?? Number.MAX_SAFE_INTEGER)
      - (nodeOrder.get(right.to) ?? Number.MAX_SAFE_INTEGER)
      || left.id.localeCompare(right.id)
    ))
  }

  const depths = new Map([[graph.rootId, 0]])
  const queue = [graph.rootId]
  let cursor = 0

  while (cursor < queue.length) {
    const currentId = queue[cursor]
    cursor += 1
    if (!currentId) continue
    const currentDepth = depths.get(currentId) ?? 0
    for (const edge of outgoing.get(currentId) ?? []) {
      if (depths.has(edge.to)) continue
      depths.set(edge.to, currentDepth + 1)
      queue.push(edge.to)
    }
  }

  const disconnectedDepth = Math.max(...depths.values(), 0) + 1
  for (const node of graph.nodes) {
    if (!depths.has(node.instanceId)) {
      depths.set(node.instanceId, disconnectedDepth)
    }
  }
  return depths
}

function groupLayers(
  nodes: readonly CraftingGraphNode[],
  depths: ReadonlyMap<string, number>,
  nodeOrder: ReadonlyMap<string, number>
): CraftingGraphNode[][] {
  const layers: CraftingGraphNode[][] = []
  for (const node of nodes) {
    const depth = depths.get(node.instanceId) ?? 0
    const layer = layers[depth] ?? []
    layer.push(node)
    layers[depth] = layer
  }

  for (const layer of layers) {
    layer.sort((left, right) => (
      comparePaths(left.path, right.path)
      || (nodeOrder.get(left.instanceId) ?? 0)
      - (nodeOrder.get(right.instanceId) ?? 0)
    ))
  }
  return layers
}

function layerWidth(
  nodes: readonly CraftingGraphNode[],
  columnGap: number
): number {
  return nodes.reduce((width, node) => width + nodeSize(node).width, 0)
    + Math.max(0, nodes.length - 1) * columnGap
}

function nodeSize(node: CraftingGraphNode): CraftingGraphNodeSize {
  return CRAFTING_GRAPH_NODE_SIZES[node.kind]
}

function graphBounds(
  nodes: readonly CraftingGraphNodeView[],
  padding: number
): CraftingGraphBounds {
  if (!nodes.length) {
    return Object.freeze({ x: 0, y: 0, width: 0, height: 0 })
  }

  const maxX = Math.max(...nodes.map(node => node.x + node.width))
  const maxY = Math.max(...nodes.map(node => node.y + node.height))
  return Object.freeze({
    x: 0,
    y: 0,
    width: maxX + padding,
    height: maxY + padding
  })
}

function layoutEdge(
  edge: CraftingGraphEdge,
  nodes: ReadonlyMap<string, CraftingGraphNodeView>
): CraftingGraphEdgeView | undefined {
  const from = nodes.get(edge.from)
  const to = nodes.get(edge.to)
  if (!from || !to) return undefined

  return Object.freeze({
    ...edge,
    path: edgePath(from, to, edge.cyclic)
  })
}

function edgePath(
  from: CraftingGraphNodeView,
  to: CraftingGraphNodeView,
  cyclic: boolean
): string {
  const startX = round(from.x + from.width / 2)
  const startY = round(from.y + from.height)
  const endX = round(to.x + to.width / 2)
  const endY = round(to.y)

  if (cyclic || to.depth <= from.depth) {
    const direction = endX >= startX ? 1 : -1
    const sideX = round(
      (direction > 0
        ? Math.max(from.x + from.width, to.x + to.width)
        : Math.min(from.x, to.x))
      + direction * 28
    )
    return [
      `M ${startX} ${startY}`,
      `C ${sideX} ${startY + 20}, ${sideX} ${endY - 20}, ${endX} ${endY}`
    ].join(' ')
  }

  const middleY = round(startY + (endY - startY) / 2)
  return [
    `M ${startX} ${startY}`,
    `C ${startX} ${middleY}, ${endX} ${middleY}, ${endX} ${endY}`
  ].join(' ')
}

function positiveOr(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value > 0
    ? value
    : fallback
}

function nonNegativeOr(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value >= 0
    ? value
    : fallback
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function comparePaths(
  left: readonly string[],
  right: readonly string[]
): number {
  return left.join('\u0000').localeCompare(right.join('\u0000'))
}
