import type { AcquisitionTarget } from '../types/acquisition'
import { allTradeOffers } from '../types/entities'
import type {
  ItemRelationView,
  RecipeView,
  StackView,
  WikiCatalog
} from '../types/wiki'
import { recipePath } from './format'
import {
  acquisitionMethodsForTarget,
  resolveAcquisitionTargetForStack
} from './acquisition'
import { resolveStackItem } from './itemReference'
import { describeItemUses } from './relationSummary'

export function recipesProducingAcquisitionTarget(
  catalog: WikiCatalog,
  target: AcquisitionTarget
): RecipeView[] {
  return catalog.recipes.filter((recipe) => {
    if (!recipe.result) return false
    return resolveAcquisitionTargetForStack(
      catalog.acquisition,
      recipe.result
    )?.id === target.id
  })
}

export function acquisitionTargetSources(
  catalog: WikiCatalog,
  target: AcquisitionTarget
): ItemRelationView[] {
  const worldSources = acquisitionMethodsForTarget(catalog.acquisition, target.id)
    .map(({ method, source, sourcePath }) => ({
      kind: 'loot' as const,
      title: source.name,
      description: `${method.context}. ${method.action}`,
      to: sourcePath,
      context: method.context,
      sourcePath: method.sourcePath
    }))
  const tradeSources = allTradeOffers(catalog.traders).flatMap((offer) => {
    const resultTarget = resolveAcquisitionTargetForStack(
      catalog.acquisition,
      offer.result.stack
    )
    if (resultTarget?.id !== target.id) return []

    return [{
      kind: 'trade' as const,
      title: offer.traderTitle,
      description: offer.level
        ? `Продаёт на ${offer.level}-м уровне.`
        : 'Продаёт этот предмет.',
      icon: offer.result.stack.icon,
      to: offer.to,
      context: offer.traderTitle,
      contextDetail: offer.level ? `${offer.level}-й уровень` : undefined,
      cost: offer.costs,
      result: offer.result,
      details: offer.details.length ? offer.details : undefined,
      sourcePath: offer.sourcePath
    }]
  })

  return dedupeRelations([...worldSources, ...tradeSources])
}

export function acquisitionTargetUses(
  catalog: WikiCatalog,
  target: AcquisitionTarget
): ItemRelationView[] {
  const recipeUses = catalog.recipes.flatMap((recipe) => {
    const acceptsTarget = recipe.ingredients.some(ingredient => (
      ingredientAcceptsTarget(ingredient, target)
    ))
    if (!acceptsTarget) return []

    const resultItem = recipe.result
      ? resolveStackItem(catalog.items, recipe.result)
      : undefined
    const title = resultItem?.title
      ?? recipe.result?.name
      ?? 'Результат рецепта'

    return [{
      kind: 'recipe' as const,
      title,
      description: 'Используется как ингредиент.',
      icon: recipe.result?.icon,
      to: recipePath(recipe.namespace, recipe.path),
      context: recipe.station,
      result: recipe.result
        ? {
            stack: recipe.result,
            title
          }
        : undefined,
      sourcePath: recipe.sourcePath
    }]
  })
  const tradeUses = allTradeOffers(catalog.traders).flatMap((offer) => {
    if (!offer.costs.some(cost => stackAccepts(cost.stack, target.stack))) {
      return []
    }

    return [{
      kind: 'trade' as const,
      title: offer.result.title,
      description: `${offer.traderTitle} принимает этот ресурс.`,
      icon: offer.result.stack.icon,
      to: offer.to,
      context: offer.traderTitle,
      sourcePath: offer.sourcePath
    }]
  })

  return dedupeRelations([...recipeUses, ...tradeUses])
}

export function acquisitionTargetSummary(
  target: AcquisitionTarget,
  uses: readonly ItemRelationView[] = []
): string {
  if (target.guide) {
    return target.guide.summary
  }

  const usage = describeItemUses(uses)
  const vanillaName = target.vanillaName
  if (
    vanillaName
    && normalizeName(vanillaName) !== normalizeName(target.stack.name)
  ) {
    return `${usage ? `${usage} ` : ''}В Matcha этот ресурс называется «${target.stack.name}». `
      + `В обычном Minecraft на его месте находится «${vanillaName}», `
      + 'поэтому знакомые рецепты и способы добычи могли измениться.'
  }

  return usage || 'Ниже показано, где получить этот ресурс.'
}

function ingredientAcceptsTarget(
  ingredient: RecipeView['ingredients'][number],
  target: AcquisitionTarget
): boolean {
  if (
    target.stack.model
    && ingredient.ids.includes(target.stack.model)
  ) {
    return true
  }

  const ingredientName = normalizeName(ingredient.label)
  const targetNames = [target.title, target.stack.name]
    .map(normalizeName)
  if (targetNames.includes(ingredientName)) return true

  const isOrdinaryCarrier = !target.stack.model
    && Object.keys(target.stack.components ?? {}).length === 0
    && (!target.vanillaName
      || normalizeName(target.vanillaName) === normalizeName(target.stack.name))
  return isOrdinaryCarrier && ingredient.ids.includes(target.stack.carrier)
}

function stackAccepts(requirement: StackView, target: StackView): boolean {
  if (requirement.model) {
    return requirement.model === target.model
  }
  if (requirement.carrier !== target.carrier) return false

  const requiredComponents = requirement.components ?? {}
  if (!Object.keys(requiredComponents).length) return true
  return canonicalString(requiredComponents)
    === canonicalString(target.components ?? {})
}

function dedupeRelations(relations: ItemRelationView[]): ItemRelationView[] {
  return [...new Map(relations.map(relation => [
    `${relation.kind}:${relation.to}:${relation.title}`,
    relation
  ])).values()]
}

function canonicalString(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalString).join(',')}]`
  }
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right, 'en'))
      .map(([key, nested]) => `${JSON.stringify(key)}:${canonicalString(nested)}`)
      .join(',')}}`
  }
  return JSON.stringify(value) ?? 'undefined'
}

function normalizeName(value: string): string {
  return value
    .replace(/§[0-9a-fk-or]/gi, '')
    .toLocaleLowerCase('ru-RU')
    .replaceAll('ё', 'е')
    .trim()
}
