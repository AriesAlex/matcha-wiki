import { readFileSync, readdirSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

interface GuideRegistry {
  entries: Record<string, { summary: string, note?: string }>
}

const rootDir = resolve(import.meta.dirname, '..')
const packDir = resolve(rootDir, 'pack')
const guides = (JSON.parse(readFileSync(
  resolve(rootDir, 'wiki-data/item-guides.ru.json'),
  'utf8'
)) as GuideRegistry).entries

describe('ambiguous item guides', () => {
  it('explains the four renamed vanilla resources through their real carriers', () => {
    expect(guides['minecraft:fox_pelt']?.summary).toContain('кроличья шкурка')
    expect(guides['minecraft:fish_bones']?.summary).toContain('костную муку')
    expect(guides['minecraft:sulfur_goo']?.summary).toContain('сгустка слизи')
    expect(guides['minecraft:tallow']?.summary).toContain('пчелиные соты')

    expect(packFile('data/minecraft/loot_table/entities/fox.json'))
      .toContain('"name": "minecraft:rabbit_hide"')
    expect(packFile('data/minecraft/loot_table/entities/sulfur_cube.json'))
      .toContain('"name": "minecraft:slime_ball"')
    expect(packFile('data/minecraft/loot_table/gameplay/fishing/junk.json'))
      .toContain('"name": "minecraft:bone"')
    expect(packFile('data/minecraft/loot_table/chests/igloo_chest.json'))
      .toContain('"name": "minecraft:honeycomb"')
  })

  it('marks both unfinished fish as unavailable instead of inventing a biome', () => {
    for (const id of ['minecraft:blind_cave_fish', 'minecraft:blind_minnow']) {
      expect(guides[id]?.summary).toContain('не подключена')
      expect(guides[id]?.note).toContain('способ получения пока не реализован')
    }

    const fishingFiles = dataFiles(resolve(packDir, 'data/minecraft/loot_table/gameplay/fishing'))
      .filter(path => !path.includes(`${sep}fish${sep}`))
      .map(path => readFileSync(path, 'utf8'))
      .join('\n')
    expect(fishingFiles).not.toContain('minecraft:gameplay/fishing/fish/blind_cave_fish')
    expect(fishingFiles).not.toContain('minecraft:gameplay/fishing/fish/blind_minnow')
  })

  it('identifies the two temple books as collectibles', () => {
    expect(guides['minecraft:quran']?.summary).toContain('коллекционная книга')
    expect(guides['minecraft:tanakh']?.summary).toContain('коллекционная книга')

    const temple = packFile('data/minecraft/loot_table/chests/village/village_temple.json')
    expect(temple).toContain('minecraft:kleis_items/quran')
    expect(temple).toContain('minecraft:kleis_items/tanakh')
  })
})

function packFile(path: string): string {
  return readFileSync(resolve(packDir, path), 'utf8')
}

function dataFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? dataFiles(path) : [path]
  })
}
