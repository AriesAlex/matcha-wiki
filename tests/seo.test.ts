import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  SITE_DESCRIPTION,
  canonicalWikiUrl
} from '../app/utils/siteMeta'

describe('site metadata', () => {
  it('builds stable public canonical URLs without query or hash state', () => {
    expect(canonicalWikiUrl('https://matcha.ariex.ru', '/items/clay-idol'))
      .toBe('https://matcha.ariex.ru/items/clay-idol')
    expect(canonicalWikiUrl('https://matcha.ariex.ru/', '/'))
      .toBe('https://matcha.ariex.ru/')
  })

  it('describes the project as a Russian wiki and encyclopedia', () => {
    expect(SITE_DESCRIPTION).toMatch(/русская вики-энциклопедия/ui)
  })

  it('publishes crawler directions and avoids a duplicate title template', () => {
    const rootDir = resolve(import.meta.dirname, '..')
    const config = readFileSync(resolve(rootDir, 'nuxt.config.ts'), 'utf8')
    const robots = readFileSync(resolve(rootDir, 'public/robots.txt'), 'utf8')

    expect(config).not.toContain("titleTemplate: '%s · Matcha Wiki'")
    expect(config).toContain("name: 'keywords'")
    expect(robots).toContain('Sitemap: https://matcha.ariex.ru/sitemap.xml')
  })
})
