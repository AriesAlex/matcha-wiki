export interface ItemEffect {
  id: string
  name: string
  level: number
  durationSeconds: number
}

export interface ItemAttribute {
  id: string
  name: string
  amount: number
  operation: string
  slot?: string
}

export interface StackView {
  carrier: string
  count: number
  model?: string
  name: string
  nameKey?: string
  icon?: string
  components?: Record<string, unknown>
}

export interface IngredientView {
  ids: string[]
  tag?: string
  label: string
  icons: string[]
}

export type RecipeRequirementRole =
  | 'ingredient'
  | 'template'
  | 'base'
  | 'addition'

export interface RecipeRequirementView {
  id: string
  role: RecipeRequirementRole
  count: number
  ingredient: IngredientView
}

export interface IngredientGlossaryEntry {
  id: string
  name: string
  vanillaName?: string
  obtainHint?: string
  curated?: boolean
}

export interface RecipeView {
  id: string
  namespace: string
  path: string
  sourcePath: string
  type: string
  station: string
  category?: string
  group?: string
  pattern?: string[]
  key?: Record<string, IngredientView>
  ingredients: IngredientView[]
  requirements: RecipeRequirementView[]
  result?: StackView
  experience?: number
  cookingTime?: number
}

export interface ItemSource {
  kind: string
  label: string
  path: string
}

export interface ItemGuide {
  summary: string
  note?: string
}

export interface ItemRelationStackView {
  stack: StackView
  title: string
}

export interface ItemRelationView {
  kind: 'recipe' | 'trade' | 'loot'
  title: string
  description: string
  icon?: string
  to?: string
  context?: string
  contextDetail?: string
  cost?: ItemRelationStackView[]
  result?: ItemRelationStackView
  details?: string[]
  technical?: boolean
  sourcePath: string
}

export interface ItemRecipeUse {
  recipeId: string
  technical?: boolean
}

export interface ItemView {
  id: string
  slug: string
  model?: string
  carrier: string
  name: string
  title: string
  nameKey?: string
  description?: string
  icon?: string
  category: string
  isCustom: boolean
  lore: string[]
  effects: ItemEffect[]
  attributes: ItemAttribute[]
  componentKeys: string[]
  components: Record<string, unknown>
  recipeIds: string[]
  guide?: ItemGuide
  obtainedFrom: ItemRelationView[]
  usedIn: ItemRelationView[]
  recipeUses: ItemRecipeUse[]
  sources: ItemSource[]
  aliases: string[]
}

export interface AdvancementView {
  id: string
  slug: string
  section: string
  parent?: string
  title: string
  description: string
  icon: StackView
  frame: string
  hidden: boolean
  sourcePath: string
  guide?: AdvancementGuide
}

export interface AdvancementGuideLink {
  label: string
  to: string
}

export interface AdvancementGuide {
  spoiler: boolean
  note?: string
  intendedPath?: string
  exactCondition: string
  link?: AdvancementGuideLink
  entries: AdvancementGuideLink[]
  searchTerms: string[]
}

export interface WikiCatalog {
  generatedAt: string
  pack: {
    title: string
    version: string
    minecraft: string
    sha256?: string
  }
  stats: {
    files: number
    items: number
    customItems: number
    recipes: number
    advancements: number
  }
  ingredientGlossary: Record<string, IngredientGlossaryEntry>
  items: ItemView[]
  recipes: RecipeView[]
  advancements: AdvancementView[]
}

export interface WikiSearchEntry {
  kind: 'item' | 'recipe' | 'advancement'
  title: string
  description: string
  category: string
  path: string
  icon?: string
  terms: string
}

export interface WikiTocLink {
  id: string
  text: string
  depth: number
  children?: WikiTocLink[]
}
