import type {
  CraftingPlanNode,
  CraftingPlanState
} from '../../types/crafting'
import type {
  CraftingGraphAlternativesNode,
  CraftingGraphDemand,
  CraftingGraphEdge,
  CraftingGraphItemNode,
  CraftingGraphModel,
  CraftingGraphNode,
  CraftingGraphRecipeNode,
  CraftingGraphSourceNode
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
  recipeDetail
} from './presentation'

export function finalizeCraftingGraph(
  context: BuildContext,
  rootId: string
): CraftingGraphModel {
  const planSnapshots = new Map<string, CraftingPlanNode>()
  const itemNodes = new Map<string, CraftingGraphItemNode>()
  const recipeIdsByTarget = groupRecipeIds(context)

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
      detail: itemDetail(demand, status, target),
      status,
      path: item.path,
      cyclic: item.cyclic,
      demand,
      occurrences: item.projection.occurrences.length,
      recipeIds: Object.freeze(
        recipeIdsByTarget.get(item.projection.targetKey) ?? []
      ),
      itemPagePath: target.itemPagePath,
      detailsPath: target.detailsPath
    }))
  }

  const recipeNodes = [...context.recipes.values()].map((entry) => {
    const planNode = planSnapshots.get(entry.ownerTargetKey)
      ?? entry.planNode
    const recipe = entry.planNode.recipe
    if (!recipe) {
      throw new Error(`Recipe graph node lost its recipe: ${entry.instanceId}`)
    }

    const resultCount = Math.max(1, normalizeCount(recipe.resultCount))
    const producedCount = entry.batches * resultCount
    const surplus = itemNodes.get(itemInstanceId(entry.ownerTargetKey))
      ?.demand.surplus ?? 0

    return Object.freeze<CraftingGraphRecipeNode>({
      instanceId: entry.instanceId,
      kind: 'recipe',
      planNode,
      targetKey: entry.ownerTargetKey,
      recipe,
      title: stripMinecraftFormatting(recipe.station),
      detail: recipeDetail(entry.batches, resultCount, surplus),
      status: planNode.state,
      path: entry.path,
      cyclic: false,
      batches: entry.batches,
      resultCount,
      producedCount,
      surplus,
      detailsPath: recipe.detailsPath
    })
  })

  const alternativesNodes = [...context.alternatives.values()].map((entry) => {
    const planNode = planSnapshots.get(entry.ownerTargetKey)
      ?? entry.planNode
    const ingredient = entry.alternativeKind === 'ingredient'
    const optionCount = entry.options.length

    return Object.freeze<CraftingGraphAlternativesNode>({
      instanceId: entry.instanceId,
      kind: 'alternatives',
      alternativeKind: entry.alternativeKind,
      ownerTargetKey: entry.ownerTargetKey,
      planNode,
      title: ingredient ? 'Выберите материал' : 'Где взять',
      detail: ingredient
        ? `Подойдёт один из ${optionCount} вариантов.`
        : `Выберите один из ${optionCount} способов.`,
      status: planNode.state,
      path: entry.path,
      cyclic: entry.cyclic,
      requirementId: entry.requirement?.id,
      role: entry.requirement?.role,
      count: ingredient ? normalizeCount(entry.count) : undefined,
      selectedOptionKey: entry.requirement?.selectedOptionKey,
      options: entry.options
    })
  })

  const sourceNodes = [...context.sources.values()].map((entry) => {
    const planNode = planSnapshots.get(entry.ownerTargetKey)
      ?? entry.planNode

    return Object.freeze<CraftingGraphSourceNode>({
      instanceId: entry.instanceId,
      kind: 'source',
      planNode,
      title: entry.source.title,
      detail: entry.source.detail,
      status: planNode.state,
      path: entry.path,
      cyclic: false,
      source: entry.source,
      targetKey: entry.ownerTargetKey
    })
  })

  const nodes = sortNodes([
    ...itemNodes.values(),
    ...recipeNodes,
    ...alternativesNodes,
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

function groupRecipeIds(context: BuildContext): Map<string, string[]> {
  const grouped = new Map<string, string[]>()
  for (const recipe of context.recipes.values()) {
    const ids = grouped.get(recipe.ownerTargetKey) ?? []
    ids.push(recipe.instanceId)
    grouped.set(recipe.ownerTargetKey, ids)
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
  const recipe = item.recipeId
    ? context.recipes.get(item.recipeId)
    : undefined
  const batches = recipe?.batches ?? 0
  const resultCount = recipe?.planNode.recipe
    ? Math.max(1, normalizeCount(recipe.planNode.recipe.resultCount))
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
  if (demand.missing === 0) return 'owned'
  if (item.cyclic && !item.recipeId) return 'cycle'

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
