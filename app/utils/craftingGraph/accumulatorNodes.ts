import type {
  CraftingPlanNode,
  CraftingPlanRequirement
} from '../../types/crafting'
import type { CraftingGraphChoiceOption } from '../../types/craftingGraph'
import type {
  BuildContext,
  ChoiceAccumulator,
  ItemAccumulator,
  MethodAccumulator,
  ParentRelation,
  Projection,
  ProjectionEntry,
  SourceAccumulator,
  StationDemand
} from './internal'
import {
  itemInstanceId,
  stableId
} from './internal'
import {
  ensureProjectionEntry,
  fallbackStationTarget
} from './projection'
import { groupCraftingSources } from './sourceGroups'

export function createBuildContext(projection: Projection): BuildContext {
  return {
    projection,
    items: new Map(),
    methods: new Map(),
    choices: new Map(),
    stations: new Map(),
    sources: new Map(),
    edges: new Map(),
    stationDemanded: new Set()
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
    instanceId: itemInstanceId(projection.targetKey),
    projection,
    path: Object.freeze([...path]),
    required: 0,
    cyclic: projection.cyclic
  }
  context.items.set(projection.targetKey, item)
  return item
}

export function ensureRecipeMethod(
  context: BuildContext,
  item: ItemAccumulator,
  planNode: CraftingPlanNode
): MethodAccumulator {
  const recipe = planNode.recipe
  if (!recipe) {
    throw new Error(`Crafting node has no selected recipe: ${planNode.target.key}`)
  }

  const instanceId = stableId(
    'method',
    item.projection.targetKey,
    'recipe',
    recipe.id
  )
  const existing = context.methods.get(instanceId)
  if (existing) return existing

  const method: MethodAccumulator = {
    instanceId,
    ownerTargetKey: item.projection.targetKey,
    planNode,
    methodKind: 'recipe',
    path: Object.freeze([...item.path, instanceId]),
    batches: 0
  }
  context.methods.set(instanceId, method)
  item.methodId = instanceId
  addEdge(context, {
    from: item.instanceId,
    kind: 'method',
    detail: recipe.station,
    status: planNode.state
  }, instanceId, false)
  return method
}

export function ensureTerminalMethod(
  context: BuildContext,
  item: ItemAccumulator,
  planNode: CraftingPlanNode
): MethodAccumulator {
  const methodKind = planNode.state === 'cycle'
    ? 'cycle'
    : planNode.state === 'unknown'
      ? 'unknown'
      : 'obtain'
  const instanceId = stableId(
    'method',
    item.projection.targetKey,
    methodKind
  )
  const existing = context.methods.get(instanceId)
  if (existing) return existing

  const method: MethodAccumulator = {
    instanceId,
    ownerTargetKey: item.projection.targetKey,
    planNode,
    methodKind,
    path: Object.freeze([...item.path, instanceId]),
    batches: 0
  }
  context.methods.set(instanceId, method)
  item.methodId = instanceId
  addEdge(context, {
    from: item.instanceId,
    kind: 'method',
    detail: terminalMethodDetail(methodKind, planNode),
    status: planNode.state
  }, instanceId, methodKind === 'cycle')
  return method
}

export function ensureSources(
  context: BuildContext,
  item: ItemAccumulator,
  method: MethodAccumulator,
  planNode: CraftingPlanNode
): void {
  const sources = groupCraftingSources(planNode.target.sources ?? [])

  for (const source of sources) {
    const instanceId = stableId(
      'context',
      'source',
      item.projection.targetKey,
      source.id
    )
    let sourceNode: SourceAccumulator | undefined = context.sources.get(instanceId)
    if (!sourceNode) {
      sourceNode = {
        instanceId,
        ownerTargetKey: item.projection.targetKey,
        planNode,
        source,
        path: Object.freeze([...method.path, instanceId])
      }
      context.sources.set(instanceId, sourceNode)
    }

    addEdge(context, {
      from: method.instanceId,
      kind: 'context',
      detail: source.detail,
      status: planNode.state
    }, sourceNode.instanceId, false)
  }
}

export function ensureChoice(
  context: BuildContext,
  item: ItemAccumulator,
  method: MethodAccumulator,
  requirement: CraftingPlanRequirement,
  options: readonly CraftingGraphChoiceOption[]
): ChoiceAccumulator {
  const recipeId = method.planNode.recipe?.id
  if (!recipeId) {
    throw new Error(`Choice has no selected recipe: ${item.projection.targetKey}`)
  }

  const instanceId = stableId(
    'context',
    'choice',
    item.projection.targetKey,
    recipeId,
    requirement.id
  )
  const existing = context.choices.get(instanceId)
  if (existing) return existing

  const choice: ChoiceAccumulator = {
    instanceId,
    ownerTargetKey: item.projection.targetKey,
    requirement,
    options,
    path: Object.freeze([...method.path, instanceId]),
    count: 0,
    cyclic: false
  }
  context.choices.set(instanceId, choice)
  return choice
}

export function ensureStation(
  context: BuildContext,
  item: ItemAccumulator,
  method: MethodAccumulator,
  planNode: CraftingPlanNode
): StationDemand | undefined {
  const recipe = planNode.recipe
  const resourceId = recipe?.stationResourceId
  if (!recipe || !resourceId) return undefined

  const stationTarget = context.projection.stationTargetByResource.get(resourceId)
    ?? planNode.station?.target
    ?? fallbackStationTarget(resourceId, recipe.station)
  ensureProjectionEntry(context.projection, stationTarget, planNode.station)

  const instanceId = stableId('context', 'station', resourceId)
  let station = context.stations.get(instanceId)
  if (!station) {
    station = {
      instanceId,
      ownerTargetKey: item.projection.targetKey,
      resourceId,
      targetKey: stationTarget.key,
      target: stationTarget,
      path: Object.freeze([...method.path, instanceId]),
      cyclic: false
    }
    context.stations.set(instanceId, station)
  }

  addEdge(context, {
    from: method.instanceId,
    kind: 'station',
    detail: recipe.station,
    status: planNode.state
  }, station.instanceId, false)

  if (context.stationDemanded.has(station.instanceId)) return undefined
  context.stationDemanded.add(station.instanceId)
  return {
    station,
    relation: {
      from: station.instanceId,
      kind: 'context',
      count: 1,
      detail: 'Нужен один рабочий блок',
      status: planNode.station?.state ?? 'obtain',
      countMode: 'max'
    },
    path: [...station.path, itemInstanceId(station.targetKey)]
  }
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

function terminalMethodDetail(
  kind: MethodAccumulator['methodKind'],
  planNode: CraftingPlanNode
): string {
  if (kind === 'cycle') {
    return 'Этот способ требует тот же предмет выше по цепочке'
  }
  if (kind === 'unknown') {
    return 'Надёжный способ получения пока не найден'
  }
  return planNode.target.obtainHint
    ?? 'Точный источник пока не описан'
}
