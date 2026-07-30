import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import type {
  CraftingPlannerSupplement,
  CraftingPlanNode
} from '../app/types/crafting'
import type { WikiCatalog } from '../app/types/wiki'
import {
  createCraftingIndex,
  targetForItem,
  targetForResource
} from '../app/utils/craftingIndex'
import { buildCraftingPlan } from '../app/utils/craftingPlan'
import {
  matchesPackFilter,
  type PackFilterEntry
} from '../scripts/lib/vanillaPlannerRecipes'

interface CacheManifest {
  schemaVersion: number
  files: number
  fileCounts: Record<string, number>
}

const rootDir = resolve(import.meta.dirname, '..')
const project = readJson<{
  minecraftVersion: string
}>(resolve(rootDir, 'wiki-data/project.json'))
const cacheManifest = readJson<CacheManifest>(
  resolve(rootDir, `.cache/minecraft/wiki-assets-${project.minecraftVersion}.json`)
)
const vanillaFiles = unzipSync(readFileSync(
  resolve(rootDir, `.cache/minecraft/wiki-assets-${project.minecraftVersion}.zip`)
))
const packMetadata = readJson<{
  filter: { block: PackFilterEntry[] }
}>(resolve(rootDir, 'pack/pack.mcmeta'))
const catalog = readJson<WikiCatalog>(resolve(rootDir, 'generated/catalog.json'))
const supplement = readJson<CraftingPlannerSupplement>(
  resolve(rootDir, 'generated/crafting-planner.json')
)

describe('vanilla planner supplement', () => {
  it('keeps the cache schema honest and includes every 26.2 vanilla recipe', () => {
    const recipePaths = Object.keys(vanillaFiles)
      .filter(path => /^data\/minecraft\/recipe\/.+\.json$/.test(path))

    expect(cacheManifest).toMatchObject({
      schemaVersion: 2,
      files: 9_339,
      fileCounts: {
        itemDefinitions: 1_537,
        models: 3_928,
        textures: 2_065,
        itemTags: 224,
        recipes: 1_585
      }
    })
    expect(recipePaths).toHaveLength(1_585)
  })

  it('applies every recipe filter as a full regular-expression match', () => {
    const recipePaths = Object.keys(vanillaFiles)
      .filter(path => /^data\/minecraft\/recipe\/.+\.json$/.test(path))
      .map(path => path.slice('data/minecraft/'.length))
    const recipeFilters = packMetadata.filter.block
      .filter(entry => entry.path?.startsWith('recipe/'))
    const blocked = recipePaths.filter(path => recipeFilters.some(entry =>
      matchesPackFilter(entry, 'minecraft', path)
    ))

    expect(recipeFilters).toHaveLength(314)
    expect(new Set(blocked).size).toBe(314)
    for (const filter of recipeFilters) {
      expect(
        recipePaths.filter(path => matchesPackFilter(filter, 'minecraft', path)),
        JSON.stringify(filter)
      ).toHaveLength(1)
    }
    expect(matchesPackFilter(
      {
        namespace: 'minecraft',
        path: 'recipe/iron_ingot_from_smelting_raw_iron.json'
      },
      'minecraft',
      'recipe/iron_ingot_from_smelting_raw_iron.json'
    )).toBe(true)
    expect(matchesPackFilter(
      {
        namespace: 'minecraft',
        path: 'recipe/iron_ingot_from_smelting_raw_iron.json'
      },
      'minecraft',
      'prefix/recipe/iron_ingot_from_smelting_raw_iron.json'
    )).toBe(false)
  })

  it('publishes only the parser-safe closure without touching public recipes', () => {
    const recipes = Object.values(supplement.recipesByResult).flat()
    const catalogRecipeIds = new Set(catalog.recipes.map(recipe => recipe.id))

    expect(catalog.stats.recipes).toBe(1_059)
    expect(Object.keys(supplement.recipesByResult)).toHaveLength(307)
    expect(recipes).toHaveLength(501)
    expect(new Set(recipes.map(recipe => recipe.id)).size).toBe(recipes.length)
    expect(recipes.every(recipe => !catalogRecipeIds.has(recipe.id))).toBe(true)
    expect(recipes.every(recipe => (
      recipe.requirements.length > 0
      && recipe.requirements.every(requirement => requirement.count > 0)
    ))).toBe(true)
  })

  it('uses active raw-iron blasting and never resurrects filtered smelting', () => {
    const ironRecipes = supplement.recipesByResult['minecraft:iron_ingot']
      .map(recipe => recipe.id)

    expect(ironRecipes).toContain(
      'minecraft:iron_ingot_from_blasting_raw_iron'
    )
    expect(ironRecipes).not.toContain(
      'minecraft:iron_ingot_from_smelting_raw_iron'
    )
    expect(supplement.preferredRecipeByResult['minecraft:iron_ingot'])
      .toBe('minecraft:iron_ingot_from_blasting_raw_iron')
  })

  it('builds the warding-sword iron branch through the Matcha blast furnace', () => {
    const item = catalog.items.find(entry => entry.model === 'minecraft:warding_sword')
    expect(item).toBeDefined()
    if (!item) return

    const plan = buildCraftingPlan(
      createCraftingIndex(catalog, supplement),
      targetForItem(item),
      1,
      {
        modeByTarget: {},
        recipeByTarget: {},
        optionByRequirement: {}
      },
      {},
      { maxDepth: 30 }
    )
    const iron = findNode(plan, 'minecraft:iron_ingot')
    const rawIron = findNode(plan, 'minecraft:raw_iron')
    const blastFurnace = findNode(plan, 'minecraft:blast_furnace')

    expect(iron?.recipe).toMatchObject({
      id: 'minecraft:iron_ingot_from_blasting_raw_iron',
      origin: 'vanilla',
      stationResourceId: 'minecraft:blast_furnace'
    })
    expect(iron?.recipe?.detailsPath).toBeUndefined()
    expect(rawIron?.state).toBe('obtain')
    expect(blastFurnace?.recipe).toMatchObject({
      id: 'crafting:blast_furnace',
      origin: 'pack',
      detailsPath: '/recipes/crafting/blast_furnace'
    })
  })

  it('localizes and illustrates vanilla stations in crafting paths', () => {
    const index = createCraftingIndex(catalog, supplement)
    const expectedStations = {
      'minecraft:blast_furnace': 'Плавильная печь',
      'minecraft:crafting_table': 'Верстак',
      'minecraft:furnace': 'Духовая печь',
      'minecraft:stonecutter': 'Камнерез'
    }
    const stationIds = new Set(Object.values(supplement.recipesByResult)
      .flat()
      .map(recipe => recipe.stationResourceId)
      .filter((id): id is string => Boolean(id)))

    expect([...stationIds].sort()).toEqual(Object.keys(expectedStations).sort())
    for (const [id, title] of Object.entries(expectedStations)) {
      const station = targetForResource(catalog, id)
      expect(station.title, id).toBe(title)
      expect(station.icon, id).toMatch(/^\/generated\/textures\/block\/.+\.png$/)
    }

    const craftingTable = buildCraftingPlan(
      index,
      targetForResource(catalog, 'minecraft:crafting_table'),
      1,
      {
        modeByTarget: {},
        recipeByTarget: {},
        optionByRequirement: {}
      },
      {}
    )

    expect(craftingTable.target).toMatchObject({
      title: 'Верстак',
      icon: '/generated/textures/block/crafting_table_front.png'
    })
    expect(craftingTable.recipe?.id).toBe('minecraft:crafting_table')
  })

  it('collapses indistinguishable alternative resources into one planner step', () => {
    const plan = buildCraftingPlan(
      createCraftingIndex(catalog, supplement),
      targetForResource(catalog, 'minecraft:disc_fragment_5'),
      3,
      {
        modeByTarget: {},
        recipeByTarget: {
          'resource:minecraft:disc_fragment_5': 'crafting:disc_fragment_from_disc'
        },
        optionByRequirement: {}
      },
      {}
    )
    const disc = plan.requirements[0]

    expect(disc?.options).toHaveLength(1)
    expect(disc?.node.target.title).toBe('Пластинка — любой вариант')
    expect(disc?.node.target.obtainHint).toBe(
      'Подойдёт любой из 20 вариантов. Выбирайте тот, который уже есть или проще получить.'
    )
  })
})

function findNode(
  node: CraftingPlanNode,
  resourceId: string
): CraftingPlanNode | undefined {
  if (node.target.resourceId === resourceId) return node
  if (node.station) {
    const station = findNode(node.station, resourceId)
    if (station) return station
  }
  for (const requirement of node.requirements) {
    const found = findNode(requirement.node, resourceId)
    if (found) return found
  }
  return undefined
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}
