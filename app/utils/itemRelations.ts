import type {
  ItemRelationStackView,
  ItemRelationView,
  ItemView,
  WikiCatalog
} from '../types/wiki'
import { stripMinecraftFormatting } from './format'
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
    const title = resultItem?.title ?? recipe.result?.name ?? 'Результат рецепта'

    return [{
      kind: 'recipe' as const,
      title,
      description: 'Нужен как ингредиент.',
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

export function playerFacingItemRecipeUses(
  catalog: WikiCatalog,
  item: ItemView
): ItemRelationView[] {
  const itemNames = new Set([
    normalizeItemName(item.name),
    normalizeItemName(item.title)
  ])

  return resolveItemRecipeUses(catalog, item).filter((relation) => {
    if (!relation.technical) return true
    const recipe = catalog.recipes.find(candidate => (
      candidate.sourcePath === relation.sourcePath
    ))
    return recipe?.requirements.some(requirement => (
      itemNames.has(normalizeItemName(requirement.ingredient.label))
    )) ?? false
  })
}

function normalizeItemName(value: string): string {
  return stripMinecraftFormatting(value)
    .toLocaleLowerCase('ru-RU')
    .replaceAll('ё', 'е')
    .trim()
}

function playerStationName(station: string): string {
  return station.split(':', 1)[0]?.trim() || station
}
