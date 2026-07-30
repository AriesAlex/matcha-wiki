import type {
  CraftingPlanNode,
  CraftingPlanRequirement,
  CraftingTargetView
} from '../../types/crafting'
import type { CraftingGraphChoiceOption } from '../../types/craftingGraph'
import {
  formatIdentifier,
  stripMinecraftFormatting
} from '../format'
import type {
  Projection,
  ProjectionEntry
} from './internal'
import {
  normalizeCount,
  stableId
} from './internal'

export function collectProjection(root: CraftingPlanNode): Projection {
  const entries = new Map<string, ProjectionEntry>()
  const stationTargetByResource = new Map<string, CraftingTargetView>()
  const activeNodes = new WeakSet<object>()

  function visit(node: CraftingPlanNode): void {
    const existing = entries.get(node.target.key)
    if (existing) {
      existing.occurrences.push(node)
      existing.ownedAvailable += normalizeCount(node.ownedCount)
      existing.cyclic ||= node.state === 'cycle'
      if (representativeRank(node) > representativeRank(existing.representative)) {
        existing.representative = node
      }
    } else {
      entries.set(node.target.key, {
        targetKey: node.target.key,
        occurrences: [node],
        representative: node,
        ownedAvailable: normalizeCount(node.ownedCount),
        cyclic: node.state === 'cycle'
      })
    }

    if (activeNodes.has(node)) {
      entries.get(node.target.key)!.cyclic = true
      return
    }

    activeNodes.add(node)
    if (node.station) {
      const stationResourceId = node.recipe?.stationResourceId
      if (stationResourceId) {
        stationTargetByResource.set(stationResourceId, node.station.target)
      }
      visit(node.station)
    }
    for (const requirement of node.requirements) {
      visit(requirement.node)
    }
    activeNodes.delete(node)
  }

  visit(root)
  return { entries, stationTargetByResource }
}

export function ensureProjectionEntry(
  projection: Projection,
  target: CraftingTargetView,
  planNode?: CraftingPlanNode
): void {
  if (projection.entries.has(target.key)) return

  const fallback = planNode ?? fallbackPlanNode(target)
  projection.entries.set(target.key, {
    targetKey: target.key,
    occurrences: [fallback],
    representative: fallback,
    ownedAvailable: normalizeCount(fallback.ownedCount),
    cyclic: fallback.state === 'cycle'
  })
}

export function fallbackPlanNode(
  target: CraftingTargetView
): CraftingPlanNode {
  return {
    id: `graph-fallback|${target.key}`,
    target,
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

export function fallbackStationTarget(
  resourceId: string,
  title: string
): CraftingTargetView {
  return {
    key: `resource:${resourceId}`,
    kind: 'resource',
    resourceId,
    title,
    obtainHint: 'Этот рабочий блок нужно изготовить или найти.'
  }
}

export function perBatchRequirementCount(
  planNode: CraftingPlanNode,
  requirement: CraftingPlanRequirement
): number {
  const recipeRequirement = planNode.recipe?.requirements
    .find(candidate => candidate.id === requirement.id)
  if (recipeRequirement) {
    return normalizeCount(recipeRequirement.count)
  }

  const divisor = Math.max(1, normalizeCount(planNode.batches))
  return normalizeCount(requirement.count / divisor)
}

export function choiceOptionsFor(
  requirement: CraftingPlanRequirement
): readonly CraftingGraphChoiceOption[] {
  const onlyOption = requirement.options.length === 1
    ? requirement.options[0]
    : undefined
  const groupedResourceIds = onlyOption?.key.startsWith('resource:alternatives:')
    ? onlyOption.resourceId.split('|').filter(Boolean)
    : []
  const targets = groupedResourceIds.length > 1 && onlyOption
    ? groupedResourceIds.map(resourceId => expandGroupedTarget(onlyOption, resourceId))
    : requirement.options
  const groupedSelection = groupedResourceIds.length > 1
    && requirement.selectedOptionKey === onlyOption?.key

  return Object.freeze(targets.map((target) => {
    const selected = groupedSelection
      || target.key === requirement.selectedOptionKey
    return Object.freeze({
      instanceId: stableId('option', requirement.id, target.key),
      key: target.key,
      target,
      selected,
      detail: target.vanillaName ?? target.resourceId
    })
  }))
}

export function selectedOptionDetail(
  requirement: CraftingPlanRequirement
): string {
  const selected = requirement.options.find(option => (
    option.key === requirement.selectedOptionKey
  )) ?? requirement.node.target
  return stripMinecraftFormatting(selected.title)
}

function representativeRank(node: CraftingPlanNode): number {
  if (node.state === 'craft' && node.recipe) return 5
  if (node.state === 'obtain') return 4
  if (node.state === 'unknown') return 3
  if (node.state === 'cycle') return 2
  return 1
}

function expandGroupedTarget(
  group: CraftingTargetView,
  resourceId: string
): CraftingTargetView {
  const suffix = formatIdentifier(resourceId)
  return {
    ...group,
    key: `resource:${resourceId}`,
    resourceId,
    title: `${stripMinecraftFormatting(group.title)}: ${suffix}`,
    vanillaName: undefined
  }
}
