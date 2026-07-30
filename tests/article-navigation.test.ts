import { describe, expect, it } from 'vitest'
import {
  decodeHeadingHash,
  flattenWikiTocLinks,
  pickActiveHeading,
  scrollTopToReveal
} from '../app/utils/articleNavigation'
import type { WikiTocLink } from '../app/types/wiki'

const toc: WikiTocLink[] = [
  {
    id: 'first',
    text: 'Первый раздел',
    depth: 2,
    children: [
      {
        id: 'nested',
        text: 'Вложенный раздел',
        depth: 3,
        children: [
          {
            id: 'deep',
            text: 'Глубокий раздел',
            depth: 4
          }
        ]
      }
    ]
  },
  {
    id: 'last',
    text: 'Последний раздел',
    depth: 2
  }
]

describe('article heading navigation', () => {
  it('flattens every TOC depth in reading order', () => {
    expect(flattenWikiTocLinks(toc).map(link => link.id)).toEqual([
      'first',
      'nested',
      'deep',
      'last'
    ])
  })

  it('selects the last heading that passed the activation line', () => {
    expect(pickActiveHeading([
      { id: 'first', top: -120 },
      { id: 'nested', top: 40 },
      { id: 'last', top: 240 }
    ], 88)).toBe('nested')
  })

  it('has no active subsection before the first heading', () => {
    expect(pickActiveHeading([
      { id: 'first', top: 140 },
      { id: 'last', top: 460 }
    ], 88)).toBeNull()
  })

  it('keeps the final heading active at the bottom of the article', () => {
    expect(pickActiveHeading([
      { id: 'first', top: -900 },
      { id: 'last', top: -40 }
    ], 88)).toBe('last')
  })
})

describe('sidebar reveal', () => {
  const container = { top: 100, bottom: 500 }

  it('does not move an already visible entry', () => {
    expect(scrollTopToReveal(
      container,
      { top: 160, bottom: 190 },
      240
    )).toBe(240)
  })

  it('reveals an entry above the safe viewport', () => {
    expect(scrollTopToReveal(
      container,
      { top: 80, bottom: 110 },
      240
    )).toBe(208)
  })

  it('reveals an entry below the safe viewport', () => {
    expect(scrollTopToReveal(
      container,
      { top: 490, bottom: 530 },
      240
    )).toBe(282)
  })
})

describe('heading hashes', () => {
  it('decodes a percent-encoded deep link', () => {
    expect(decodeHeadingHash(
      '#%D1%86%D0%B5%D0%BB%D1%8C-%D0%BC%D0%B0%D1%80%D1%88%D1%80%D1%83%D1%82%D0%B0'
    )).toBe('цель-маршрута')
  })

  it('keeps a malformed hash usable instead of throwing', () => {
    expect(decodeHeadingHash('#broken%2')).toBe('broken%2')
    expect(decodeHeadingHash('')).toBeNull()
  })
})
