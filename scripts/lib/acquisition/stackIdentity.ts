import { createHash } from 'node:crypto'
import type { AcquisitionTarget } from '../../../app/types/acquisition'
import type {
  IngredientGlossaryEntry,
  ItemView,
  StackView
} from '../../../app/types/wiki'
import type { LootOutput } from './types'
import { acquisitionTargetSlug } from './targetRoutes'

interface TargetContext {
  items: ItemView[]
  ingredientGlossary: Record<string, IngredientGlossaryEntry>
  parseStack: (value: unknown) => StackView | undefined
  vanillaNameForResource: (resource: string) => string | undefined
}

export function acquisitionTargetFor(
  output: LootOutput,
  context: TargetContext
): AcquisitionTarget | undefined {
  const parsed = context.parseStack({
    id: output.seed.carrier,
    count: 1,
    components: output.seed.components
  })
  if (!parsed) return undefined

  const item = resolveExactItem(context.items, parsed)
  const glossary = context.ingredientGlossary[parsed.carrier]
  if (!isPlayerRelevant(output, parsed, item, glossary, context)) {
    return undefined
  }

  const stack: StackView = {
    ...parsed,
    count: 1,
    name: item?.title ?? glossary?.name ?? parsed.name,
    icon: item?.icon ?? glossary?.icon ?? parsed.icon
  }
  const id = item
    ? `item:${item.slug}`
    : `stack:${shortHash(canonicalString({
        carrier: stack.carrier,
        model: stack.model,
        name: stack.name,
        components: stack.components
      }))}`

  return {
    id,
    slug: item?.slug ?? acquisitionTargetSlug(stack.name),
    title: item?.title ?? stack.name,
    stack,
    vanillaName: context.vanillaNameForResource(stack.carrier),
    itemSlug: item?.slug
  }
}

function resolveExactItem(
  items: ItemView[],
  stack: StackView
): ItemView | undefined {
  if (stack.model) {
    const modelCandidates = items.filter(item => (
      item.model === stack.model || item.id === stack.model
    ))
    const direct = unique(modelCandidates)
    if (direct) return direct

    const stackComponents = canonicalString(stack.components ?? {})
    const exactModel = unique(modelCandidates.filter(item => (
      canonicalString(item.components) === stackComponents
    )))
    if (exactModel) return exactModel

    const name = normalizeName(stack.name)
    return unique(modelCandidates.filter(item => (
      [item.name, item.title, ...item.aliases]
        .some(candidate => normalizeName(candidate) === name)
    )))
  }

  const candidates = items.filter(item => item.carrier === stack.carrier)
  const stackComponents = canonicalString(stack.components ?? {})
  const exact = unique(candidates.filter(item => (
    canonicalString(item.components) === stackComponents
  )))
  if (exact) return exact

  const name = normalizeName(stack.name)
  return unique(candidates.filter(item => (
    item.isCustom
    && [item.name, item.title, ...item.aliases]
      .some(candidate => normalizeName(candidate) === name)
  )))
}

function isPlayerRelevant(
  output: LootOutput,
  stack: StackView,
  item: ItemView | undefined,
  glossary: IngredientGlossaryEntry | undefined,
  context: TargetContext
): boolean {
  if (item) return true
  if (glossary?.curated) return true
  if (
    glossary?.vanillaName
    && normalizeName(glossary.name) !== normalizeName(glossary.vanillaName)
  ) {
    return true
  }

  const vanillaName = context.vanillaNameForResource(stack.carrier)
  if (
    vanillaName
    && normalizeName(stack.name) !== normalizeName(vanillaName)
  ) {
    return true
  }

  if (
    stack.components?.['minecraft:item_model']
    || stack.components?.['minecraft:item_name']
    || stack.components?.['minecraft:custom_name']
  ) {
    return true
  }

  return output.visitedTableIds.some(tableId => (
    tableId.includes(':kleis_items/')
    || tableId.includes(':food/')
    || tableId.includes(':gameplay/fishing/fish/')
  ))
}

function canonicalString(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalString).join(',')}]`
  }
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right, 'en'))
      .map(([key, nested]) => `${JSON.stringify(key)}:${canonicalString(nested)}`)
      .join(',')}}`
  }
  return JSON.stringify(value) ?? 'undefined'
}

function normalizeName(value: string): string {
  return value
    .replace(/§[0-9a-fk-or]/gi, '')
    .toLocaleLowerCase('ru-RU')
    .replaceAll('ё', 'е')
    .trim()
}

function unique<T>(values: T[]): T | undefined {
  return values.length === 1 ? values[0] : undefined
}

function shortHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}
