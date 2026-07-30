import type {
  CraftingIndex,
  CraftingPlannerSupplement,
  CraftingRecipeView,
  CraftingTargetView
} from '../types/crafting'
import type {
  IngredientView,
  ItemView,
  StackView,
  WikiCatalog
} from '../types/wiki'
import {
  formatIdentifier,
  recipePath
} from './format'
import {
  resolveIngredientItem,
  resolveStackItem
} from './itemReference'
import { stationResourceForRecipe } from './craftingStation'

export function createCraftingIndex(
  catalog: WikiCatalog,
  supplement?: CraftingPlannerSupplement
): CraftingIndex {
  const recipesById = new Map<string, CraftingRecipeView>()

  for (const [resultId, recipes] of Object.entries(
    supplement?.recipesByResult ?? {}
  )) {
    for (const recipe of recipes) {
      recipesById.set(recipe.id, {
        ...recipe,
        origin: 'vanilla',
        targetKey: resourceTargetKey(resultId)
      })
    }
  }

  for (const recipe of catalog.recipes) {
    if (!recipe.result) continue

    const target = targetForStack(catalog, recipe.result)
    if (!target || !isCraftableResult(recipe.result, target)) continue

    recipesById.set(recipe.id, {
      id: recipe.id,
      origin: 'pack',
      type: recipe.type,
      station: recipe.station,
      targetKey: target.key,
      resultCount: Math.max(1, recipe.result.count),
      requirements: recipe.requirements,
      stationResourceId: stationResourceForRecipe(recipe),
      detailsPath: recipePath(recipe.namespace, recipe.path)
    })
  }

  const recipesByTarget = new Map<string, CraftingRecipeView[]>()

  for (const recipe of recipesById.values()) {
    const recipes = recipesByTarget.get(recipe.targetKey) ?? []
    recipes.push(recipe)
    recipesByTarget.set(recipe.targetKey, recipes)
  }

  for (const recipes of recipesByTarget.values()) {
    recipes.sort((left, right) => left.id.localeCompare(right.id))
  }

  const preferredRecipeByTarget = new Map(
    Object.entries(supplement?.preferredRecipeByResult ?? {})
      .map(([resultId, recipeId]) => [resourceTargetKey(resultId), recipeId])
  )

  return {
    catalog,
    recipesByTarget,
    preferredRecipeByTarget
  }
}

export function targetForItem(item: ItemView): CraftingTargetView {
  return {
    key: `item:${item.slug}`,
    kind: 'item',
    resourceId: item.id,
    title: item.title,
    icon: item.icon,
    item,
    obtainHint: itemAcquisitionHint(item)
  }
}

export function targetForStack(
  catalog: WikiCatalog,
  stack: StackView
): CraftingTargetView | undefined {
  const item = resolveStackItem(catalog.items, stack)
  if (item) return targetForItem(item)
  if (!stack.carrier) return undefined

  return targetForResource(
    catalog,
    stack.carrier,
    stack.name,
    stack.icon
  )
}

export function targetsForIngredient(
  catalog: WikiCatalog,
  ingredient: IngredientView
): CraftingTargetView[] {
  const resolvedItem = resolveIngredientItem(catalog.items, ingredient)
  if (resolvedItem) return [targetForItem(resolvedItem)]

  if (!ingredient.ids.length) {
    const resourceId = ingredient.tag ? `#${ingredient.tag}` : ingredient.label
    return [{
      key: `resource:${resourceId}`,
      kind: 'resource',
      resourceId,
      title: ingredient.label,
      icon: ingredient.icons[0],
      obtainHint: ingredient.tag
        ? `Подойдёт любой предмет из группы «${ingredient.label}».`
        : undefined
    }]
  }

  const targets = ingredient.ids.map((id, index) => {
    const exactItem = uniqueItem(catalog.items.filter(item => (
      item.id === id || item.model === id
    )))
    if (exactItem) return targetForItem(exactItem)

    const icon = ingredient.icons.length === ingredient.ids.length
      ? ingredient.icons[index]
      : ingredient.icons[0]
    return targetForResource(catalog, id, ingredient.label, icon)
  })

  return [...new Map(targets.map(target => [target.key, target])).values()]
}

export function targetForResource(
  catalog: WikiCatalog,
  resourceId: string,
  fallbackTitle?: string,
  icon?: string
): CraftingTargetView {
  const glossary = catalog.ingredientGlossary[resourceId]
  const title = glossary?.name
    ?? fallbackTitle
    ?? formatIdentifier(resourceId)
  const vanillaName = glossary?.vanillaName

  return {
    key: `resource:${resourceId}`,
    kind: 'resource',
    resourceId,
    title,
    icon,
    vanillaName: vanillaName && vanillaName !== title
      ? vanillaName
      : undefined,
    obtainHint: glossary?.obtainHint
  }
}

function isCraftableResult(
  stack: StackView,
  target: CraftingTargetView
): boolean {
  if (target.kind === 'item') return true

  return !stack.model && Object.keys(stack.components ?? {}).length === 0
}

function itemAcquisitionHint(item: ItemView): string | undefined {
  if (!item.obtainedFrom.length) return undefined

  const sources = [...new Set(item.obtainedFrom.map(relation => relation.title))]
  if (sources.length === 1) return `Можно получить: ${sources[0]}.`
  if (sources.length > 1) return `Можно получить несколькими способами: ${sources.slice(0, 3).join(', ')}.`
  return undefined
}

function uniqueItem(items: ItemView[]): ItemView | undefined {
  return items.length === 1 ? items[0] : undefined
}

function resourceTargetKey(resourceId: string): string {
  return `resource:${resourceId}`
}
