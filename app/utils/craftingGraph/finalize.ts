import type {
  CraftingPlanNode,
  CraftingPlanState
} from '../../types/crafting'
import type {
  CraftingGraphChoiceNode,
  CraftingGraphDemand,
  CraftingGraphEdge,
  CraftingGraphItemNode,
  CraftingGraphMethodNode,
  CraftingGraphModel,
  CraftingGraphNode,
  CraftingGraphSourceNode,
  CraftingGraphStationNode
} from '../../types/craftingGraph'
import { stripMinecraftFormatting } from '../format'
import type {
  BuildContext,
  ItemAccumulator
} from './internal'
import {
  comparePaths,
  itemInstanceId,
  normalizeCount
} from './internal'
import {
  itemDetail,
  methodDetail,
  methodTitle
} from './presentation'
import { fallbackPlanNode } from './projection'

export function finalizeCraftingGraph(
  context: BuildContext,
  rootId: string
): CraftingGraphModel {
  const planSnapshots = new Map<string, CraftingPlanNode>()
  const itemNodes = new Map<string, CraftingGraphItemNode>()
  const methodIdsByTarget = groupMethodIds(context)

  for (const item of context.items.values()) {
    const demand = itemDemand(item, context)
    const status = itemStatus(item, demand)
    const planNode = aggregatePlanNode(item, demand, status)
    const target = item.projection.representative.target

    planSnapshots.set(item.projection.targetKey, planNode)
    itemNodes.set(item.instanceId, Object.freeze({
      instanceId: item.instanceId,
      kind: 'item',
      planNode,
      target,
      title: stripMinecraftFormatting(target.title),
      detail: itemDetail(demand, status),
      status,
      path: item.path,
      cyclic: item.cyclic,
      demand,
      occurrences: item.projection.occurrences.length,
      methodIds: Object.freeze(
        methodIdsByTarget.get(item.projection.targetKey) ?? []
      ),
      detailsPath: target.item
        ? `/items/${target.item.slug}`
        : undefined
    }))
  }

  const methodNodes = [...context.methods.values()].map((method) => {
    const planNode = planSnapshots.get(method.ownerTargetKey)
      ?? method.planNode
    const recipe = method.planNode.recipe
    const resultCount = recipe
      ? Math.max(1, normalizeCount(recipe.resultCount))
      : 1
    const producedCount = method.batches * resultCount
    const status = method.methodKind === 'cycle'
      ? 'cycle'
      : planNode.state

    return Object.freeze<CraftingGraphMethodNode>({
      instanceId: method.instanceId,
      kind: 'method',
      methodKind: method.methodKind,
      planNode,
      targetKey: method.ownerTargetKey,
      recipe,
      title: methodTitle(method.methodKind, method.planNode),
      detail: methodDetail(method.methodKind, {
        ...planNode,
        batches: method.batches
      }),
      status,
      path: method.path,
      cyclic: status === 'cycle',
      batches: method.batches,
      resultCount,
      producedCount,
      detailsPath: recipe?.detailsPath
    })
  })

  const choiceNodes = [...context.choices.values()].map((choice) => {
    const planNode = planSnapshots.get(choice.ownerTargetKey)
      ?? choice.requirement.node
    const selected = choice.options.filter(option => option.selected)
    const detail = selected.length === choice.options.length
      ? `Подойдёт любой из ${choice.options.length} вариантов`
      : `Выбрано: ${selected.map(option => option.target.title).join(', ')}`

    return Object.freeze<CraftingGraphChoiceNode>({
      instanceId: choice.instanceId,
      kind: 'context',
      contextKind: 'choice',
      planNode,
      title: stripMinecraftFormatting(choice.requirement.label),
      detail,
      status: planNode.state,
      path: choice.path,
      cyclic: choice.cyclic,
      requirementId: choice.requirement.id,
      role: choice.requirement.role,
      count: choice.count,
      selectedOptionKey: choice.requirement.selectedOptionKey,
      options: choice.options
    })
  })

  const stationNodes = [...context.stations.values()].map((station) => {
    const planNode = planSnapshots.get(station.targetKey)
      ?? planSnapshots.get(station.ownerTargetKey)
      ?? fallbackPlanNode(station.target)

    return Object.freeze<CraftingGraphStationNode>({
      instanceId: station.instanceId,
      kind: 'context',
      contextKind: 'station',
      planNode,
      title: stripMinecraftFormatting(station.target.title),
      detail: 'Рабочее место для этого способа',
      status: planNode.state,
      path: station.path,
      cyclic: station.cyclic,
      resourceId: station.resourceId,
      target: station.target,
      itemNodeId: itemInstanceId(station.targetKey)
    })
  })

  const sourceNodes = [...context.sources.values()].map(source => (
    Object.freeze<CraftingGraphSourceNode>({
      instanceId: source.instanceId,
      kind: 'context',
      contextKind: 'source',
      planNode: source.planNode,
      title: source.source.title,
      detail: source.source.detail,
      status: source.planNode.state,
      path: source.path,
      cyclic: false,
      source: source.source,
      targetKey: source.ownerTargetKey
    })
  ))

  const nodes = sortNodes([
    ...itemNodes.values(),
    ...methodNodes,
    ...choiceNodes,
    ...stationNodes,
    ...sourceNodes
  ])
  const nodeById = new Map(nodes.map(node => [node.instanceId, node]))
  const edges = [...context.edges.values()]
    .filter(edge => nodeById.has(edge.from) && nodeById.has(edge.to))
    .map(edge => Object.freeze<CraftingGraphEdge>({
      ...edge,
      count: edge.count === undefined
        ? undefined
        : normalizeCount(edge.count)
    }))
    .sort((left, right) => (
      comparePaths(
        nodeById.get(left.from)?.path ?? [],
        nodeById.get(right.from)?.path ?? []
      )
      || left.kind.localeCompare(right.kind)
      || left.to.localeCompare(right.to)
    ))

  return Object.freeze({
    rootId,
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges)
  })
}

function groupMethodIds(context: BuildContext): Map<string, string[]> {
  const grouped = new Map<string, string[]>()
  for (const method of context.methods.values()) {
    const ids = grouped.get(method.ownerTargetKey) ?? []
    ids.push(method.instanceId)
    grouped.set(method.ownerTargetKey, ids)
  }
  for (const ids of grouped.values()) ids.sort()
  return grouped
}

function sortNodes(nodes: CraftingGraphNode[]): CraftingGraphNode[] {
  const originalOrder = new Map(
    nodes.map((node, index) => [node.instanceId, index])
  )
  return nodes.sort((left, right) => (
    left.path.length - right.path.length
    || comparePaths(left.path, right.path)
    || (originalOrder.get(left.instanceId) ?? 0)
    - (originalOrder.get(right.instanceId) ?? 0)
  ))
}

function itemDemand(
  item: ItemAccumulator,
  context: BuildContext
): CraftingGraphDemand {
  const required = normalizeCount(item.required)
  const owned = Math.min(item.projection.ownedAvailable, required)
  const missing = required - owned
  const method = item.methodId
    ? context.methods.get(item.methodId)
    : undefined
  const batches = method?.batches ?? 0
  const resultCount = method?.planNode.recipe
    ? Math.max(1, normalizeCount(method.planNode.recipe.resultCount))
    : 1
  const produced = batches * resultCount

  return Object.freeze({
    required,
    owned,
    missing,
    batches,
    produced,
    surplus: Math.max(0, produced - missing)
  })
}

function itemStatus(
  item: ItemAccumulator,
  demand: CraftingGraphDemand
): CraftingPlanState {
  if (item.cyclic) return 'cycle'
  if (demand.missing === 0) return 'owned'

  const state = item.projection.representative.state
  return state === 'owned' ? 'unknown' : state
}

function aggregatePlanNode(
  item: ItemAccumulator,
  demand: CraftingGraphDemand,
  status: CraftingPlanState
): CraftingPlanNode {
  const representative = item.projection.representative
  return Object.freeze({
    ...representative,
    id: item.instanceId,
    requiredCount: demand.required,
    ownedCount: demand.owned,
    missingCount: demand.missing,
    state: status,
    batches: demand.batches
  })
}
