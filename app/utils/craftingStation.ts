import type {
  RecipeRequirementView
} from '../types/wiki'

interface CraftingStationInput {
  type: string
  pattern?: string[]
  requirements: RecipeRequirementView[]
}

export function stationResourceForRecipe(
  recipe: CraftingStationInput
): string | undefined {
  const kind = recipe.type.replace(/^.*:/, '')

  if (kind === 'crafting_shaped') {
    const height = recipe.pattern?.length ?? 0
    const width = Math.max(0, ...(recipe.pattern?.map(row => row.length) ?? []))
    return height > 2 || width > 2
      ? 'minecraft:crafting_table'
      : undefined
  }

  if (kind === 'crafting_shapeless') {
    const ingredientCount = recipe.requirements
      .reduce((total, requirement) => total + requirement.count, 0)
    return ingredientCount > 4
      ? 'minecraft:crafting_table'
      : undefined
  }

  return {
    blasting: 'minecraft:blast_furnace',
    campfire_cooking: 'minecraft:campfire',
    smelting: 'minecraft:furnace',
    smithing_transform: 'minecraft:smithing_table',
    smoking: 'minecraft:smoker',
    stonecutting: 'minecraft:stonecutter'
  }[kind]
}
