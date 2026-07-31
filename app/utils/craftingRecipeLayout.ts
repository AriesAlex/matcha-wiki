import type { CraftingRecipeLayout } from '../types/crafting'
import type { IngredientView } from '../types/wiki'
import { stripMinecraftFormatting } from './format'

export type CraftingRecipeDisplayKind = 'grid' | 'smithing' | 'single'

interface RecipeLike extends CraftingRecipeLayout {
  readonly type: string
}

export function craftingRecipeDisplayKind(
  recipe: RecipeLike
): CraftingRecipeDisplayKind {
  const kind = recipeKind(recipe.type)
  if (kind === 'crafting_shaped' || kind === 'crafting_shapeless') {
    return 'grid'
  }
  return kind.startsWith('smithing_') ? 'smithing' : 'single'
}

export function craftingRecipeGridSlots(
  recipe: RecipeLike
): Array<IngredientView | null> {
  const kind = recipeKind(recipe.type)
  if (kind === 'crafting_shaped') {
    return Array.from({ length: 9 }, (_, index) => {
      const row = recipe.pattern?.[Math.floor(index / 3)] ?? ''
      const symbol = row.charAt(index % 3)
      return symbol && symbol !== ' '
        ? recipe.key?.[symbol] ?? null
        : null
    })
  }
  if (kind === 'crafting_shapeless') {
    return Array.from(
      { length: 9 },
      (_, index) => recipe.ingredients[index] ?? null
    )
  }
  return []
}

export function craftingRecipeCompactSlots(
  recipe: RecipeLike
): IngredientView[] {
  return craftingRecipeDisplayKind(recipe) === 'smithing'
    ? recipe.ingredients.slice(0, 3)
    : recipe.ingredients.slice(0, 1)
}

export function craftingRecipeLayoutLabel(recipe: RecipeLike): string {
  const displayKind = craftingRecipeDisplayKind(recipe)
  if (displayKind === 'grid') {
    const rows = Array.from({ length: 3 }, (_, rowIndex) => (
      craftingRecipeGridSlots(recipe)
        .slice(rowIndex * 3, rowIndex * 3 + 3)
        .map(ingredientName)
        .join(', ')
    ))
    return `Сетка 3 на 3: ${rows.map((row, index) => (
      `ряд ${index + 1} — ${row}`
    )).join('; ')}`
  }

  const names = craftingRecipeCompactSlots(recipe).map(ingredientName)
  if (displayKind === 'smithing') {
    const roles = ['шаблон', 'основа', 'добавка']
    return names.length
      ? names.map((name, index) => `${roles[index]} — ${name}`).join('; ')
      : 'Кузнечный рецепт без известных ингредиентов'
  }

  return names.length
    ? `Ингредиент: ${names.join(', ')}`
    : 'Ингредиенты неизвестны'
}

export function recipeKind(type: string): string {
  return type.replace(/^.*:/, '')
}

function ingredientName(ingredient: IngredientView | null): string {
  return ingredient
    ? stripMinecraftFormatting(ingredient.label)
    : 'пусто'
}
