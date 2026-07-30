import type {
  CraftingPlanNode,
  CraftingPlanRequirement,
  CraftingPlanState,
  CraftingSourceView,
  CraftingTargetView
} from '../../types/crafting'
import type {
  CraftingGraphChoiceOption,
  CraftingGraphEdgeKind,
  CraftingGraphMethodKind
} from '../../types/craftingGraph'
import type { RecipeRequirementRole } from '../../types/wiki'

export interface ProjectionEntry {
  readonly targetKey: string
  readonly occurrences: CraftingPlanNode[]
  representative: CraftingPlanNode
  ownedAvailable: number
  cyclic: boolean
}

export interface Projection {
  readonly entries: Map<string, ProjectionEntry>
  readonly stationTargetByResource: Map<string, CraftingTargetView>
}

export interface ItemAccumulator {
  readonly instanceId: string
  readonly projection: ProjectionEntry
  readonly path: readonly string[]
  required: number
  cyclic: boolean
  methodId?: string
}

export interface MethodAccumulator {
  readonly instanceId: string
  readonly ownerTargetKey: string
  readonly planNode: CraftingPlanNode
  readonly methodKind: CraftingGraphMethodKind
  readonly path: readonly string[]
  batches: number
}

export interface ChoiceAccumulator {
  readonly instanceId: string
  readonly ownerTargetKey: string
  readonly requirement: CraftingPlanRequirement
  readonly options: readonly CraftingGraphChoiceOption[]
  readonly path: readonly string[]
  count: number
  cyclic: boolean
}

export interface StationAccumulator {
  readonly instanceId: string
  readonly ownerTargetKey: string
  readonly resourceId: string
  readonly targetKey: string
  readonly target: CraftingTargetView
  readonly path: readonly string[]
  cyclic: boolean
}

export interface SourceAccumulator {
  readonly instanceId: string
  readonly ownerTargetKey: string
  readonly planNode: CraftingPlanNode
  readonly source: CraftingSourceView
  readonly path: readonly string[]
}

export interface EdgeAccumulator {
  readonly id: string
  readonly from: string
  readonly to: string
  readonly kind: CraftingGraphEdgeKind
  readonly role?: RecipeRequirementRole
  readonly detail: string
  readonly status: CraftingPlanState
  count?: number
  cyclic: boolean
}

export interface ParentRelation {
  readonly from: string
  readonly kind: CraftingGraphEdgeKind
  readonly count?: number
  readonly role?: RecipeRequirementRole
  readonly detail: string
  readonly status: CraftingPlanState
  readonly countMode?: 'sum' | 'max'
}

export interface BuildContext {
  readonly projection: Projection
  readonly items: Map<string, ItemAccumulator>
  readonly methods: Map<string, MethodAccumulator>
  readonly choices: Map<string, ChoiceAccumulator>
  readonly stations: Map<string, StationAccumulator>
  readonly sources: Map<string, SourceAccumulator>
  readonly edges: Map<string, EdgeAccumulator>
  readonly stationDemanded: Set<string>
}

export interface StationDemand {
  readonly station: StationAccumulator
  readonly relation: ParentRelation
  readonly path: readonly string[]
}

export interface AccumulatedGraph {
  readonly context: BuildContext
  readonly rootId: string
}

export function itemInstanceId(targetKey: string): string {
  return stableId('item', targetKey)
}

export function stableId(prefix: string, ...parts: string[]): string {
  return [prefix, ...parts.map(part => encodeURIComponent(part))].join(':')
}

export function normalizeCount(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value))
}

export function comparePaths(
  left: readonly string[],
  right: readonly string[]
): number {
  return left.join('\u0000').localeCompare(right.join('\u0000'))
}
