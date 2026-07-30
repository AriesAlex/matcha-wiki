import type {
  IngredientView,
  RecipeRequirementView
} from '../../app/types/wiki'

export const smithingRequirementRoles = [
  'template',
  'base',
  'addition'
] as const

export type SmithingIngredients = Partial<Record<
  typeof smithingRequirementRoles[number],
  IngredientView
>>

interface RecipeRequirementInput {
  type: string
  pattern?: string[]
  key?: Record<string, IngredientView>
  ingredients: IngredientView[]
  smithing: SmithingIngredients
}

export function buildRecipeRequirements(
  input: RecipeRequirementInput
): RecipeRequirementView[] {
  const kind = input.type.replace(/^.*:/, '')

  if (kind === 'crafting_shaped') {
    return shapedRequirements(input.pattern, input.key)
  }

  if (kind === 'crafting_shapeless') {
    return shapelessRequirements(input.ingredients)
  }

  if (kind.startsWith('smithing_')) {
    return smithingRequirements(input.smithing)
  }

  return input.ingredients.map((ingredient, index) => ({
    id: input.ingredients.length === 1 ? 'ingredient' : `ingredient:${index}`,
    role: 'ingredient',
    count: 1,
    ingredient
  }))
}

function shapedRequirements(
  pattern: string[] | undefined,
  key: Record<string, IngredientView> | undefined
): RecipeRequirementView[] {
  if (!pattern || !key) {
    return []
  }

  const counts = new Map<string, number>()
  for (const row of pattern) {
    for (const symbol of row) {
      if (symbol !== ' ' && key[symbol]) {
        counts.set(symbol, (counts.get(symbol) ?? 0) + 1)
      }
    }
  }

  return [...counts].map(([symbol, count]) => ({
    id: `key:${symbol}`,
    role: 'ingredient',
    count,
    ingredient: key[symbol]
  }))
}

function shapelessRequirements(
  ingredients: IngredientView[]
): RecipeRequirementView[] {
  const groups = new Map<string, {
    ingredient: IngredientView
    count: number
  }>()

  for (const ingredient of ingredients) {
    const signature = ingredientSignature(ingredient)
    const group = groups.get(signature)
    if (group) {
      group.count += 1
    } else {
      groups.set(signature, { ingredient, count: 1 })
    }
  }

  return [...groups].map(([signature, group]) => ({
    id: `ingredient:${signature}`,
    role: 'ingredient',
    count: group.count,
    ingredient: group.ingredient
  }))
}

function smithingRequirements(
  ingredients: SmithingIngredients
): RecipeRequirementView[] {
  return smithingRequirementRoles.flatMap((role) => {
    const ingredient = ingredients[role]
    return ingredient
      ? [{
          id: role,
          role,
          count: 1,
          ingredient
        }]
      : []
  })
}

function ingredientSignature(ingredient: IngredientView): string {
  const ids = [...ingredient.ids].sort().join('|')
  const source = ingredient.tag
    ? `tag:${ingredient.tag};items:${ids}`
    : ids
      ? `items:${ids}`
      : `label:${ingredient.label}`

  return source
}
