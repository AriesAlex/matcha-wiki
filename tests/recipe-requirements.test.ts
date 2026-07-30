import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type {
  IngredientView,
  RecipeRequirementView,
  RecipeView,
  WikiCatalog
} from '../app/types/wiki'
import { buildRecipeRequirements } from '../scripts/lib/recipeRequirements'

const rootDir = resolve(import.meta.dirname, '..')
const catalog = JSON.parse(
  readFileSync(resolve(rootDir, 'generated', 'catalog.json'), 'utf8')
) as WikiCatalog
const recipes = new Map(catalog.recipes.map(recipe => [recipe.id, recipe]))

describe('recipe requirements', () => {
  it('counts every shaped slot while preserving stable key ids', () => {
    expect(requirementSummary(recipe('crafting:warding_stone'))).toEqual([
      ['key:S', 'Резные каменные кирпичи', 4],
      ['key:#', 'Назар', 4],
      ['key:E', 'Стабилизированный эстус', 1]
    ])
    expect(requirementSummary(recipe('crafting:copper_pickaxe'))).toEqual([
      ['key:X', 'Медный слиток', 3],
      ['key:#', 'Палка', 2]
    ])

    expect(recipe('crafting:sticks_from_logs').requirements).toEqual([{
      id: 'key:#',
      role: 'ingredient',
      count: 2,
      ingredient: expect.objectContaining({
        tag: 'minecraft:logs',
        ids: expect.arrayContaining([
          'minecraft:oak_log',
          'minecraft:spruce_log'
        ])
      })
    }])
  })

  it('aggregates repeated shapeless ingredients', () => {
    expect(requirementSummary(recipe('crafting:carbon_rich_iron'))).toEqual([
      ['ingredient:items:minecraft:iron_ingot', 'Железный слиток', 4],
      ['ingredient:items:minecraft:coal_block', 'Угольный блок', 1]
    ])
  })

  it('keeps alternatives and tags on the grouped ingredient', () => {
    const logs = ingredient(
      ['minecraft:oak_log', 'minecraft:spruce_log'],
      'Любое бревно',
      'minecraft:logs'
    )
    const reversedLogs = ingredient(
      ['minecraft:spruce_log', 'minecraft:oak_log'],
      'Любое бревно',
      'minecraft:logs'
    )

    const requirements = buildRecipeRequirements({
      type: 'minecraft:crafting_shapeless',
      ingredients: [logs, reversedLogs],
      smithing: {}
    })

    expect(requirements).toHaveLength(1)
    expect(requirements[0]).toMatchObject({
      id: 'ingredient:tag:minecraft:logs;items:minecraft:oak_log|minecraft:spruce_log',
      role: 'ingredient',
      count: 2,
      ingredient: logs
    })
  })

  it('assigns exact smithing roles', () => {
    const requirements = recipe('smithing_table:warding_sword').requirements

    expect(requirements.map(requirement => [
      requirement.id,
      requirement.role,
      requirement.ingredient.label,
      requirement.count
    ])).toEqual([
      ['template', 'template', 'Железный слиток', 1],
      ['base', 'base', 'Железный меч', 1],
      ['addition', 'addition', 'Назар', 1]
    ])
  })

  it.each([
    ['stonecutting:acacia_planks_from_stonecutting_acacia_logs', 'minecraft:stonecutting'],
    ['crafting:nether_bricks_from_smelting_netherrack', 'minecraft:smelting'],
    ['smoking:white_glazed_terracotta', 'minecraft:smoking'],
    ['food:grilled_melon_campfire', 'minecraft:campfire_cooking'],
    ['blasting:netherite_ingot_from_blasting_netherite_materials', 'minecraft:blasting']
  ])('keeps the single input for %s', (id, type) => {
    const current = recipe(id)
    expect(current.type).toBe(type)
    expect(current.requirements).toEqual([{
      id: 'ingredient',
      role: 'ingredient',
      count: 1,
      ingredient: current.ingredients[0]
    }])
  })

  it('gives every generated recipe positive uniquely identified requirements', () => {
    for (const current of catalog.recipes) {
      expect(current.requirements.length, current.id).toBeGreaterThan(0)
      expect(
        new Set(current.requirements.map(requirement => requirement.id)).size,
        current.id
      ).toBe(current.requirements.length)
      expect(
        current.requirements.every(requirement => requirement.count > 0),
        current.id
      ).toBe(true)
    }
  })
})

function recipe(id: string): RecipeView {
  const current = recipes.get(id)
  if (!current) {
    throw new Error(`Recipe ${id} is missing`)
  }
  return current
}

function ingredient(
  ids: string[],
  label: string,
  tag?: string
): IngredientView {
  return {
    ids,
    tag,
    label,
    icons: ids.map(id => `/generated/${id}.png`)
  }
}

function requirementSummary(
  current: RecipeView
): Array<[string, string, number]> {
  return current.requirements.map((requirement: RecipeRequirementView) => [
    requirement.id,
    requirement.ingredient.label,
    requirement.count
  ])
}
