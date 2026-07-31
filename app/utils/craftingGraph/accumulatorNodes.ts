import type {
  CraftingPlanNode,
  CraftingPlanRequirement
} from '../../types/crafting'
import type { CraftingGraphAlternativeOption } from '../../types/craftingGraph'
import type {
  AlternativesAccumulator,
  BuildContext,
  ItemAccumulator,
  ParentRelation,
  Projection,
  ProjectionEntry,
  RecipeAccumulator,
  SourceAccumulator
} from './internal'
import { stableId } from './internal'
import { groupCraftingSources } from './sourceGroups'

export function createBuildContext(projection: Projection): BuildContext {
  return {
    projection,
    items: new Map(),
    recipes: new Map(),
    alternatives: new Map(),
    sources: new Map(),
    edges: new Map()
  }
}

export function getOrCreateItem(
  context: BuildContext,
  projection: ProjectionEntry,
  path: readonly string[]
): ItemAccumulator {
  const existing = context.items.get(projection.targetKey)
  if (existing) return existing

  const item: ItemAccumulator = {
    instanceId: stableId('item', projection.targetKey),
    projection,
    path: Object.freeze([...path]),
    required: 0,
    cyclic: projection.cyclic
  }
  context.items.set(projection.targetKey, item)
  return item
}

export function ensureRecipe(
  context: BuildContext,
  item: ItemAccumulator,
  planNode: CraftingPlanNode
): RecipeAccumulator {
  const recipe = planNode.recipe
  if (!recipe) {
    throw new Error(`Crafting node has no selected recipe: ${planNode.target.key}`)
  }

  const instanceId = stableId(
    'recipe',
    item.projection.targetKey,
    recipe.id
  )
  const existing = context.recipes.get(instanceId)
  if (existing) return existing

  const recipeNode: RecipeAccumulator = {
    instanceId,
    ownerTargetKey: item.projection.targetKey,
    planNode,
    path: Object.freeze([...item.path, instanceId]),
    batches: 0
  }
  context.recipes.set(instanceId, recipeNode)
  item.recipeId = instanceId
  addEdge(context, {
    from: item.instanceId,
    kind: 'recipe',
    detail: recipe.station,
    status: planNode.state
  }, instanceId, false)
  return recipeNode
}

export function ensureIngredientAlternatives(
  context: BuildContext,
  item: ItemAccumulator,
  recipe: RecipeAccumulator,
  requirement: CraftingPlanRequirement,
  options: readonly CraftingGraphAlternativeOption[]
): AlternativesAccumulator {
  const recipeId = recipe.planNode.recipe?.id
  if (!recipeId) {
    throw new Error(`Alternatives have no recipe: ${item.projection.targetKey}`)
  }

  const instanceId = stableId(
    'alternatives',
    'ingredient',
    item.projection.targetKey,
    recipeId,
    requirement.id
  )
  const existing = context.alternatives.get(instanceId)
  if (existing) return existing

  const alternatives: AlternativesAccumulator = {
    instanceId,
    alternativeKind: 'ingredient',
    ownerTargetKey: item.projection.targetKey,
    planNode: recipe.planNode,
    requirement,
    options,
    path: Object.freeze([...recipe.path, instanceId]),
    count: 0,
    cyclic: false
  }
  context.alternatives.set(instanceId, alternatives)
  return alternatives
}

export function ensureSources(
  context: BuildContext,
  item: ItemAccumulator,
  planNode: CraftingPlanNode
): void {
  const sources = groupCraftingSources(planNode.target.sources ?? [])
  if (!sources.length) return

  if (sources.length === 1) {
    ensureSingleSource(context, item, planNode, sources[0]!)
    return
  }

  const instanceId = stableId(
    'alternatives',
    'source',
    item.projection.targetKey
  )
  if (!context.alternatives.has(instanceId)) {
    context.alternatives.set(instanceId, {
      instanceId,
      alternativeKind: 'source',
      ownerTargetKey: item.projection.targetKey,
      planNode,
      options: Object.freeze(sources.map(source => Object.freeze({
        instanceId: stableId('option', 'source', item.projection.targetKey, source.id),
        key: source.id,
        title: source.title,
        detail: source.detail,
        path: source.path,
        sourceKind: source.kind,
        selected: false
      }))),
      path: Object.freeze([...item.path, instanceId]),
      count: 1,
      cyclic: false
    })
  }

  addEdge(context, {
    from: item.instanceId,
    kind: 'source',
    detail: 'Выберите удобный способ',
    status: planNode.state
  }, instanceId, false)
}

export function addEdge(
  context: BuildContext,
  relation: ParentRelation,
  to: string,
  cyclic: boolean
): void {
  const key = [
    relation.from,
    relation.kind,
    relation.role ?? '',
    to
  ].join('|')
  const existing = context.edges.get(key)
  if (existing) {
    if (relation.count !== undefined) {
      existing.count = relation.countMode === 'max'
        ? Math.max(existing.count ?? 0, relation.count)
        : (existing.count ?? 0) + relation.count
    }
    existing.cyclic ||= cyclic
    return
  }

  context.edges.set(key, {
    id: stableId(
      'edge',
      relation.from,
      relation.kind,
      relation.role ?? '',
      to
    ),
    from: relation.from,
    to,
    kind: relation.kind,
    role: relation.role,
    detail: relation.detail,
    status: relation.status,
    count: relation.count,
    cyclic
  })
}

export function itemMissingCount(item: ItemAccumulator): number {
  return Math.max(
    0,
    item.required - Math.min(
      item.projection.ownedAvailable,
      item.required
    )
  )
}

function ensureSingleSource(
  context: BuildContext,
  item: ItemAccumulator,
  planNode: CraftingPlanNode,
  source: NonNullable<CraftingPlanNode['target']['sources']>[number]
): SourceAccumulator {
  const instanceId = stableId(
    'source',
    item.projection.targetKey,
    source.id
  )
  let sourceNode = context.sources.get(instanceId)
  if (!sourceNode) {
    sourceNode = {
      instanceId,
      ownerTargetKey: item.projection.targetKey,
      planNode,
      source,
      path: Object.freeze([...item.path, instanceId])
    }
    context.sources.set(instanceId, sourceNode)
  }

  addEdge(context, {
    from: item.instanceId,
    kind: 'source',
    detail: source.detail,
    status: planNode.state
  }, sourceNode.instanceId, false)
  return sourceNode
}
