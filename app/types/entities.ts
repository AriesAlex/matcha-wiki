import type {
  ItemRelationStackView,
  StackView
} from './wiki'

export interface TraderJobSiteView {
  id: string
  title: string
  stack: StackView
}

export interface TradeOfferView {
  id: string
  anchor: string
  traderId: string
  traderSlug: string
  traderTitle: string
  setId: string
  setTitle: string
  level?: number
  costs: ItemRelationStackView[]
  result: ItemRelationStackView
  maxUses: number
  conditions: string[]
  details: string[]
  to: string
  sourcePath: string
}

export interface TradeSetView {
  id: string
  anchor: string
  title: string
  level?: number
  amount: number
  poolSize: number
  hiddenOfferCount: number
  offers: TradeOfferView[]
  sourcePath: string
}

export interface TraderView {
  id: string
  slug: string
  title: string
  vanillaTitle?: string
  summary: string
  priority: string
  jobSite?: TraderJobSiteView
  offerCount: number
  sets: TradeSetView[]
  sourcePaths: string[]
}

export function allTradeOffers(traders?: TraderView[]): TradeOfferView[] {
  return (traders ?? []).flatMap(
    trader => trader.sets.flatMap(set => set.offers)
  )
}
