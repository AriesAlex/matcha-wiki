import type {
  CraftingPlanNode,
  CraftingPlanRequirement,
  CraftingPlanState,
  CraftingSourceView
} from '../../types/crafting'
import type {
  CraftingGraphAlternativeKind,
  CraftingGraphAlternativeOption,
  CraftingGraphEdgeKind
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
}

export interface ItemAccumulator {
  readonly instanceId: string
  readonly projection: ProjectionEntry
  readonly path: readonly string[]
  required: number
  cyclic: boolean
  recipeId?: string
}

export interface RecipeAccumulator {
  readonly instanceId: string
  readonly ownerTargetKey: string
  readonly planNode: CraftingPlanNode
  readonly path: readonly string[]
  batches: number
}

export interface AlternativesAccumulator {
  readonly instanceId: string
  readonly alternativeKind: CraftingGraphAlternativeKind
  readonly ownerTargetKey: string
  readonly planNode: CraftingPlanNode
  readonly requirement?: CraftingPlanRequirement
  readonly options: readonly CraftingGraphAlternativeOption[]
  readonly path: readonly string[]
  count: number
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
  readonly recipes: Map<string, RecipeAccumulator>
  readonly alternatives: Map<string, AlternativesAccumulator>
  readonly sources: Map<string, SourceAccumulator>
  readonly edges: Map<string, EdgeAccumulator>
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
