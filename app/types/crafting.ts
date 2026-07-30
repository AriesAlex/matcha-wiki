import type {
  ItemView,
  RecipeRequirementRole,
  RecipeRequirementView,
  WikiCatalog
} from './wiki'

export type CraftingMode = 'craft' | 'obtain'
export type CraftingRecipeOrigin = 'pack' | 'vanilla'

export interface CraftingRecipeView {
  id: string
  origin: CraftingRecipeOrigin
  type: string
  station: string
  targetKey: string
  resultCount: number
  requirements: RecipeRequirementView[]
  stationResourceId?: string
  detailsPath?: string
}

export interface CraftingSupplementRecipe {
  id: string
  type: string
  station: string
  resultCount: number
  requirements: RecipeRequirementView[]
  stationResourceId?: string
}

export interface CraftingPlannerSupplement {
  schemaVersion: 1
  minecraftVersion: string
  preferredRecipeByResult: Record<string, string>
  recipesByResult: Record<string, CraftingSupplementRecipe[]>
}

export type CraftingSourceKind = 'location' | 'mob' | 'trader'

export interface CraftingSourceView {
  id: string
  kind: CraftingSourceKind
  title: string
  detail: string
  path: string
}

export interface CraftingTargetView {
  key: string
  kind: 'item' | 'resource'
  resourceId: string
  title: string
  icon?: string
  item?: ItemView
  vanillaName?: string
  obtainHint?: string
  sources?: readonly CraftingSourceView[]
}

export interface CraftingIndex {
  catalog: WikiCatalog
  recipesByTarget: Map<string, CraftingRecipeView[]>
  preferredRecipeByTarget: Map<string, string>
}

export interface CraftingPlanSelections {
  modeByTarget: Record<string, CraftingMode>
  recipeByTarget: Record<string, string>
  optionByRequirement: Record<string, string>
}

export interface CraftingPlanRequirement {
  id: string
  role: RecipeRequirementRole
  count: number
  label: string
  options: CraftingTargetView[]
  selectedOptionKey: string
  node: CraftingPlanNode
}

export type CraftingPlanState =
  | 'owned'
  | 'craft'
  | 'obtain'
  | 'cycle'
  | 'unknown'

export interface CraftingPlanNode {
  id: string
  target: CraftingTargetView
  requiredCount: number
  ownedCount: number
  missingCount: number
  state: CraftingPlanState
  recipeOptions: CraftingRecipeView[]
  recipe?: CraftingRecipeView
  batches: number
  resultCount: number
  station?: CraftingPlanNode
  requirements: CraftingPlanRequirement[]
}

export interface CraftingProgressState {
  ownedByTarget: Record<string, number>
  modeByTarget: Record<string, CraftingMode>
  recipeByTarget: Record<string, string>
  optionByRequirement: Record<string, string>
}
