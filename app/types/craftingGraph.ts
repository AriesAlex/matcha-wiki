import type {
  CraftingPlanNode,
  CraftingPlanState,
  CraftingRecipeView,
  CraftingSourceView,
  CraftingTargetView
} from './crafting'
import type { RecipeRequirementRole } from './wiki'

export type CraftingGraphNodeKind = 'item' | 'method' | 'context'

export type CraftingGraphMethodKind =
  | 'recipe'
  | 'obtain'
  | 'unknown'
  | 'cycle'

export type CraftingGraphContextKind = 'choice' | 'station' | 'source'

export type CraftingGraphEdgeKind =
  | 'method'
  | 'requirement'
  | 'selected-option'
  | 'station'
  | 'context'

export interface CraftingGraphDemand {
  readonly required: number
  readonly owned: number
  readonly missing: number
  readonly batches: number
  readonly produced: number
  readonly surplus: number
}

export interface CraftingGraphNodeBase {
  readonly instanceId: string
  readonly kind: CraftingGraphNodeKind
  readonly planNode: CraftingPlanNode
  readonly title: string
  readonly detail: string
  readonly status: CraftingPlanState
  readonly path: readonly string[]
  readonly cyclic: boolean
}

export interface CraftingGraphItemNode extends CraftingGraphNodeBase {
  readonly kind: 'item'
  readonly target: CraftingTargetView
  readonly demand: CraftingGraphDemand
  readonly occurrences: number
  readonly methodIds: readonly string[]
  readonly detailsPath?: string
}

export interface CraftingGraphMethodNode extends CraftingGraphNodeBase {
  readonly kind: 'method'
  readonly methodKind: CraftingGraphMethodKind
  readonly targetKey: string
  readonly recipe?: CraftingRecipeView
  readonly batches: number
  readonly resultCount: number
  readonly producedCount: number
  readonly detailsPath?: string
}

export interface CraftingGraphChoiceOption {
  readonly instanceId: string
  readonly key: string
  readonly target: CraftingTargetView
  readonly selected: boolean
  readonly detail: string
}

export interface CraftingGraphChoiceNode extends CraftingGraphNodeBase {
  readonly kind: 'context'
  readonly contextKind: 'choice'
  readonly requirementId: string
  readonly role: RecipeRequirementRole
  readonly count: number
  readonly selectedOptionKey: string
  readonly options: readonly CraftingGraphChoiceOption[]
}

export interface CraftingGraphStationNode extends CraftingGraphNodeBase {
  readonly kind: 'context'
  readonly contextKind: 'station'
  readonly resourceId: string
  readonly target: CraftingTargetView
  readonly itemNodeId: string
}

export interface CraftingGraphSourceNode extends CraftingGraphNodeBase {
  readonly kind: 'context'
  readonly contextKind: 'source'
  readonly source: CraftingSourceView
  readonly targetKey: string
}

export type CraftingGraphContextNode =
  | CraftingGraphChoiceNode
  | CraftingGraphStationNode
  | CraftingGraphSourceNode

export type CraftingGraphNode =
  | CraftingGraphItemNode
  | CraftingGraphMethodNode
  | CraftingGraphContextNode

export interface CraftingGraphEdge {
  readonly id: string
  readonly from: string
  readonly to: string
  readonly kind: CraftingGraphEdgeKind
  readonly count?: number
  readonly role?: RecipeRequirementRole
  readonly detail: string
  readonly status: CraftingPlanState
  readonly cyclic: boolean
}

export interface CraftingGraphModel {
  readonly rootId: string
  readonly nodes: readonly CraftingGraphNode[]
  readonly edges: readonly CraftingGraphEdge[]
}

export interface CraftingGraphNodeSize {
  readonly width: number
  readonly height: number
}

export interface CraftingGraphNodeView {
  readonly instanceId: string
  readonly node: CraftingGraphNode
  readonly planNode: CraftingPlanNode
  readonly kind: CraftingGraphNodeKind
  readonly path: readonly string[]
  readonly detail: string
  readonly status: CraftingPlanState
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly depth: number
}

export interface CraftingGraphEdgeView extends CraftingGraphEdge {
  readonly path: string
}

export interface CraftingGraphBounds {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface CraftingGraphView {
  readonly rootId: string
  readonly nodes: readonly CraftingGraphNodeView[]
  readonly edges: readonly CraftingGraphEdgeView[]
  readonly bounds: CraftingGraphBounds
}

export interface CraftingGraphLayoutOptions {
  readonly columnGap?: number
  readonly rowGap?: number
  readonly padding?: number
}
