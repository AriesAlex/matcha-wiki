import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  SITE_DESCRIPTION,
  canonicalWikiUrl,
  releaseDownloadUrl
} from '../app/utils/siteMeta'

describe('site metadata', () => {
  it('builds stable public canonical URLs without query or hash state', () => {
    expect(canonicalWikiUrl('https://matcha.ariex.ru', '/items/clay-idol'))
      .toBe('https://matcha.ariex.ru/items/clay-idol')
    expect(canonicalWikiUrl('https://matcha.ariex.ru/', '/'))
      .toBe('https://matcha.ariex.ru/')
  })

  it('describes the project as a Russian wiki with a direct download path', () => {
    expect(SITE_DESCRIPTION).toMatch(/русская вики/ui)
    expect(SITE_DESCRIPTION).toMatch(/скачать ручной перевод/ui)
    expect(releaseDownloadUrl('Matcha_Flavoured', '1.03'))
      .toBe('https://github.com/AriesAlex/matcha-wiki/releases/latest/download/Matcha_Flavoured_1_03_RU.zip')
  })

  it('publishes crawler directions and page-level structured data', () => {
    const rootDir = resolve(import.meta.dirname, '..')
    const config = readFileSync(resolve(rootDir, 'nuxt.config.ts'), 'utf8')
    const robots = readFileSync(resolve(rootDir, 'public/robots.txt'), 'utf8')
    const app = readFileSync(resolve(rootDir, 'app/app.vue'), 'utf8')
    const pageSeo = readFileSync(resolve(
      rootDir,
      'app/composables/useWikiSeo.ts'
    ), 'utf8')
    const errorPage = readFileSync(resolve(rootDir, 'app/error.vue'), 'utf8')
    const notFoundPage = readFileSync(resolve(
      rootDir,
      'app/pages/[...slug].vue'
    ), 'utf8')

    expect(config).not.toContain("titleTemplate: '%s · Matcha Wiki'")
    expect(config).toContain("name: 'keywords'")
    expect(config).toContain('скачать Matcha Flavoured')
    expect(config).toContain("'prerender:generate'(route)")
    expect(config).toContain('content="noindex, nofollow"')
    expect(robots).toContain('Sitemap: https://matcha.ariex.ru/sitemap.xml')
    expect(app).toContain("'@type': 'WebSite'")
    expect(app).toContain("'@id': `${websiteUrl}#website`")
    expect(pageSeo).toContain("'@type': 'WebPage'")
    expect(pageSeo).toContain('max-image-preview:large')
    expect(errorPage).toContain("robots: 'noindex, nofollow'")
    expect(notFoundPage).toContain('setResponseStatus(requestEvent, 404)')
    expect(notFoundPage).toContain('indexable: () => !missingPage.value')
  })
})
