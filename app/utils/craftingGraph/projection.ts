import type {
  CraftingPlanNode,
  CraftingPlanRequirement,
  CraftingTargetView
} from '../../types/crafting'
import type { CraftingGraphAlternativeOption } from '../../types/craftingGraph'
import { stripMinecraftFormatting } from '../format'
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
    for (const requirement of node.requirements) {
      visit(requirement.node)
    }
    activeNodes.delete(node)
  }

  visit(root)
  return { entries }
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
): readonly CraftingGraphAlternativeOption[] {
  const onlyOption = requirement.options.length === 1
    ? requirement.options[0]
    : undefined
  const groupedTargets = onlyOption?.alternativeTargets ?? []
  const targets = groupedTargets.length > 1
    ? groupedTargets
    : requirement.options
  const groupedSelection = groupedTargets.length > 1
    && requirement.selectedOptionKey === onlyOption?.key

  return Object.freeze(targets.map((target) => {
    const selected = groupedSelection
      || target.key === requirement.selectedOptionKey
    return Object.freeze({
      instanceId: stableId('option', requirement.id, target.key),
      key: target.key,
      title: stripMinecraftFormatting(target.title),
      detail: alternativeDetail(target),
      icon: target.icon,
      path: target.detailsPath,
      selected,
      targetKey: target.key
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

function alternativeDetail(target: CraftingTargetView): string {
  return target.vanillaName
    ?? target.item?.description
    ?? target.item?.lore[0]
    ?? target.obtainHint
    ?? target.sources?.[0]?.detail
    ?? ''
}
