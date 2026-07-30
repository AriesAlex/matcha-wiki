import type { WikiTocLink } from '~/types/wiki'

export const ARTICLE_HEADING_OFFSET = 88

export interface HeadingPosition {
  id: string
  top: number
}

export interface VerticalBounds {
  top: number
  bottom: number
}

export function flattenWikiTocLinks(links: WikiTocLink[]): WikiTocLink[] {
  return links.flatMap(link => [
    link,
    ...flattenWikiTocLinks(link.children ?? [])
  ])
}

export function pickActiveHeading(
  headings: HeadingPosition[],
  activationY = ARTICLE_HEADING_OFFSET
): string | null {
  let activeId: string | null = null

  for (const heading of headings) {
    if (heading.top > activationY) {
      break
    }
    activeId = heading.id
  }

  return activeId
}

export function scrollTopToReveal(
  container: VerticalBounds,
  target: VerticalBounds,
  currentScrollTop: number,
  padding = 12
): number {
  const visibleTop = container.top + padding
  const visibleBottom = container.bottom - padding

  if (target.top < visibleTop) {
    return Math.max(0, currentScrollTop + target.top - visibleTop)
  }
  if (target.bottom > visibleBottom) {
    return currentScrollTop + target.bottom - visibleBottom
  }

  return currentScrollTop
}

export function decodeHeadingHash(hash: string): string | null {
  const value = hash.replace(/^#/, '')
  if (!value) {
    return null
  }

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
