import type {
  CraftingPlanNode,
  CraftingPlanState,
  CraftingRecipeView,
  CraftingSourceView,
  CraftingTargetView
} from './crafting'
import type { RecipeRequirementRole } from './wiki'

export type CraftingGraphNodeKind
  = 'item' | 'recipe' | 'source' | 'alternatives'

export type CraftingGraphAlternativeKind = 'ingredient' | 'source'

export type CraftingGraphEdgeKind
  = 'recipe' | 'requirement' | 'alternative' | 'selected-option' | 'source'

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
  readonly recipeIds: readonly string[]
  readonly detailsPath?: string
}

export interface CraftingGraphRecipeNode extends CraftingGraphNodeBase {
  readonly kind: 'recipe'
  readonly targetKey: string
  readonly recipe: CraftingRecipeView
  readonly batches: number
  readonly resultCount: number
  readonly producedCount: number
  readonly surplus: number
  readonly detailsPath?: string
}

export interface CraftingGraphAlternativeOption {
  readonly instanceId: string
  readonly key: string
  readonly title: string
  readonly detail: string
  readonly icon?: string
  readonly path?: string
  readonly sourceKind?: CraftingSourceView['kind']
  readonly selected: boolean
  readonly targetKey?: string
}

export interface CraftingGraphAlternativesNode extends CraftingGraphNodeBase {
  readonly kind: 'alternatives'
  readonly alternativeKind: CraftingGraphAlternativeKind
  readonly ownerTargetKey: string
  readonly requirementId?: string
  readonly role?: RecipeRequirementRole
  readonly count?: number
  readonly selectedOptionKey?: string
  readonly options: readonly CraftingGraphAlternativeOption[]
}

export interface CraftingGraphSourceNode extends CraftingGraphNodeBase {
  readonly kind: 'source'
  readonly source: CraftingSourceView
  readonly targetKey: string
}

export type CraftingGraphNode
  = CraftingGraphItemNode
  | CraftingGraphRecipeNode
  | CraftingGraphAlternativesNode
  | CraftingGraphSourceNode

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
