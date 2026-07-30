import type {
  ItemRelationView,
  ItemView,
  WikiCatalog
} from '../types/wiki'
import { resolveStackItem } from './itemReference'

export function resolveItemRecipeUses(
  catalog: WikiCatalog,
  item: ItemView
): ItemRelationView[] {
  return item.recipeUses.flatMap((use) => {
    const recipe = catalog.recipes.find(candidate => candidate.id === use.recipeId)
    if (!recipe) return []

    const resultItem = recipe.result
      ? resolveStackItem(catalog.items, recipe.result)
      : undefined
    const carrierName = catalog.ingredientGlossary[item.carrier]?.name ?? item.carrier
    return [{
      kind: 'recipe' as const,
      title: resultItem?.title ?? recipe.result?.name ?? recipe.id,
      description: use.technical
        ? `${recipe.station} · подходит вместо «${carrierName}», потому что техническая основа предмета — ${item.carrier}.`
        : `${recipe.station} · используется как ингредиент.`,
      icon: recipe.result?.icon,
      to: `/recipes/${recipe.namespace}/${recipe.path}`,
      technical: use.technical,
      sourcePath: recipe.sourcePath
    }]
  })
}
