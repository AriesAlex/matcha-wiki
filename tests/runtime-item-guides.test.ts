import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

interface ItemGuide {
  summary: string
  note?: string
}

interface ItemGuideFile {
  entries: Record<string, ItemGuide>
}

interface RecipeUnlockAdvancement {
  rewards: {
    recipes: string[]
  }
}

const rootDir = resolve(import.meta.dirname, '..')
const readPackFile = (path: string): string => (
  readFileSync(resolve(rootDir, 'pack', path), 'utf8')
)
const guides = (
  JSON.parse(
    readFileSync(resolve(rootDir, 'wiki-data', 'item-guides.ru.json'), 'utf8')
  ) as ItemGuideFile
).entries

describe('runtime item guides', () => {
  it('explains automatic hearts and the delayed bedrock charge', () => {
    expect(guides['minecraft:heart_container']).toMatchObject({
      summary: expect.stringContaining('автоматически'),
      note: expect.stringContaining('30 сердец')
    })
    expect(
      readPackFile('data/main/function/mechanic/clear_heart_container.mcfunction')
    ).toContain('scoreboard players add @s Hearts 2')
    expect(
      readPackFile('data/main/function/mechanic/set_max_hp.mcfunction')
    ).toContain('score @s Hearts matches 60..')

    expect(guides['minecraft:bedrock_buster']).toMatchObject({
      summary: expect.stringContaining('3×7×3'),
      note: expect.stringContaining('взрывается')
    })
    expect(
      readPackFile('data/main/function/mechanic/bedrock_buster_use.mcfunction')
    ).toContain('fill ~-1 ~-3 ~-1 ~1 ~3 ~1 minecraft:air replace minecraft:bedrock')
    expect(readPackFile('data/crafting/recipe/bedrock_buster.json'))
      .toContain('"fuse": 80')
  })

  it('explains the reusable weather statues and refugee spawn eggs', () => {
    const weatherGuides = [
      ['minecraft:cheerful_clay_statue', 'set_clear_weather'],
      ['minecraft:mournful_clay_statue', 'set_rain']
    ] as const

    for (const [model, functionName] of weatherGuides) {
      expect(guides[model]?.summary).toContain('через 3 секунды')
      expect(guides[model]?.note).toContain('не расходуется')
      expect(
        readPackFile(`data/main/function/mechanic/${model.slice(10)}.mcfunction`)
      ).toContain(`schedule function main:mechanic/${functionName} 3s`)
    }

    expect(guides['minecraft:application']?.summary).toContain('жителем-беженцем')
    expect(
      readPackFile(
        'data/minecraft/villager_trade/wandering_trader/child_asylum_seeker.json'
      )
    ).toContain('"id": "minecraft:villager"')
  })

  it('states the glow-food healing and aura durations', () => {
    const glowFoods = [
      ['minecraft:glow_mash', '1 сердце', '3 секунды'],
      ['minecraft:glow_jam', '2 сердца', '30 секунд'],
      ['minecraft:glow_berry_crumble', '4 сердца', '60 секунд']
    ] as const

    for (const [model, healing, duration] of glowFoods) {
      expect(guides[model]?.summary).toContain(healing)
      expect(guides[model]?.summary).toContain(duration)
      expect(guides[model]?.summary).toContain('50 блоков')
    }

    const glowMashRecipe = readPackFile('data/food/recipe/glow_mash.json')
    const glowMashTrigger = readPackFile(
      'data/main/advancement/mechanics/glow_mash_eaten.json'
    )
    expect(glowMashRecipe).toContain('"minecraft:item_model": "minecraft:glow_mash"')
    expect(glowMashTrigger).toContain('"minecraft:item_model": "minecraft:glow_mash"')
    expect(guides['minecraft:glow_mash']?.note).toContain('исправлена ошибка')

    expect(readPackFile('data/main/function/effects/soul_sight_effect_3.mcfunction'))
      .toContain('@e[distance=0.1..50] minecraft:glowing 3')
    expect(readPackFile('data/main/function/effects/soul_sight_effect_30.mcfunction'))
      .toContain('@e[distance=0.1..50] minecraft:glowing 30')
    expect(readPackFile('data/main/function/effects/soul_sight_effect_60.mcfunction'))
      .toContain('@e[distance=0.1..50] minecraft:glowing 60')
  })

  it('maps every cooking paper to its exact automatically unlocked recipe', () => {
    const unlocks = {
      'minecraft:warped_stroganoff_recipe': {
        advancement: 'warped_stroganoff_recipe',
        recipe: 'food:warped_stroganoff',
        dish: 'бефстроганова с искажённым грибком'
      },
      'minecraft:chorus_mochi_recipe': {
        advancement: 'chorus_mochi_recipe',
        recipe: 'food:chorus_mochi',
        dish: 'моти из плодов хоруса'
      },
      'minecraft:gnocchi_recipe': {
        advancement: 'gnocchi_recipe',
        recipe: 'food:gnocchi',
        dish: 'ньокки'
      },
      'minecraft:sweet_berry_toast_recipe': {
        advancement: 'sweet_berry_toast_recipe',
        recipe: 'food:sweet_berry_toast',
        dish: 'тоста со сладкими ягодами'
      }
    } as const

    for (const [model, expected] of Object.entries(unlocks)) {
      const advancement = JSON.parse(
        readPackFile(
          `data/main/advancement/cooking_recipes/${expected.advancement}.json`
        )
      ) as RecipeUnlockAdvancement
      expect(advancement.rewards.recipes).toEqual([expected.recipe])
      expect(guides[model]?.summary).toContain(expected.dish)
      expect(guides[model]?.summary).toContain('инвентарь')
      expect(guides[model]?.note).toContain('не расходуется')
    }
  })
})
