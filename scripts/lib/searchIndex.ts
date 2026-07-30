import type {
  ItemView,
  RecipeView,
  WikiCatalog,
  WikiSearchEntry
} from '../../app/types/wiki'
import {
  resolveIngredientItem,
  resolveStackItem
} from '../../app/utils/itemReference'
import { resolveItemRecipeUses } from '../../app/utils/itemRelations'
import { russianWordForm } from './russianGrammar'

interface RecipeSearchContext {
  recipe: RecipeView
  resultItem?: ItemView
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

  for (const context of recipeContexts) {
    if (!context.resultItem) continue

    const itemRecipes = recipeContextsByItem.get(context.resultItem.id) ?? []
    itemRecipes.push(context)
    recipeContextsByItem.set(context.resultItem.id, itemRecipes)
  }
  const standaloneRecipeGroups = Map.groupBy(
    recipeContexts.filter(context => !context.resultItem),
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
    }))
  ]
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
  const ingredientTitles = recipe.ingredients.map(ingredient => (
    resolveIngredientItem(catalog.items, ingredient)?.title ?? ingredient.label
  ))

  return {
    recipe,
    resultItem,
    ingredientTitles,
    terms: [
      'способ получения',
      recipe.id,
      recipe.station,
      recipe.type,
      resultItem?.title,
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

  return records.map((record) => {
    const matches = recordsByTitle.get(normalizeTitle(record.entry.title)) ?? []
    if (matches.length < 2) return record.entry

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
