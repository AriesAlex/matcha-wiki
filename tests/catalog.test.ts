import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
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
    expect(catalog.stats.customItems).toBeGreaterThan(300)
    expect(catalog.stats.recipes).toBe(1_059)
    expect(catalog.stats.advancements).toBe(67)
  })

  it('resolves recipe and generated icon references', () => {
    const recipeIds = new Set(catalog.recipes.map(recipe => recipe.id))

    for (const item of catalog.items) {
      for (const recipeId of item.recipeIds) {
        expect(recipeIds.has(recipeId), `${item.id} → ${recipeId}`).toBe(true)
      }

      if (item.icon?.startsWith('/generated/')) {
        expect(
          existsSync(resolve(rootDir, 'public', item.icon.slice(1))),
          `${item.id} → ${item.icon}`
        ).toBe(true)
      }
    }
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
})
