import { describe, expect, it } from 'vitest'
import {
  isMissingWikiPage,
  normalizeRouteParam,
  normalizeWikiPath
} from '../app/utils/wikiPath'

describe('wiki route hydration', () => {
  it('uses the same content key before and after a GitHub Pages slash redirect', () => {
    expect(normalizeWikiPath('/guides/early-game')).toBe('/guides/early-game')
    expect(normalizeWikiPath('/guides/early-game/')).toBe('/guides/early-game')
    expect(normalizeWikiPath('///')).toBe('/')
  })

  it('normalizes catch-all route params produced by static hosts', () => {
    expect(normalizeRouteParam('hell_bound_book/')).toBe('hell_bound_book')
    expect(normalizeRouteParam(['blessings', 'hell_bound_book', ''])).toBe(
      'blessings/hell_bound_book'
    )
    expect(normalizeRouteParam(undefined)).toBe('')
  })

  it('distinguishes a definitive miss from a deferred hydration request', () => {
    expect(isMissingWikiPage('pending', undefined)).toBe(false)
    expect(isMissingWikiPage('success', undefined)).toBe(false)
    expect(isMissingWikiPage('success', null)).toBe(true)
    expect(isMissingWikiPage('error', null)).toBe(false)
  })
})
