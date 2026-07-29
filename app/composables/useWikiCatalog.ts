import catalogSource from '../../generated/catalog.json'
import searchSource from '../../generated/search-index.json'
import type { WikiCatalog } from '../types/wiki'

export interface WikiSearchEntry {
  kind: 'item' | 'recipe' | 'advancement'
  title: string
  description: string
  path: string
  icon?: string
  terms: string
}

const catalog = catalogSource as WikiCatalog
const searchIndex = searchSource as WikiSearchEntry[]

export function useWikiCatalog(): WikiCatalog {
  return catalog
}

export function useWikiSearchIndex(): WikiSearchEntry[] {
  return searchIndex
}
