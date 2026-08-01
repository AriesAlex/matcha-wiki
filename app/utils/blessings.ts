import type {
  RecipeRequirementView,
  RecipeView,
  WikiCatalog
} from '../types/wiki'
import { resolveStackItem } from './itemReference'

interface EnchantmentLevel {
  id: string
  name: string
  level: number
  label: string
  description?: string
}

export interface BlessingRow {
  id: string
  title: string
  icon: string
  recipePath: string
  materials: RecipeRequirementView[]
  enchantments: EnchantmentLevel[]
}

const romanLevels = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X'
]

export function buildBlessingRows(catalog: WikiCatalog): BlessingRow[] {
  return catalog.recipes.flatMap((recipe) => {
    if (!isBlessingRecipe(recipe) || !recipe.result) return []

    const item = resolveStackItem(catalog.items, recipe.result)
    if (!item || !recipe.result.icon || !item.enchantments.length) return []

    return [{
      id: recipe.id,
      title: item.title,
      icon: recipe.result.icon,
      recipePath: `/recipes/${recipe.namespace}/${recipe.path}`,
      materials: recipe.requirements.filter(requirement => (
        !requirement.ingredient.ids.includes('minecraft:enchanted_book')
      )),
      enchantments: item.enchantments.map(enchantment => ({
        ...enchantment,
        label: `${enchantment.name} ${romanLevels[enchantment.level - 1]
          ?? enchantment.level}`
      }))
    }]
  })
}

export function isBlessingRecipe(recipe: RecipeView): boolean {
  return recipe.namespace === 'blessings'
    && recipe.id !== 'blessings:hell_bound_book'
    && Boolean(recipe.result)
}
