import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { wikiNavigation } from '../app/data/wikiNavigation'
import type { WikiCatalog } from '../app/types/wiki'

const rootDir = resolve(import.meta.dirname, '..')
const catalog = JSON.parse(
  readFileSync(resolve(rootDir, 'generated', 'catalog.json'), 'utf8')
) as WikiCatalog

describe('generated wiki catalog', () => {
  it('matches its declared counts and keeps stable identifiers unique', () => {
    expect(catalog.stats.items).toBe(catalog.items.length)
    expect(catalog.stats.recipes).toBe(catalog.recipes.length)
    expect(catalog.stats.advancements).toBe(catalog.advancements.length)
    expect(new Set(catalog.items.map(item => item.slug)).size).toBe(catalog.items.length)
    expect(new Set(catalog.recipes.map(recipe => recipe.id)).size).toBe(catalog.recipes.length)
  })

  it('contains the complete analyzed pack rather than a sample fixture', () => {
    expect(catalog.stats.files).toBeGreaterThan(4_800)
    expect(catalog.stats.customItems).toBeGreaterThan(280)
    expect(catalog.stats.recipes).toBe(1_059)
    expect(catalog.stats.advancements).toBe(67)
  })

  it('resolves every item and recipe icon to a published asset', () => {
    const recipeIds = new Set(catalog.recipes.map(recipe => recipe.id))
    const assertIcon = (icon: string | undefined, source: string): void => {
      expect(icon, `${source} has no icon`).toBeTruthy()
      if (icon?.startsWith('/generated/')) {
        expect(
          existsSync(resolve(rootDir, 'public', icon.slice(1))),
          `${source} → ${icon}`
        ).toBe(true)
      }
    }

    for (const item of catalog.items) {
      for (const recipeId of item.recipeIds) {
        expect(recipeIds.has(recipeId), `${item.id} → ${recipeId}`).toBe(true)
      }
      assertIcon(item.icon, item.id)
    }

    for (const recipe of catalog.recipes) {
      if (recipe.result) {
        assertIcon(recipe.result.icon, `${recipe.id} result`)
      }
      for (const [index, ingredient] of recipe.ingredients.entries()) {
        expect(ingredient.icons.length, `${recipe.id} ingredient ${index}`).toBeGreaterThan(0)
        ingredient.icons.forEach((icon, iconIndex) =>
          assertIcon(icon, `${recipe.id} ingredient ${index}.${iconIndex}`)
        )
      }
      for (const [symbol, ingredient] of Object.entries(recipe.key ?? {})) {
        expect(ingredient.icons.length, `${recipe.id} key ${symbol}`).toBeGreaterThan(0)
        ingredient.icons.forEach((icon, iconIndex) =>
          assertIcon(icon, `${recipe.id} key ${symbol}.${iconIndex}`)
        )
      }
    }
  })

  it('keeps component variants, carriers and ambiguous names exact', () => {
    const itemsByModel = new Map(catalog.items.map(item => [item.model, item]))
    const recipesById = new Map(catalog.recipes.map(recipe => [recipe.id, recipe]))

    expect(itemsByModel.get('minecraft:avesta')?.carrier).toBe('minecraft:book')
    expect(itemsByModel.get('minecraft:anchovy')?.carrier).toBe('minecraft:cod')
    expect(itemsByModel.get('minecraft:arapaima')?.carrier).toBe('minecraft:salmon')
    expect(itemsByModel.get('minecraft:ruby')?.carrier).toBe('minecraft:fermented_spider_eye')
    expect(itemsByModel.get('minecraft:rusty_axe')?.carrier).toBe('minecraft:iron_axe')
    expect(itemsByModel.get('minecraft:titanium_compass')?.carrier).toBe('minecraft:compass')
    expect(itemsByModel.get('minecraft:bedrock_buster')?.icon)
      .toBe('/generated/textures/block/bedrock_buster_side.png')

    expect(recipesById.get('crafting:green_curry')?.result?.icon)
      .toBe('/generated/textures/item/green_curry.png')
    expect(recipesById.get('crafting:paneer_makhani')?.result?.icon)
      .toBe('/generated/textures/item/paneer_makhani.png')
    expect(recipesById.get('crafting:ramen')?.result?.icon)
      .toBe('/generated/textures/item/ramen.png')

    expect(itemsByModel.get('minecraft:blessing_aeolus')?.title)
      .toBe('Благословение: Молитва Эолу')
    expect(itemsByModel.get('minecraft:gnocchi_recipe')?.title)
      .toBe('Кулинарный рецепт: Ньокки')
    expect(new Set(catalog.items.map(item => item.title)).size).toBe(catalog.items.length)
  })

  it('does not expose unreachable asset-only ghosts and keeps special previews', () => {
    const models = new Set(catalog.items.map(item => item.model))
    for (const orphan of [
      'minecraft:buttered_apple',
      'minecraft:lyre',
      'minecraft:raw_curry',
      'minecraft:raw_green_curry',
      'minecraft:raw_paneer_makhani',
      'minecraft:raw_ramen',
      'minecraft:titanium_dolabra',
      'minecraft:titanium_mattock',
      'minecraft:titanium_reinforced_bow'
    ]) {
      expect(models.has(orphan), orphan).toBe(false)
    }

    for (const preview of [
      'minecraft-black-banner.svg',
      'minecraft-chest.svg',
      'minecraft-shield.svg',
      'minecraft-copper-golem-statue.svg'
    ]) {
      expect(
        existsSync(resolve(rootDir, 'public', 'generated', 'previews', preview)),
        preview
      ).toBe(true)
    }
  })

  it('expands vanilla ingredient tags instead of rendering empty slots', () => {
    const ingredients = catalog.recipes.flatMap(recipe => [
      ...recipe.ingredients,
      ...Object.values(recipe.key ?? {})
    ])

    for (const tag of [
      'minecraft:logs',
      'minecraft:eggs',
      'minecraft:bamboo_blocks'
    ]) {
      const matches = ingredients.filter(ingredient => ingredient.tag === tag)
      expect(matches.length, tag).toBeGreaterThan(0)
      expect(matches.every(ingredient => ingredient.ids.length > 0), tag).toBe(true)
      expect(matches.every(ingredient => ingredient.icons.length > 0), tag).toBe(true)
    }
  })

  it('documents cryptic and secret advancements with stable deep links', () => {
    const advancements = new Map(catalog.advancements.map(entry => [entry.id, entry]))

    expect(advancements.get('main:tutorial/obtain_opal')?.guide?.link?.to)
      .toBe('/world#морской-бог')
    expect(advancements.get('main:tutorial/obtain_ruby')?.guide?.link?.to)
      .toBe('/world#пандемониум')
    expect(advancements.get('main:tutorial/obtain_amber')?.guide?.link?.to)
      .toBe('/world#следы-паломника')
    expect(advancements.get('main:tutorial/obtain_topaz')?.guide?.link?.to)
      .toBe('/world#тартар')

    const secretFood = advancements.get('main:tutorial/cook_secret_food')?.guide
    const secretMeal = advancements.get('main:tutorial/cook_secret_meal')?.guide
    expect(secretFood?.spoiler).toBe(true)
    expect(secretFood?.entries).toHaveLength(4)
    expect(secretMeal?.spoiler).toBe(true)
    expect(secretMeal?.entries).toHaveLength(9)
    expect(secretMeal?.entries.every(entry => entry.to.startsWith('/recipes/'))).toBe(true)
  })

  it('explicitly closes custom components embedded in Markdown', () => {
    const contentDir = resolve(rootDir, 'content', 'wiki')
    const articlePaths = readdirSync(contentDir, { recursive: true })
      .filter(path => path.endsWith('.md'))

    for (const articlePath of articlePaths) {
      const source = readFileSync(resolve(contentDir, articlePath), 'utf8')
      const selfClosingComponents = [
        ...source.matchAll(/<([A-Z][A-Za-z0-9]*)\b[^>]*\/>/g)
      ].map(match => match[0])

      expect(
        selfClosingComponents,
        `${articlePath}: self-closing custom elements truncate the rendered article`
      ).toEqual([])
    }
  })

  it('keeps every editorial article reachable from the sidebar', () => {
    const contentDir = resolve(rootDir, 'content', 'wiki')
    const articlePaths = readdirSync(contentDir, { recursive: true })
      .filter(path => path.endsWith('.md'))
      .map(path => `/${path.replaceAll('\\', '/').replace(/\.md$/, '')}`)
    const navigationPaths = wikiNavigation.flatMap(section =>
      section.links.flatMap(link => [
        link.to,
        ...(link.children ?? []).map(child => child.to)
      ])
    )

    expect(
      articlePaths.filter(path => !navigationPaths.includes(path)),
      'Editorial articles without a sidebar entry'
    ).toEqual([])

    const progression = wikiNavigation
      .flatMap(section => section.links)
      .find(link => link.to === '/progression')

    expect(progression?.children?.map(link => link.to)).toEqual([
      '/guides/first-day',
      '/guides/early-game',
      '/guides/nether',
      '/guides/endgame'
    ])
  })
})
