import type { ItemGuide, StackView } from './wiki'

export type AcquisitionKind = 'chest' | 'archaeology' | 'mob'
export type AcquisitionChannel = 'fishing' | 'fishing_table'

export type AcquisitionNoteKind =
  | 'requirement'
  | 'bonus'
  | 'uncertainty'

export interface AcquisitionNote {
  kind: AcquisitionNoteKind
  text: string
}

export interface AcquisitionQuantity {
  min: number
  max: number
}

export interface AcquisitionTarget {
  id: string
  slug: string
  title: string
  stack: StackView
  vanillaName?: string
  itemSlug?: string
  guide?: ItemGuide
}

export interface AcquisitionMethod {
  id: string
  sourceId: string
  targetId: string
  kind: AcquisitionKind
  channel?: AcquisitionChannel
  context: string
  action: string
  quantity: AcquisitionQuantity
  rolls?: AcquisitionQuantity
  notes: AcquisitionNote[]
  sourcePath: string
}

export interface AcquisitionLocation {
  id: string
  slug: string
  name: string
  kind: 'structure' | 'archaeology' | 'mixed'
  summary: string
  where: string
  action: string
  aliases: string[]
  methodIds: string[]
}

export interface AcquisitionMob {
  id: string
  slug: string
  name: string
  summary: string
  where: string
  action: string
  aliases: string[]
  methodIds: string[]
}

export interface AcquisitionCatalog {
  targets: AcquisitionTarget[]
  methods: AcquisitionMethod[]
  locations: AcquisitionLocation[]
  mobs: AcquisitionMob[]
}
