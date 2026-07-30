import type {
  CraftingPlannerSupplement,
  CraftingSupplementRecipe
} from '../../app/types/crafting'
import type {
  IngredientView,
  RecipeRequirementView,
  RecipeView
} from '../../app/types/wiki'
import { stationResourceForRecipe } from '../../app/utils/craftingStation'
import {
  buildRecipeRequirements,
  smithingRequirementRoles,
  type SmithingIngredients
} from './recipeRequirements'

type JsonObject = Record<string, unknown>

export interface PackFilterEntry {
  namespace?: string
  path?: string
}

interface BuildPlannerSupplementOptions {
  minecraftVersion: string
  vanillaFiles: Record<string, Uint8Array>
  packFilters: PackFilterEntry[]
  packRecipes: RecipeView[]
  normalizeIngredient: (value: unknown) => IngredientView
  stationName: (type: string) => string
}

interface ParsedVanillaRecipe extends CraftingSupplementRecipe {
  resultId: string
}

const supportedTypes = new Set([
  'minecraft:blasting',
  'minecraft:campfire_cooking',
  'minecraft:crafting_shaped',
  'minecraft:crafting_shapeless',
  'minecraft:smelting',
  'minecraft:smithing_transform',
  'minecraft:smoking',
  'minecraft:stonecutting'
])

const preferredRecipeByResult: Record<string, string> = {
  'minecraft:copper_ingot': 'smoking:copper_ingot_from_smoking_raw_copper',
  'minecraft:gold_ingot': 'smoking:gold_ingot_from_smoking_raw_gold',
  'minecraft:iron_ingot': 'minecraft:iron_ingot_from_blasting_raw_iron',
  'minecraft:smooth_stone': 'smoking:smooth_stone_from_smoking_stone',
  'minecraft:stone': 'smoking:stone_from_smoking_cobblestone',
  'minecraft:stone_bricks': 'minecraft:stone_bricks',
  'minecraft:stick': 'crafting:sticks_from_logs'
}

for (const wood of [
  'acacia',
  'birch',
  'cherry',
  'crimson',
  'dark_oak',
  'jungle',
  'mangrove',
  'oak',
  'pale_oak',
  'spruce',
  'warped'
]) {
  preferredRecipeByResult[`minecraft:${wood}_planks`] = `minecraft:${wood}_planks`
}

export function buildVanillaPlannerSupplement(
  options: BuildPlannerSupplementOptions
): CraftingPlannerSupplement {
  const packRecipeIds = new Set(options.packRecipes.map(recipe => recipe.id))
  const filters = compilePackFilters(options.packFilters)
  const candidatesByResult = new Map<string, ParsedVanillaRecipe[]>()

  for (const archivePath of Object.keys(options.vanillaFiles)
    .filter(path => /^data\/minecraft\/recipe\/.+\.json$/.test(path))
    .sort((left, right) => left.localeCompare(right, 'en'))) {
    const recipePath = archivePath.slice('data/minecraft/recipe/'.length, -'.json'.length)
    const id = `minecraft:${recipePath}`
    const filterPath = `recipe/${recipePath}.json`
    if (
      packRecipeIds.has(id)
      || filters.some(filter => filter.matches('minecraft', filterPath))
    ) {
      continue
    }

    const data = readArchiveJson(options.vanillaFiles[archivePath], archivePath)
    const recipe = parseVanillaRecipe(data, id, options)
    if (!recipe) continue

    const candidates = candidatesByResult.get(recipe.resultId) ?? []
    candidates.push(recipe)
    candidatesByResult.set(recipe.resultId, candidates)
  }

  const included = collectTransitiveClosure(candidatesByResult, options.packRecipes)
  const recipesByResult = Object.fromEntries(
    [...included.entries()]
      .sort(([left], [right]) => left.localeCompare(right, 'en'))
      .map(([resultId, recipes]) => [
        resultId,
        recipes
          .sort((left, right) => left.id.localeCompare(right.id, 'en'))
          .map(({ resultId: _resultId, ...recipe }) => recipe)
      ])
  )

  return {
    schemaVersion: 1,
    minecraftVersion: options.minecraftVersion,
    preferredRecipeByResult,
    recipesByResult
  }
}

export function matchesPackFilter(
  entry: PackFilterEntry,
  namespace: string,
  path: string
): boolean {
  return (!entry.namespace || fullMatch(entry.namespace, namespace))
    && (!entry.path || fullMatch(entry.path, path))
}

function compilePackFilters(
  entries: PackFilterEntry[]
): Array<{ matches: (namespace: string, path: string) => boolean }> {
  return entries.map((entry, index) => {
    const namespacePattern = compileFilterPattern(entry.namespace, index, 'namespace')
    const pathPattern = compileFilterPattern(entry.path, index, 'path')
    return {
      matches(namespace, path) {
        return (!namespacePattern || namespacePattern.test(namespace))
          && (!pathPattern || pathPattern.test(path))
      }
    }
  })
}

function compileFilterPattern(
  pattern: string | undefined,
  index: number,
  field: 'namespace' | 'path'
): RegExp | undefined {
  if (!pattern) return undefined

  try {
    return new RegExp(`^(?:${pattern})$`, 'u')
  } catch (error) {
    throw new Error(`Некорректный pack filter ${field} #${index + 1}: ${pattern}`, {
      cause: error
    })
  }
}

function fullMatch(pattern: string, value: string): boolean {
  return new RegExp(`^(?:${pattern})$`, 'u').test(value)
}

function parseVanillaRecipe(
  data: JsonObject,
  id: string,
  options: BuildPlannerSupplementOptions
): ParsedVanillaRecipe | undefined {
  const type = typeof data.type === 'string' ? data.type : ''
  if (!supportedTypes.has(type)) return undefined

  const result = parseResult(data.result)
  if (!result) return undefined

  const pattern = Array.isArray(data.pattern)
    ? data.pattern.filter((row): row is string => typeof row === 'string')
    : undefined
  const key = isObject(data.key)
    ? Object.fromEntries(
        Object.entries(data.key)
          .map(([symbol, value]) => [symbol, options.normalizeIngredient(value)])
      )
    : undefined
  const smithing: SmithingIngredients = {}
  for (const role of smithingRequirementRoles) {
    if (data[role] !== undefined) {
      smithing[role] = options.normalizeIngredient(data[role])
    }
  }

  const ingredients = recipeIngredients(data, pattern, key, smithing, options)
  const requirements = buildRecipeRequirements({
    type,
    pattern,
    key,
    ingredients,
    smithing
  })
  if (!hasUsableRequirements(requirements)) return undefined

  return {
    id,
    type,
    station: options.stationName(type),
    resultId: result.id,
    resultCount: result.count,
    requirements,
    stationResourceId: stationResourceForRecipe({
      type,
      pattern,
      requirements
    })
  }
}

function recipeIngredients(
  data: JsonObject,
  pattern: string[] | undefined,
  key: Record<string, IngredientView> | undefined,
  smithing: SmithingIngredients,
  options: BuildPlannerSupplementOptions
): IngredientView[] {
  if (key && pattern) {
    const usedSymbols = [...new Set(pattern.join('').replaceAll(' ', '').split(''))]
    return usedSymbols.map(symbol => key[symbol]).filter(Boolean)
  }
  if (Array.isArray(data.ingredients)) {
    return data.ingredients.map(value => options.normalizeIngredient(value))
  }
  if (data.ingredient !== undefined) {
    return [options.normalizeIngredient(data.ingredient)]
  }
  return smithingRequirementRoles.flatMap((role) => {
    const ingredient = smithing[role]
    return ingredient ? [ingredient] : []
  })
}

function collectTransitiveClosure(
  candidatesByResult: Map<string, ParsedVanillaRecipe[]>,
  packRecipes: RecipeView[]
): Map<string, ParsedVanillaRecipe[]> {
  const queued = new Set<string>()
  const queue: string[] = []
  const included = new Map<string, ParsedVanillaRecipe[]>()

  const enqueue = (resourceId: string | undefined): void => {
    if (!resourceId || queued.has(resourceId)) return
    queued.add(resourceId)
    queue.push(resourceId)
  }

  for (const recipe of packRecipes) {
    for (const requirement of recipe.requirements) {
      enqueueExactIngredient(requirement.ingredient, enqueue)
    }
    enqueue(stationResourceForRecipe(recipe))
  }

  while (queue.length) {
    const resultId = queue.shift()
    if (!resultId) continue

    const candidates = candidatesByResult.get(resultId)
    if (!candidates?.length) continue
    included.set(resultId, candidates)

    for (const recipe of candidates) {
      for (const requirement of recipe.requirements) {
        enqueueExactIngredient(requirement.ingredient, enqueue)
      }
      enqueue(recipe.stationResourceId)
    }
  }

  return included
}

function enqueueExactIngredient(
  ingredient: IngredientView,
  enqueue: (resourceId: string) => void
): void {
  if (!ingredient.tag && ingredient.ids.length === 1) {
    enqueue(ingredient.ids[0])
  }
}

function hasUsableRequirements(requirements: RecipeRequirementView[]): boolean {
  return requirements.length > 0
    && requirements.every(requirement => (
      requirement.count > 0
      && (requirement.ingredient.ids.length > 0 || Boolean(requirement.ingredient.tag))
    ))
}

function parseResult(value: unknown): { id: string, count: number } | undefined {
  if (typeof value === 'string') {
    return { id: normalizeResource(value), count: 1 }
  }
  if (!isObject(value) || typeof value.id !== 'string') {
    return undefined
  }
  return {
    id: normalizeResource(value.id),
    count: typeof value.count === 'number' && value.count > 0
      ? Math.floor(value.count)
      : 1
  }
}

function normalizeResource(value: string): string {
  return value.includes(':') ? value : `minecraft:${value}`
}

function readArchiveJson(value: Uint8Array, path: string): JsonObject {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(value)) as unknown
    if (!isObject(parsed)) {
      throw new Error('ожидался JSON-объект')
    }
    return parsed
  } catch (error) {
    throw new Error(`Не удалось прочитать vanilla-рецепт ${path}`, {
      cause: error
    })
  }
}

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
