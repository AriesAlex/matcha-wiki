import type { CraftingPlanNode } from '../../types/crafting'
import {
  addEdge,
  createBuildContext,
  ensureIngredientAlternatives,
  ensureRecipe,
  ensureSources,
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

  ensureSources(context, item, representative)
  if (representative.state !== 'craft' || !representative.recipe) {
    return
  }

  const recipe = ensureRecipe(context, item, representative)
  const resultCount = Math.max(1, normalizeCount(representative.resultCount))
  const nextBatches = Math.ceil(missing / resultCount)
  const additionalBatches = nextBatches - recipe.batches
  recipe.batches = nextBatches
  if (additionalBatches <= 0) return

  for (const requirement of representative.requirements) {
    const count = perBatchRequirementCount(representative, requirement)
      * additionalBatches
    if (count <= 0) continue

    const choiceOptions = choiceOptionsFor(requirement)
    if (choiceOptions.length > 1) {
      const alternatives = ensureIngredientAlternatives(
        context,
        item,
        recipe,
        requirement,
        choiceOptions
      )
      alternatives.count += count
      addEdge(context, {
        from: recipe.instanceId,
        kind: 'alternative',
        count,
        role: requirement.role,
        detail: requirement.label,
        status: representative.state
      }, alternatives.instanceId, false)

      // A tag-like requirement already exposes every valid material inside the
      // alternatives group. Its synthetic combined target ("oak or spruce or
      // ...") is not a real item and only adds a misleading extra branch.
      if (choiceOptions.every(option => option.selected)) continue

      requestItem(
        context,
        requirement.node.target.key,
        count,
        {
          from: alternatives.instanceId,
          kind: 'selected-option',
          count,
          role: requirement.role,
          detail: selectedOptionDetail(requirement),
          status: requirement.node.state
        },
        nextAncestry,
        [...alternatives.path, itemInstanceId(requirement.node.target.key)]
      )
      continue
    }

    requestItem(
      context,
      requirement.node.target.key,
      count,
      {
        from: recipe.instanceId,
        kind: 'requirement',
        count,
        role: requirement.role,
        detail: requirement.label,
        status: requirement.node.state
      },
      nextAncestry,
      [...recipe.path, itemInstanceId(requirement.node.target.key)]
    )
  }
}
