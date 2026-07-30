import type {
  AcquisitionTarget
} from '../../app/types/acquisition'
import type {
  ItemView,
  RecipeView,
  WikiCatalog,
  WikiSearchEntry
} from '../../app/types/wiki'
import {
  acquisitionTargetPath,
  resolveAcquisitionTargetForStack
} from '../../app/utils/acquisition'
import {
  resolveIngredientItem,
  resolveStackItem
} from '../../app/utils/itemReference'
import { resolveItemRecipeUses } from '../../app/utils/itemRelations'
import { russianWordForm } from './russianGrammar'

interface RecipeSearchContext {
  recipe: RecipeView
  resultItem?: ItemView
  resultTarget?: AcquisitionTarget
  ingredientTitles: string[]
  terms: string[]
}

interface StandaloneRecipeSearchEntry {
  contexts: RecipeSearchContext[]
  entry: WikiSearchEntry
}

export function createSearchIndex(catalog: WikiCatalog): WikiSearchEntry[] {
  const itemByRecipeId = new Map(
    catalog.items.flatMap(item => (
      item.recipeIds.map(recipeId => [recipeId, item] as const)
    ))
  )
  const recipeContexts = catalog.recipes.map(recipe => (
    createRecipeSearchContext(catalog, recipe, itemByRecipeId)
  ))
  const recipeContextsByItem = new Map<string, RecipeSearchContext[]>()
  const recipeContextsByTarget = new Map<string, RecipeSearchContext[]>()

  for (const context of recipeContexts) {
    if (context.resultItem) {
      const itemRecipes = recipeContextsByItem.get(context.resultItem.id) ?? []
      itemRecipes.push(context)
      recipeContextsByItem.set(context.resultItem.id, itemRecipes)
    } else if (context.resultTarget) {
      const targetRecipes = recipeContextsByTarget.get(context.resultTarget.id) ?? []
      targetRecipes.push(context)
      recipeContextsByTarget.set(context.resultTarget.id, targetRecipes)
    }
  }
  const standaloneRecipeGroups = Map.groupBy(
    recipeContexts.filter(context => (
      !context.resultItem && !context.resultTarget
    )),
    recipeResultKey
  )
  const standaloneRecipeEntries = disambiguateRecipeTitles(
    [...standaloneRecipeGroups.values()].map(contexts => ({
      contexts,
      entry: standaloneRecipeEntry(contexts)
    })),
    catalog
  )

  return [
    ...catalog.items.map((item) => {
      const recipeRelations = resolveItemRecipeUses(catalog, item)
        .filter(relation => !relation.technical)
      const itemRecipes = recipeContextsByItem.get(item.id) ?? []

      return {
        kind: 'item' as const,
        title: item.title,
        description: shortDescription(
          item.guide?.summary ?? item.description,
          'Свойства, способы получения и применение.'
        ),
        category: item.category,
        path: `/items/${item.slug}`,
        icon: item.icon,
        terms: uniqueTerms([
          item.title,
          item.name,
          item.description,
          item.guide?.summary,
          item.guide?.note,
          item.category,
          ...item.aliases,
          ...item.obtainedFrom.flatMap(relation => [
            relation.title,
            relation.description
          ]),
          ...item.usedIn.flatMap(relation => [
            relation.title,
            relation.description
          ]),
          ...recipeRelations.flatMap(relation => [
            relation.title,
            relation.description
          ]),
          ...itemRecipes.flatMap(context => context.terms)
        ])
      }
    }),
    ...acquisitionTargetSearchEntries(catalog, recipeContextsByTarget),
    ...standaloneRecipeEntries,
    ...catalog.advancements.map(advancement => ({
      kind: 'advancement' as const,
      title: advancement.title,
      description: shortDescription(
        advancement.description,
        'Откройте условие и подсказку.'
      ),
      category: advancement.hidden ? 'Скрытое достижение' : 'Достижение',
      path: `/progression#${advancement.slug}`,
      icon: advancement.icon.icon,
      terms: uniqueTerms([
        advancement.title,
        advancement.description,
        advancement.id,
        advancement.guide?.note,
        advancement.guide?.intendedPath,
        advancement.guide?.exactCondition,
        advancement.guide?.link?.label,
        ...(advancement.guide?.searchTerms ?? []),
        ...(advancement.guide?.entries.map(entry => entry.label) ?? [])
      ])
    })),
    ...traderSearchEntries(catalog),
    ...acquisitionSearchEntries(catalog)
  ]
}

function acquisitionTargetSearchEntries(
  catalog: WikiCatalog,
  recipeContextsByTarget: Map<string, RecipeSearchContext[]>
): WikiSearchEntry[] {
  const sourceById = new Map([
    ...catalog.acquisition.locations.map(source => [source.id, source] as const),
    ...catalog.acquisition.mobs.map(source => [source.id, source] as const)
  ])

  return catalog.acquisition.targets
    .filter(target => !target.itemSlug)
    .map((target) => {
      const methods = catalog.acquisition.methods.filter(method => (
        method.targetId === target.id
      ))
      const sources = methods.flatMap((method) => {
        const source = sourceById.get(method.sourceId)
        return source ? [source] : []
      })
      const recipeContexts = recipeContextsByTarget.get(target.id) ?? []
      const glossary = catalog.ingredientGlossary[target.stack.carrier]
      const sourceNames = [...new Set(sources.map(source => source.name))]

      return {
        kind: 'item' as const,
        title: target.title,
        description: shortDescription(
          glossary?.obtainHint,
          sourceNames.length
            ? `Можно получить здесь: ${sourceNames.slice(0, 3).join(', ')}.`
            : 'Точные способы получения и применение этого ресурса.'
        ),
        category: target.vanillaName
          && normalizeTitle(target.vanillaName)
            !== normalizeTitle(target.stack.name)
          ? 'Переосмысленный ресурс'
          : 'Ресурс Matcha',
        path: acquisitionTargetPath(target),
        icon: target.stack.icon,
        terms: uniqueTerms([
          target.title,
          target.stack.name,
          target.stack.carrier,
          target.stack.model,
          target.vanillaName,
          glossary?.name,
          glossary?.vanillaName,
          glossary?.obtainHint,
          ...sources.flatMap(source => [
            source.name,
            source.summary,
            source.where,
            source.action,
            ...source.aliases
          ]),
          ...methods.flatMap(method => [
            method.context,
            method.action
          ]),
          ...recipeContexts.flatMap(context => context.terms)
        ])
      }
    })
}

function traderSearchEntries(catalog: WikiCatalog): WikiSearchEntry[] {
  const occupiedTitles = new Set([
    ...catalog.items.map(item => normalizeTitle(item.title)),
    ...catalog.advancements.map(advancement => normalizeTitle(advancement.title))
  ])

  return catalog.traders.map(trader => ({
    kind: 'trader',
    title: occupiedTitles.has(normalizeTitle(trader.title))
      ? `${trader.title}: торговец`
      : trader.title,
    description: shortDescription(
      trader.summary,
      'Профессия, рабочее место и доступные сделки.'
    ),
    category: 'Торговец',
    path: `/traders/${trader.slug}`,
    icon: trader.jobSite?.stack.icon ?? '/generated/ui/pack.png',
    terms: uniqueTerms([
      trader.title,
      trader.vanillaTitle,
      trader.summary,
      trader.priority,
      trader.jobSite?.title,
      ...trader.sets.flatMap(set => [
        set.title,
        ...set.offers.flatMap(offer => [
          offer.result.title,
          ...offer.costs.map(cost => cost.title),
          ...offer.conditions,
          ...offer.details
        ])
      ])
    ])
  }))
}

function acquisitionSearchEntries(catalog: WikiCatalog): WikiSearchEntry[] {
  const methodById = new Map(
    catalog.acquisition.methods.map(method => [method.id, method])
  )
  const targetById = new Map(
    catalog.acquisition.targets.map(target => [target.id, target])
  )

  return [
    ...catalog.acquisition.locations.map(location => ({
      source: location,
      kind: 'location' as const,
      category: location.kind === 'archaeology'
        ? 'Археология'
        : 'Место и находки',
      path: `/locations/${location.slug}`
    })),
    ...catalog.acquisition.mobs.map(mob => ({
      source: mob,
      kind: 'mob' as const,
      category: 'Моб и добыча',
      path: `/mobs/${mob.slug}`
    }))
  ].map(({ source, kind, category, path }) => {
    const methods = source.methodIds.flatMap((methodId) => {
      const method = methodById.get(methodId)
      return method ? [method] : []
    })
    const targets = methods.flatMap((method) => {
      const target = targetById.get(method.targetId)
      return target ? [target] : []
    })

    return {
      kind,
      title: source.name,
      description: shortDescription(source.summary, source.where),
      category,
      path,
      icon: targets.find(target => target.stack.icon)?.stack.icon,
      terms: uniqueTerms([
        source.name,
        source.summary,
        source.where,
        source.action,
        ...source.aliases,
        ...methods.flatMap(method => [
          method.context,
          method.action
        ]),
        ...targets.flatMap(target => [
          target.stack.name,
          target.stack.carrier,
          target.stack.model
        ])
      ])
    }
  })
}

function createRecipeSearchContext(
  catalog: WikiCatalog,
  recipe: RecipeView,
  itemByRecipeId: Map<string, ItemView>
): RecipeSearchContext {
  const resultItem = itemByRecipeId.get(recipe.id)
    ?? (recipe.result
      ? resolveStackItem(catalog.items, recipe.result)
      : undefined)
  const resultTarget = !resultItem && recipe.result
    ? resolveAcquisitionTargetForStack(catalog.acquisition, recipe.result)
    : undefined
  const ingredientTitles = recipe.ingredients.map(ingredient => (
    resolveIngredientItem(catalog.items, ingredient)?.title ?? ingredient.label
  ))

  return {
    recipe,
    resultItem,
    resultTarget,
    ingredientTitles,
    terms: [
      'способ получения',
      recipe.id,
      recipe.station,
      recipe.type,
      resultItem?.title,
      resultTarget?.title,
      recipe.result?.name,
      recipe.result?.carrier,
      ...recipe.ingredients.flatMap((ingredient, index) => [
        ingredientTitles[index],
        ingredient.label,
        ingredient.tag,
        ...ingredient.ids.flatMap((id) => {
          const glossary = catalog.ingredientGlossary[id]
          return [
            id,
            glossary?.name,
            glossary?.vanillaName,
            glossary?.obtainHint
          ]
        })
      ])
    ].filter((term): term is string => Boolean(term))
  }
}

function standaloneRecipeEntry(
  contexts: RecipeSearchContext[]
): WikiSearchEntry {
  const first = contexts[0]
  if (!first) {
    throw new Error('Пустая группа рецептов в поисковом индексе')
  }

  const { recipe } = first
  const title = recipe.result?.name ?? 'Способ получения'
  const stations = [...new Set(contexts.map(context => context.recipe.station))]
  const count = contexts.length
  const ingredients = [...new Set(
    contexts.flatMap(context => context.ingredientTitles)
  )]

  return {
    kind: 'recipe',
    title,
    description: count > 1
      ? `Доступно ${count} ${russianWordForm(count, ['способ', 'способа', 'способов'])}: ${stations.join(', ')}.`
      : shortDescription(
          ingredients.length
            ? `Понадобятся: ${ingredients.join(', ')}.`
            : undefined,
          'Откройте условия и результат.'
        ),
    category: count > 1
      ? `${count} ${russianWordForm(count, ['способ', 'способа', 'способов'])} изготовления`
      : `Способ получения · ${recipe.station}`,
    path: count > 1
      ? `/recipes?q=${encodeURIComponent(stripFormatting(title))}`
      : `/recipes/${recipe.namespace}/${recipe.path}`,
    icon: recipe.result?.icon,
    terms: uniqueTerms(contexts.flatMap(context => context.terms))
  }
}

function recipeResultKey(context: RecipeSearchContext): string {
  const { recipe } = context
  if (!recipe.result) return recipe.id

  return JSON.stringify([
    recipe.result.model ?? recipe.result.carrier,
    recipe.result.name,
    recipe.result.components ?? {}
  ])
}

function disambiguateRecipeTitles(
  records: StandaloneRecipeSearchEntry[],
  catalog: WikiCatalog
): WikiSearchEntry[] {
  const recordsByTitle = Map.groupBy(
    records,
    record => normalizeTitle(record.entry.title)
  )
  const occupiedTitles = new Set([
    ...catalog.items.map(item => normalizeTitle(item.title)),
    ...catalog.acquisition.targets
      .filter(target => !target.itemSlug)
      .map(target => normalizeTitle(target.title))
  ])

  return records.map((record) => {
    const matches = recordsByTitle.get(normalizeTitle(record.entry.title)) ?? []
    if (
      matches.length < 2
      && !occupiedTitles.has(normalizeTitle(record.entry.title))
    ) {
      return record.entry
    }

    return {
      ...record.entry,
      title: `${record.entry.title}: ${recipeTitleQualifier(record.contexts, catalog)}`
    }
  })
}

function recipeTitleQualifier(
  contexts: RecipeSearchContext[],
  catalog: WikiCatalog
): string {
  const first = contexts[0]
  if (!first) return 'другой вариант'

  const result = first.recipe.result
  const ordinaryName = result
    ? catalog.ingredientGlossary[result.carrier]?.vanillaName
      ?? catalog.ingredientGlossary[result.carrier]?.name
    : undefined
  if (
    ordinaryName
    && normalizeTitle(ordinaryName) !== normalizeTitle(
      first.recipe.result?.name ?? ''
    )
  ) {
    return ordinaryName
  }

  const ingredients = [...new Set(
    contexts.flatMap(context => context.ingredientTitles)
  )].slice(0, 2)
  return ingredients.length
    ? ingredients.join(' + ')
    : first.recipe.station
}

function shortDescription(value: string | undefined, fallback: string): string {
  const description = value?.trim()
  if (!description) return fallback

  const firstSentence = description.match(/^.*?[.!?](?=\s|$)/u)?.[0]
    ?? description
  return firstSentence.length <= 150
    ? firstSentence
    : `${firstSentence.slice(0, 147).trimEnd()}…`
}

function uniqueTerms(values: Array<string | undefined>): string {
  const terms = values.flatMap((value) => {
    const term = value?.trim()
    return term ? [term] : []
  })
  return [...new Set(terms)].join(' ')
}

function stripFormatting(value: string): string {
  return value.replace(/§[0-9a-fk-or]/gi, '')
}

function normalizeTitle(value: string): string {
  return stripFormatting(value)
    .toLocaleLowerCase('ru-RU')
    .replaceAll('ё', 'е')
    .trim()
}
