import type {
  IngredientView,
  ItemView,
  StackView,
  WikiCatalog
} from '../types/wiki'
import { stripMinecraftFormatting } from './format'

export function resolveStackItem(
  items: WikiCatalog['items'],
  stack: StackView
): ItemView | undefined {
  if (stack.model) {
    return items.find(item => item.model === stack.model || item.id === stack.model)
  }

  return uniqueItem(items.filter(item => (
    item.isCustom
    && item.carrier === stack.carrier
    && normalizeItemName(item.name) === normalizeItemName(stack.name)
  )))
}

export function resolveIngredientItem(
  items: WikiCatalog['items'],
  ingredient: IngredientView
): ItemView | undefined {
  if (ingredient.tag || ingredient.ids.length !== 1) {
    return undefined
  }

  const directMatches = items.filter(item => (
    item.isCustom
    && (ingredient.ids.includes(item.id) || (
      item.model !== undefined && ingredient.ids.includes(item.model)
    ))
  ))
  const directItem = uniqueItem(directMatches)
  if (directItem) return directItem

  const candidates = items.filter(item => (
    item.isCustom && ingredient.ids.includes(item.carrier)
  ))
  const label = normalizeItemName(ingredient.label)
  const namedCandidates = candidates.filter(item => (
    [item.title, item.name, ...item.aliases]
      .some(name => normalizeItemName(name) === label)
  ))
  const namedAndIllustrated = namedCandidates.filter(item => (
    item.icon !== undefined && ingredient.icons.includes(item.icon)
  ))

  return uniqueItem(namedAndIllustrated) ?? uniqueItem(namedCandidates)
}

export function normalizeItemName(value: string): string {
  return stripMinecraftFormatting(value)
    .toLocaleLowerCase('ru-RU')
    .replaceAll('ё', 'е')
    .trim()
}

function uniqueItem(items: ItemView[]): ItemView | undefined {
  return items.length === 1 ? items[0] : undefined
}
