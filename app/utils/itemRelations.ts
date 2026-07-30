import type {
  ItemRelationStackView,
  ItemRelationView,
  ItemView,
  WikiCatalog
} from '../types/wiki'
import { resolveStackItem } from './itemReference'

export function hasTradeExchange(
  relation: ItemRelationView
): relation is ItemRelationView & {
  context: string
  cost: ItemRelationStackView[]
  result: ItemRelationStackView
} {
  return relation.kind === 'trade'
    && Boolean(relation.context)
    && Boolean(relation.cost?.length)
    && relation.result !== undefined
}

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
    const ordinaryItem = catalog.ingredientGlossary[item.carrier]
    const ordinaryItemName = ordinaryItem?.vanillaName
      ?? ordinaryItem?.name
      ?? 'обычный предмет'
    const title = resultItem?.title ?? recipe.result?.name ?? 'Результат рецепта'

    return [{
      kind: 'recipe' as const,
      title,
      description: use.technical
        ? `Риск потери: рецепт принимает любой предмет вида «${ordinaryItemName}». Этот особый экземпляр будет уничтожен.`
        : 'Нужен как ингредиент.',
      icon: recipe.result?.icon,
      to: `/recipes/${recipe.namespace}/${recipe.path}`,
      context: playerStationName(recipe.station),
      result: recipe.result
        ? {
            stack: recipe.result,
            title
          }
        : undefined,
      technical: use.technical,
      sourcePath: recipe.sourcePath
    }]
  })
}

function playerStationName(station: string): string {
  return station.split(':', 1)[0]?.trim() || station
}
