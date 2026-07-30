import type { CraftingPlanNode } from '../../types/crafting'
import {
  addEdge,
  createBuildContext,
  ensureChoice,
  ensureRecipeMethod,
  ensureSources,
  ensureStation,
  ensureTerminalMethod,
  getOrCreateItem,
  itemMissingCount
} from './accumulatorNodes'
import type {
  AccumulatedGraph,
  BuildContext,
  ParentRelation,
  Projection
} from './internal'
import {
  itemInstanceId,
  normalizeCount
} from './internal'
import {
  choiceOptionsFor,
  perBatchRequirementCount,
  selectedOptionDetail
} from './projection'

export function accumulateCraftingGraph(
  root: CraftingPlanNode,
  projection: Projection
): AccumulatedGraph {
  const context = createBuildContext(projection)
  const rootId = itemInstanceId(root.target.key)

  requestItem(
    context,
    root.target.key,
    normalizeCount(root.requiredCount),
    undefined,
    new Set(),
    [rootId]
  )
  return { context, rootId }
}

function requestItem(
  context: BuildContext,
  targetKey: string,
  requestedCount: number,
  parent: ParentRelation | undefined,
  ancestry: ReadonlySet<string>,
  path: readonly string[]
): void {
  const projection = context.projection.entries.get(targetKey)
  if (!projection || requestedCount <= 0) return

  const item = getOrCreateItem(context, projection, path)
  const cyclic = ancestry.has(targetKey)
  if (parent) {
    addEdge(context, parent, item.instanceId, cyclic)
  }
  if (cyclic) {
    item.cyclic = true
    return
  }

  item.required += requestedCount
  const missing = itemMissingCount(item)
  const representative = projection.representative
  const nextAncestry = new Set(ancestry)
  nextAncestry.add(targetKey)

  if (missing <= 0 || representative.state === 'owned') return

  if (representative.state !== 'craft' || !representative.recipe) {
    const method = ensureTerminalMethod(context, item, representative)
    ensureSources(context, item, method, representative)
    return
  }

  const method = ensureRecipeMethod(context, item, representative)
  const resultCount = Math.max(1, normalizeCount(representative.resultCount))
  const nextBatches = Math.ceil(missing / resultCount)
  const additionalBatches = nextBatches - method.batches
  method.batches = nextBatches

  const stationDemand = ensureStation(context, item, method, representative)
  if (stationDemand) {
    const stationCycle = nextAncestry.has(stationDemand.station.targetKey)
    stationDemand.station.cyclic ||= stationCycle
    requestItem(
      context,
      stationDemand.station.targetKey,
      1,
      stationDemand.relation,
      nextAncestry,
      stationDemand.path
    )
  }
  if (additionalBatches <= 0) return

  for (const requirement of representative.requirements) {
    const count = perBatchRequirementCount(representative, requirement)
      * additionalBatches
    if (count <= 0) continue

    const choiceOptions = choiceOptionsFor(requirement)
    if (choiceOptions.length > 1) {
      const choice = ensureChoice(
        context,
        item,
        method,
        requirement,
        choiceOptions
      )
      choice.count += count
      addEdge(context, {
        from: method.instanceId,
        kind: 'context',
        count,
        role: requirement.role,
        detail: requirement.label,
        status: representative.state
      }, choice.instanceId, false)
      requestItem(
        context,
        requirement.node.target.key,
        count,
        {
          from: choice.instanceId,
          kind: 'selected-option',
          count,
          role: requirement.role,
          detail: selectedOptionDetail(requirement),
          status: requirement.node.state
        },
        nextAncestry,
        [...choice.path, itemInstanceId(requirement.node.target.key)]
      )
      continue
    }

    requestItem(
      context,
      requirement.node.target.key,
      count,
      {
        from: method.instanceId,
        kind: 'requirement',
        count,
        role: requirement.role,
        detail: requirement.label,
        status: requirement.node.state
      },
      nextAncestry,
      [...method.path, itemInstanceId(requirement.node.target.key)]
    )
  }
}
