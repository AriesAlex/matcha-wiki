import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { WikiCatalog } from '../app/types/wiki'

const rootDir = resolve(import.meta.dirname, '..')
const catalog = JSON.parse(
  readFileSync(resolve(rootDir, 'generated', 'catalog.json'), 'utf8')
) as WikiCatalog

describe('player-facing item catalog', () => {
  it('does not publish pages backed only by unused assets', () => {
    const slugs = new Set(catalog.items.map(item => item.slug))

    expect(slugs).not.toContain('minecraft-secret-meal')
    expect(slugs).not.toContain('minecraft-braised-brown-mushroom')
    expect(slugs).not.toContain('minecraft-leather-helmet')
  })

  it('keeps real custom items and localized titles', () => {
    expect(find('minecraft:application')?.title).toBe('Беженец')
    expect(find('minecraft:fox_pelt')?.title).toBe('Лисья шкура')
    expect(find('minecraft:music_disc_golden')?.title)
      .toBe('Пластинка «Golden»')
    expect(find('minecraft:apotropaic_arrow')?.title)
      .toBe('Апотропейная стрела')
  })

  it('disambiguates titles only among pages that remain in the catalog', () => {
    const ramen = catalog.items.find(item => item.slug === 'recipe-output-crafting-ramen')
    expect(ramen?.title).toBe('Рамэн тонкоцу: Верстак')
  })
})

function find(model: string) {
  return catalog.items.find(item => item.model === model)
}
