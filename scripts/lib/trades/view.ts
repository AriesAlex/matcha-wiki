import type {
  TradeOfferView,
  TraderView
} from '../../../app/types/entities'
import {
  asArray,
  asFiniteNumber,
  asObjectArray,
  isObject
} from './json'
import type {
  BuildTraderViewsOptions,
  JsonObject,
  TraderGuideRegistry
} from './types'

const levelTitles: Record<number, string> = {
  1: 'Новичок',
  2: 'Подмастерье',
  3: 'Ремесленник',
  4: 'Эксперт',
  5: 'Мастер'
}

export function buildTraderViews({
  graph,
  guides,
  items,
  parseStack,
  displayTitle,
  resultDetails,
  translateText
}: BuildTraderViewsOptions): TraderView[] {
  const setsByProfession = Map.groupBy(graph.sets, set => set.profession)
  const traders: TraderView[] = []

  for (const [profession, sets] of setsByProfession) {
    const guide = guides.traders[profession]
    if (!guide) {
      throw new Error(`Нет русской справки для торговца ${profession}`)
    }

    const slug = profession.replaceAll('_', '-')
    const traderId = `minecraft:${profession}`
    const usedAnchors = new Set<string>()
    const traderSets = sets.map((set) => {
      const setGuide = guides.tradeSets[`${profession}/${set.key}`]
      const setAnchor = setGuide?.anchor
        ?? (set.level ? `level-${set.level}` : identifierSlug(set.key))
      const setTitle = setGuide?.title
        ?? (set.level ? levelTitles[set.level] : undefined)
        ?? readableIdentifier(set.key)

      const offers = set.entries.flatMap((definition) => {
        if (definition.discarded) return []

        const costs = [
          definition.data.wants,
          ...asArray(definition.data.additional_wants)
        ].map((value) => {
          const stack = parseStack(value)
          if (!stack) {
            throw new Error(`Не удалось прочитать цену ${definition.id}`)
          }
          return {
            stack,
            title: displayTitle(stack, items)
          }
        })
        const destination = explorationMapDestination(definition.data)
        const resultValue = mapResultValue(
          definition.data,
          translateText,
          destination,
          destination ? guides.mapDestinations[destination] : undefined
        )
        const resultStack = parseStack(resultValue)
        if (!resultStack) {
          throw new Error(`Не удалось прочитать результат ${definition.id}`)
        }
        const maxUses = asFiniteNumber(definition.data.max_uses)
        if (maxUses === undefined) {
          throw new Error(`Не удалось прочитать лимит обменов ${definition.id}`)
        }
        const anchor = uniqueAnchor(
          identifierSlug(definition.id.split('/').at(-1) ?? definition.id),
          usedAnchors
        )
        const details = [
          ...resultDetails(resultStack),
          ...(destination
            ? [`Карта ведёт к месту: ${guides.mapDestinations[destination] ?? readableIdentifier(destination)}`]
            : [])
        ]
        const offer: TradeOfferView = {
          id: definition.id,
          anchor,
          traderId,
          traderSlug: slug,
          traderTitle: guide.title,
          setId: set.id,
          setTitle,
          level: set.level,
          costs,
          result: {
            stack: resultStack,
            title: displayTitle(resultStack, items)
          },
          maxUses,
          conditions: tradeConditions(definition.data, guides),
          details,
          to: `/traders/${slug}#${anchor}`,
          sourcePath: definition.sourcePath
        }
        return [offer]
      })

      return {
        id: set.id,
        anchor: setAnchor,
        title: setTitle,
        level: set.level,
        amount: set.amount,
        poolSize: set.entries.length,
        hiddenOfferCount: set.entries.filter(entry => entry.discarded).length,
        offers,
        sourcePath: set.sourcePath
      }
    })
    const jobSiteStack = guide.jobSite
      ? parseStack({ id: guide.jobSite.id, count: 1 })
      : undefined
    if (guide.jobSite && !jobSiteStack) {
      throw new Error(`Не удалось прочитать рабочее место ${guide.jobSite.id}`)
    }

    traders.push({
      id: traderId,
      slug,
      title: guide.title,
      vanillaTitle: guide.vanillaTitle,
      summary: guide.summary,
      priority: guide.priority,
      jobSite: guide.jobSite && jobSiteStack
        ? {
            id: guide.jobSite.id,
            title: guide.jobSite.title,
            stack: jobSiteStack
          }
        : undefined,
      offerCount: traderSets.reduce((count, set) => count + set.offers.length, 0),
      sets: traderSets,
      sourcePaths: [
        ...new Set(traderSets.flatMap(set => [
          set.sourcePath,
          ...set.offers.map(offer => offer.sourcePath)
        ]))
      ].sort()
    })
  }

  return traders.sort((left, right) => left.title.localeCompare(right.title, 'ru'))
}

function mapResultValue(
  data: JsonObject,
  translateText: (value: unknown) => string,
  destination?: string,
  destinationTitle?: string
): unknown {
  if (!destination || !isObject(data.gives)) {
    return data.gives
  }

  const nameModifier = asObjectArray(data.given_item_modifiers)
    .find(modifier => modifier.function === 'minecraft:set_name')
  const translatedName = destinationTitle
    ? `Карта исследователя: ${destinationTitle}`
    : nameModifier
      ? translateText(nameModifier.name)
      : ''
  const components = isObject(data.gives.components)
    ? { ...data.gives.components }
    : {}
  if (translatedName) {
    components['minecraft:item_name'] = { text: translatedName }
  }

  return {
    ...data.gives,
    id: 'minecraft:filled_map',
    components
  }
}

function explorationMapDestination(data: JsonObject): string | undefined {
  const modifier = asObjectArray(data.given_item_modifiers)
    .find(candidate => candidate.function === 'minecraft:exploration_map')
  return modifier && typeof modifier.destination === 'string'
    ? modifier.destination
    : undefined
}

function tradeConditions(
  data: JsonObject,
  guides: TraderGuideRegistry
): string[] {
  const predicate = isObject(data.merchant_predicate)
    ? data.merchant_predicate
    : undefined
  const location = predicate && isObject(predicate.predicate)
    ? predicate.predicate
    : undefined
  const biomes = location && typeof location.biomes === 'string'
    ? location.biomes
    : undefined
  if (!biomes) return []

  return [
    guides.biomeConditions[biomes]
      ?? 'Предложение зависит от биома, в котором находится торговец'
  ]
}

function uniqueAnchor(candidate: string, used: Set<string>): string {
  let anchor = candidate
  let suffix = 2
  while (used.has(anchor)) {
    anchor = `${candidate}-${suffix}`
    suffix += 1
  }
  used.add(anchor)
  return anchor
}

function identifierSlug(value: string): string {
  return value
    .toLocaleLowerCase('en-US')
    .replaceAll('_', '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

function readableIdentifier(value: string): string {
  const path = value.includes(':') ? value.split(':', 2)[1] : value
  return path
    .replaceAll('_', ' ')
    .replaceAll('/', ' ')
    .replace(/^\p{Ll}/u, letter => letter.toLocaleUpperCase('ru-RU'))
}
