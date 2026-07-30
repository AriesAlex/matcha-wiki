import catalogSource from '../../generated/catalog.json'
import searchSource from '../../generated/search-index.json'
import type {
  WikiCatalog,
  WikiSearchEntry
} from '../types/wiki'

const catalog = catalogSource as WikiCatalog
const searchIndex = searchSource as WikiSearchEntry[]

export function useWikiCatalog(): WikiCatalog {
  return catalog
}

export function useWikiSearchIndex(): WikiSearchEntry[] {
  return searchIndex
}
