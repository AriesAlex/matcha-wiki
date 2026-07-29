import { describe, expect, it } from 'vitest'
import { isMissingWikiPage, normalizeWikiPath } from '../app/utils/wikiPath'

describe('wiki route hydration', () => {
  it('uses the same content key before and after a GitHub Pages slash redirect', () => {
    expect(normalizeWikiPath('/guides/early-game')).toBe('/guides/early-game')
    expect(normalizeWikiPath('/guides/early-game/')).toBe('/guides/early-game')
    expect(normalizeWikiPath('///')).toBe('/')
  })

  it('distinguishes a definitive miss from a deferred hydration request', () => {
    expect(isMissingWikiPage('pending', undefined)).toBe(false)
    expect(isMissingWikiPage('success', undefined)).toBe(false)
    expect(isMissingWikiPage('success', null)).toBe(true)
    expect(isMissingWikiPage('error', null)).toBe(false)
  })
})
