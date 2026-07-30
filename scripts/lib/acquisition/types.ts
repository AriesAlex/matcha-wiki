import type {
  AcquisitionChannel,
  AcquisitionKind,
  AcquisitionNote,
  AcquisitionQuantity
} from '../../../app/types/acquisition'
import type {
  IngredientGlossaryEntry,
  ItemView,
  StackView
} from '../../../app/types/wiki'

export type JsonObject = Record<string, unknown>

export interface LocationGuide {
  id: string
  slug: string
  name: string
  kind: 'structure' | 'archaeology' | 'mixed'
  summary: string
  where: string
  action: string
  aliases?: string[]
  lootTables: Record<string, string>
}

export interface MobGuide {
  slug: string
  name: string
  summary: string
  where: string
  action: string
  aliases?: string[]
}

export interface AcquisitionGuideRegistry {
  schemaVersion: 1
  locations: LocationGuide[]
  mobs: Record<string, MobGuide>
}

export interface AcquisitionRoot {
  sourceId: string
  kind: AcquisitionKind
  tableId: string
  context: string
}

export interface LootStackSeed {
  carrier: string
  components: JsonObject
}

export interface LootOutput {
  seed: LootStackSeed
  quantity: AcquisitionQuantity
  rolls: AcquisitionQuantity
  channel?: AcquisitionChannel
  notes: AcquisitionNote[]
  rootTableId: string
  sourceTableId: string
  visitedTableIds: string[]
}

export interface AcquisitionBuildOptions {
  dataDir: string
  sourceGuidesPath: string
  items: ItemView[]
  ingredientGlossary: Record<string, IngredientGlossaryEntry>
  parseStack: (value: unknown) => StackView | undefined
  vanillaNameForResource: (resource: string) => string | undefined
}
