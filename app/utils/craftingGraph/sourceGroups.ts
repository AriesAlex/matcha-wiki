import type { CraftingSourceView } from '../../types/crafting'

interface SourceGroup {
  readonly pagePath: string
  readonly sources: CraftingSourceView[]
}

export function groupCraftingSources(
  sources: readonly CraftingSourceView[]
): CraftingSourceView[] {
  const groups = new Map<string, SourceGroup>()

  for (const source of sources) {
    const pagePath = sourcePagePath(source.path)
    const key = `${source.kind}:${pagePath}`
    const group = groups.get(key)
    if (group) {
      group.sources.push(source)
      continue
    }
    groups.set(key, {
      pagePath,
      sources: [source]
    })
  }

  const groupedSources: CraftingSourceView[] = []
  for (const [key, group] of groups) {
    const first = group.sources[0]
    if (!first) continue
    if (group.sources.length === 1) {
      groupedSources.push(first)
      continue
    }

    groupedSources.push({
      ...first,
      id: `page:${key}`,
      detail: groupedSourceDetail(first, group.sources.length),
      path: group.pagePath
    })
  }
  return groupedSources
}

function sourcePagePath(path: string): string {
  const hashIndex = path.indexOf('#')
  return hashIndex < 0 ? path : path.slice(0, hashIndex)
}

function groupedSourceDetail(
  source: CraftingSourceView,
  count: number
): string {
  if (source.kind === 'trader') {
    return `${count} ${plural(count, 'предложение', 'предложения', 'предложений')} для обмена.`
  }
  if (source.kind === 'location') {
    return `${count} ${plural(count, 'вариант', 'варианта', 'вариантов')} добычи в этой локации.`
  }
  return `${count} ${plural(count, 'вариант', 'варианта', 'вариантов')} добычи у этого существа.`
}

function plural(
  count: number,
  one: string,
  few: string,
  many: string
): string {
  const lastTwo = count % 100
  const last = count % 10
  if (lastTwo >= 11 && lastTwo <= 14) return many
  if (last === 1) return one
  if (last >= 2 && last <= 4) return few
  return many
}
