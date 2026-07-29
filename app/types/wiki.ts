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
  result?: StackView
  experience?: number
  cookingTime?: number
}

export interface ItemSource {
  kind: string
  label: string
  path: string
}

export interface ItemView {
  id: string
  slug: string
  model: string
  carrier: string
  name: string
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
  items: ItemView[]
  recipes: RecipeView[]
  advancements: AdvancementView[]
}
