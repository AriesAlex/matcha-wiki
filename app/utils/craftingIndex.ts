import type {
  AcquisitionTarget
} from '../types/acquisition'
import type {
  CraftingSourceView,
  CraftingIndex,
  CraftingPlannerSupplement,
  CraftingRecipeView,
  CraftingTargetView
} from '../types/crafting'
import { allTradeOffers } from '../types/entities'
import type {
  IngredientView,
  ItemRelationStackView,
  ItemView,
  StackView,
  WikiCatalog
} from '../types/wiki'
import {
  formatIdentifier,
  recipePath,
  stripMinecraftFormatting
} from './format'
import {
  normalizeItemName,
  resolveIngredientItem,
  resolveStackItem
} from './itemReference'
import { stationResourceForRecipe } from './craftingStation'
import {
  acquisitionMethodsForTarget,
  acquisitionMethodsForItemSlug,
  acquisitionSourceForMethod,
  resolveAcquisitionTargetForStack
} from './acquisition'

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

export function targetForItem(
  item: ItemView,
  catalog: WikiCatalog
): CraftingTargetView {
  const sources = acquisitionMethodsForItemSlug(
    catalog.acquisition,
    item.slug
  ).map(({ method, source, sourcePath }) => ({
    id: method.id,
    kind: method.kind === 'mob' ? 'mob' as const : 'location' as const,
    title: source.name,
    detail: method.action,
    path: sourcePath
  }))
  const tradeSources = allTradeOffers(catalog.traders).flatMap((offer) => {
    const resultItem = resolveStackItem(catalog.items, offer.result.stack)
    if (resultItem?.id !== item.id) return []

    return [{
      id: offer.id,
      kind: 'trader' as const,
      title: offer.traderTitle,
      detail: tradeOfferDetail(offer.costs, offer.traderTitle),
      path: offer.to
    }]
  })
  const allSources = dedupeSources([...sources, ...tradeSources])

  return {
    key: `item:${item.slug}`,
    kind: 'item',
    resourceId: item.id,
    title: item.title,
    icon: item.icon,
    item,
    obtainHint: allSources[0]?.detail ?? itemAcquisitionHint(item),
    sources: allSources
  }
}

export function targetForStack(
  catalog: WikiCatalog,
  stack: StackView
): CraftingTargetView | undefined {
  const item = resolveStackItem(catalog.items, stack)
  if (item) return targetForItem(item, catalog)
  const acquisitionTarget = resolveAcquisitionTargetForStack(
    catalog.acquisition,
    stack
  )
  if (acquisitionTarget) {
    return targetForAcquisitionTarget(acquisitionTarget, catalog)
  }
  if (!stack.carrier) return undefined

  return targetForResource(
    catalog,
    stack.carrier,
    stack.name,
    stack.icon
  )
}

export function targetForAcquisitionTarget(
  target: AcquisitionTarget,
  catalog: WikiCatalog
): CraftingTargetView {
  const item = target.itemSlug
    ? catalog.items.find(entry => entry.slug === target.itemSlug)
    : undefined
  if (item) return targetForItem(item, catalog)

  const sources = acquisitionMethodsForTarget(
    catalog.acquisition,
    target.id
  ).map(({ method, source, sourcePath }) => ({
    id: method.id,
    kind: method.kind === 'mob' ? 'mob' as const : 'location' as const,
    title: source.name,
    detail: method.action,
    path: sourcePath
  }))
  const components = target.stack.components ?? {}
  const resourceId = target.stack.model ?? target.stack.carrier

  return {
    key: target.stack.model || Object.keys(components).length
      ? `acquisition:${target.id}`
      : `resource:${resourceId}`,
    kind: 'resource',
    resourceId,
    title: target.title,
    icon: target.stack.icon,
    vanillaName: target.vanillaName,
    obtainHint: sources[0]?.detail,
    sources
  }
}

export function targetsForIngredient(
  catalog: WikiCatalog,
  ingredient: IngredientView
): CraftingTargetView[] {
  const resolvedItem = resolveIngredientItem(catalog.items, ingredient)
  if (resolvedItem) return [targetForItem(resolvedItem, catalog)]

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
    if (exactItem) return targetForItem(exactItem, catalog)

    const icon = ingredient.icons.length === ingredient.ids.length
      ? ingredient.icons[index]
      : ingredient.icons[0]
    return targetForResource(catalog, id, ingredient.label, icon)
  })

  const uniqueTargets = [...new Map(targets.map(target => [target.key, target])).values()]
  const distinctTitles = new Set(uniqueTargets.map(target => (
    stripMinecraftFormatting(target.title)
  )))
  if (uniqueTargets.length > 1 && distinctTitles.size === 1) {
    return [groupAlternativeTargets(ingredient, uniqueTargets)]
  }

  return uniqueTargets
}

export function targetForResource(
  catalog: WikiCatalog,
  resourceId: string,
  fallbackTitle?: string,
  icon?: string
): CraftingTargetView {
  const glossary = catalog.ingredientGlossary[resourceId]
  const exactItem = uniqueItem(catalog.items.filter(item => (
    item.id === resourceId
    && item.carrier === resourceId
  )))
  if (exactItem) return targetForItem(exactItem, catalog)

  const vanillaNames = new Set(
    [glossary?.name, glossary?.vanillaName]
      .filter((name): name is string => Boolean(name))
      .map(normalizeItemName)
  )
  const customizedVanillaItem = uniqueItem(catalog.items.filter(item => (
    item.id.startsWith('recipe-output:')
    && item.carrier === resourceId
    && vanillaNames.has(normalizeItemName(item.title))
  )))
  if (customizedVanillaItem) {
    return targetForItem(customizedVanillaItem, catalog)
  }

  const blockStateItem = uniqueItem(catalog.items.filter(item => (
    item.isCustom
    && item.carrier === resourceId
    && !item.model
    && Object.keys(item.components).length > 0
    && Object.keys(item.components).every(key => key === 'minecraft:block_state')
  )))
  if (blockStateItem) return targetForItem(blockStateItem, catalog)

  const title = glossary?.name
    ?? fallbackTitle
    ?? formatIdentifier(resourceId)
  const vanillaName = glossary?.vanillaName
  const sources = resourceSources(catalog, resourceId)

  return {
    key: `resource:${resourceId}`,
    kind: 'resource',
    resourceId,
    title,
    icon: icon ?? glossary?.icon,
    vanillaName: vanillaName && vanillaName !== title
      ? vanillaName
      : undefined,
    obtainHint: sources[0]?.detail ?? glossary?.obtainHint,
    sources
  }
}

function groupAlternativeTargets(
  ingredient: IngredientView,
  targets: CraftingTargetView[]
): CraftingTargetView {
  const hints = [...new Set(targets
    .map(target => target.obtainHint)
    .filter((hint): hint is string => Boolean(hint)))]
  const count = targets.length
  const sources = [...new Map(targets
    .flatMap(target => target.sources ?? [])
    .map(source => [source.id, source] as const)).values()]

  return {
    key: `resource:alternatives:${ingredient.ids.slice().sort().join('|')}`,
    kind: 'resource',
    resourceId: ingredient.ids.join('|'),
    title: ingredient.label,
    icon: ingredient.icons[0],
    sources,
    obtainHint: count <= 3 && hints.length === 1
      ? hints[0]
      : `Подойдёт любой из ${count} вариантов. Выбирайте тот, который уже есть или проще получить.`
  }
}

function isCraftableResult(
  stack: StackView,
  target: CraftingTargetView
): boolean {
  if (target.kind === 'item') return true

  return !stack.model
}

function itemAcquisitionHint(item: ItemView): string | undefined {
  const first = item.obtainedFrom[0]
  if (!first) return undefined

  return `${first.title}. ${first.description}`
}

function uniqueItem(items: ItemView[]): ItemView | undefined {
  return items.length === 1 ? items[0] : undefined
}

function dedupeSources(
  sources: CraftingSourceView[]
): CraftingSourceView[] {
  return [...new Map(sources.map(source => [source.id, source])).values()]
}

function tradeOfferDetail(
  costs: ItemRelationStackView[],
  traderTitle: string
): string {
  const price = costs
    .map(({ stack, title }) => (
      `${stack.count > 1 ? `${stack.count} × ` : ''}${title}`
    ))
    .join(' + ')
  return price
    ? `Обменяйте ${price} у торговца «${traderTitle}».`
    : `Получите у торговца «${traderTitle}».`
}

function resourceSources(
  catalog: WikiCatalog,
  resourceId: string
): CraftingSourceView[] {
  const tradeSources = allTradeOffers(catalog.traders).flatMap((offer) => {
    if (
      offer.result.stack.carrier !== resourceId
      || offer.result.stack.model
    ) {
      return []
    }

    return [{
      id: offer.id,
      kind: 'trader' as const,
      title: offer.traderTitle,
      detail: tradeOfferDetail(offer.costs, offer.traderTitle),
      path: offer.to
    }]
  })
  const acquisition = catalog.acquisition
  if (!acquisition) return dedupeSources(tradeSources)

  const targetIds = new Set(acquisition.targets
    .filter(target => (
      !target.itemSlug
      && target.stack.carrier === resourceId
      && !target.stack.model
    ))
    .map(target => target.id))
  const worldSources = acquisition.methods.flatMap((method) => {
    if (!targetIds.has(method.targetId)) return []
    const resolved = acquisitionSourceForMethod(acquisition, method)
    if (!resolved) return []

    return [{
      id: method.id,
      kind: method.kind === 'mob' ? 'mob' as const : 'location' as const,
      title: resolved.source.name,
      detail: method.action,
      path: resolved.sourcePath
    }]
  })

  return dedupeSources([...worldSources, ...tradeSources])
}

function resourceTargetKey(resourceId: string): string {
  return `resource:${resourceId}`
}
