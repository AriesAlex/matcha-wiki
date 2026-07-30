import type {
  ItemView,
  StackView
} from '../../../app/types/wiki'

export type JsonObject = Record<string, unknown>

export interface TraderGuideRegistry {
  schemaVersion: 1
  traders: Record<string, {
    title: string
    vanillaTitle?: string
    summary: string
    priority: string
    jobSite?: {
      id: string
      title: string
    }
  }>
  tradeSets: Record<string, {
    title: string
    anchor: string
  }>
  biomeConditions: Record<string, string>
  mapDestinations: Record<string, string>
}

export interface ActiveTradeDefinition {
  id: string
  sourcePath: string
  data: JsonObject
  discarded: boolean
}

export interface ActiveTradeSet {
  id: string
  profession: string
  key: string
  level?: number
  amount: number
  sourcePath: string
  tagSourcePath: string
  entries: ActiveTradeDefinition[]
}

export interface ActiveTradeGraph {
  sets: ActiveTradeSet[]
  definitionCount: number
  referencedTradeIds: string[]
  orphanTradeIds: string[]
}

export interface BuildTraderViewsOptions {
  graph: ActiveTradeGraph
  guides: TraderGuideRegistry
  items: ItemView[]
  parseStack: (value: unknown) => StackView | undefined
  displayTitle: (stack: StackView, items: ItemView[]) => string
  resultDetails: (stack: StackView) => string[]
  translateText: (value: unknown) => string
}

export interface LoadActiveTradeGraphOptions {
  dataDir: string
  rootDir: string
}
