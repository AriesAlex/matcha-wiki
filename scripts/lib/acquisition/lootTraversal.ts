import {
  readFileSync,
  readdirSync
} from 'node:fs'
import {
  extname,
  join,
  relative
} from 'node:path'
import type {
  AcquisitionKind,
  AcquisitionNote,
  AcquisitionQuantity
} from '../../../app/types/acquisition'
import type {
  JsonObject,
  LootOutput,
  LootStackSeed
} from './types'

export interface LoadedLootTables {
  tables: Map<string, JsonObject>
  sourcePaths: Map<string, string>
}

interface WalkState {
  conditions: unknown[]
  outerFunctions: unknown[]
  rolls: AcquisitionQuantity
  visitedTableIds: string[]
}

interface AppliedStack {
  seed: LootStackSeed
  quantity: AcquisitionQuantity
  notes: AcquisitionNote[]
}

export function loadLootTables(dataDir: string): LoadedLootTables {
  const tables = new Map<string, JsonObject>()
  const sourcePaths = new Map<string, string>()

  for (const path of walkJsonFiles(dataDir)) {
    const normalizedPath = normalizePath(relative(dataDir, path))
    const match = normalizedPath.match(/^([^/]+)\/loot_table\/(.+)\.json$/)
    if (!match) continue

    const tableId = `${match[1]}:${match[2]}`
    tables.set(tableId, JSON.parse(readFileSync(path, 'utf8')) as JsonObject)
    sourcePaths.set(tableId, normalizePath(path))
  }

  return { tables, sourcePaths }
}

export function collectLootOutputs(
  tables: Map<string, JsonObject>,
  rootTableId: string,
  rootKind: AcquisitionKind
): LootOutput[] {
  return walkTable(tables, rootTableId, rootKind, {
    conditions: [],
    outerFunctions: [],
    rolls: { min: 1, max: 1 },
    visitedTableIds: []
  }, rootTableId)
}

function walkTable(
  tables: Map<string, JsonObject>,
  tableId: string,
  rootKind: AcquisitionKind,
  state: WalkState,
  rootTableId: string
): LootOutput[] {
  if (state.visitedTableIds.includes(tableId)) {
    return []
  }

  const table = tables.get(tableId)
  if (!table) {
    return []
  }

  const tableFunctions = arrayValue(table.functions)
  const visitedTableIds = [...state.visitedTableIds, tableId]
  const pools = arrayValue(table.pools)

  return pools.flatMap((poolValue) => {
    if (!isObject(poolValue)) return []

    const conditions = [
      ...state.conditions,
      ...arrayValue(poolValue.conditions)
    ]
    if (conditions.some(condition => isImpossibleCondition(condition, rootKind))) {
      return []
    }

    const poolFunctions = arrayValue(poolValue.functions)
    const rolls = multiplyRanges(
      state.rolls,
      numberRange(poolValue.rolls)
    )
    return arrayValue(poolValue.entries).flatMap(entry => walkEntry(
      tables,
      entry,
      rootKind,
      {
        conditions,
        outerFunctions: [
          ...poolFunctions,
          ...tableFunctions,
          ...state.outerFunctions
        ],
        rolls,
        visitedTableIds
      },
      rootTableId,
      tableId
    ))
  })
}

function walkEntry(
  tables: Map<string, JsonObject>,
  entryValue: unknown,
  rootKind: AcquisitionKind,
  state: WalkState,
  rootTableId: string,
  sourceTableId: string
): LootOutput[] {
  if (!isObject(entryValue)) return []

  const conditions = [
    ...state.conditions,
    ...arrayValue(entryValue.conditions)
  ]
  if (conditions.some(condition => isImpossibleCondition(condition, rootKind))) {
    return []
  }

  const entryFunctions = arrayValue(entryValue.functions)
  const type = normalizeResourceId(entryValue.type)
  if (type === 'minecraft:item') {
    const carrier = normalizeResourceId(entryValue.name)
    if (!carrier) return []

    const applied = applyFunctions(
      { carrier, components: {} },
      [...entryFunctions, ...state.outerFunctions]
    )
    return [{
      seed: applied.seed,
      quantity: applied.quantity,
      rolls: state.rolls,
      channel: lootChannel(rootTableId, state.visitedTableIds),
      notes: dedupeNotes([
        ...conditions.flatMap(describeCondition),
        ...applied.notes
      ]),
      rootTableId,
      sourceTableId,
      visitedTableIds: state.visitedTableIds
    }]
  }

  if (type === 'minecraft:loot_table') {
    const tableId = normalizeResourceId(entryValue.value ?? entryValue.name)
    if (!tableId) return []

    return walkTable(tables, tableId, rootKind, {
      conditions,
      outerFunctions: [...entryFunctions, ...state.outerFunctions],
      rolls: state.rolls,
      visitedTableIds: state.visitedTableIds
    }, rootTableId)
  }

  if (
    type === 'minecraft:alternatives'
    || type === 'minecraft:group'
    || type === 'minecraft:sequence'
  ) {
    return arrayValue(entryValue.children).flatMap(child => walkEntry(
      tables,
      child,
      rootKind,
      {
        conditions,
        outerFunctions: [...entryFunctions, ...state.outerFunctions],
        rolls: state.rolls,
        visitedTableIds: state.visitedTableIds
      },
      rootTableId,
      sourceTableId
    ))
  }

  return []
}

function applyFunctions(
  initial: LootStackSeed,
  functions: unknown[]
): AppliedStack {
  const seed: LootStackSeed = {
    carrier: initial.carrier,
    components: { ...initial.components }
  }
  let quantity: AcquisitionQuantity = { min: 1, max: 1 }
  const notes: AcquisitionNote[] = []

  for (const functionValue of functions) {
    if (!isObject(functionValue)) continue

    const id = normalizeResourceId(functionValue.function)
    if (id === 'minecraft:set_components' && isObject(functionValue.components)) {
      Object.assign(seed.components, functionValue.components)
      continue
    }

    if (id === 'minecraft:set_count') {
      const next = numberRange(functionValue.count)
      quantity = functionValue.add === true
        ? {
            min: quantity.min + next.min,
            max: quantity.max + next.max
          }
        : next
      continue
    }

    if (id === 'minecraft:set_name' && functionValue.name !== undefined) {
      seed.components['minecraft:custom_name'] = functionValue.name
      continue
    }

    if (id === 'minecraft:set_lore' && Array.isArray(functionValue.lore)) {
      seed.components['minecraft:lore'] = functionValue.lore
      continue
    }

    if (id === 'minecraft:set_enchantments' && isObject(functionValue.enchantments)) {
      seed.components['minecraft:enchantments'] = functionValue.enchantments
      continue
    }

    if (id === 'minecraft:set_damage' && functionValue.damage !== undefined) {
      seed.components['minecraft:damage'] = functionValue.damage
      continue
    }

    if (id === 'minecraft:set_potion' && typeof functionValue.id === 'string') {
      seed.components['minecraft:potion_contents'] = {
        potion: normalizeResourceId(functionValue.id)
      }
      continue
    }

    if (id === 'minecraft:enchanted_count_increase') {
      notes.push({
        kind: 'bonus',
        text: 'Чары «Добыча» могут увеличить количество.'
      })
    }
  }

  return { seed, quantity, notes }
}

function describeCondition(value: unknown): AcquisitionNote[] {
  if (!isObject(value)) return []

  const id = normalizeResourceId(value.condition)
  if (id === 'minecraft:killed_by_player') {
    return [{
      kind: 'requirement',
      text: 'Выпадет, только если убьёте моба сами.'
    }]
  }
  if (id === 'minecraft:random_chance_with_enchanted_bonus') {
    return [{
      kind: 'bonus',
      text: 'Чары «Добыча» повышают шанс.'
    }]
  }
  if (id === 'minecraft:random_chance' || id === 'minecraft:table_bonus') {
    return [{
      kind: 'uncertainty',
      text: 'Выпадает не каждый раз.'
    }]
  }
  if (id === 'minecraft:location_check') {
    const biomes = biomeNames(value.predicate)
    return biomes.length
      ? [{
          kind: 'requirement',
          text: `Этот путь работает только здесь: ${formatList(biomes)}.`
        }]
      : [{
          kind: 'requirement',
          text: 'Для этой находки важно место.'
        }]
  }
  if (id === 'minecraft:entity_properties' && hasFishingHookPredicate(value)) {
    return [{
      kind: 'requirement',
      text: 'Для этого пути нужна открытая вода.'
    }]
  }
  if (id === 'minecraft:match_tool') {
    return [{
      kind: 'requirement',
      text: 'Нужен подходящий инструмент.'
    }]
  }
  if (id === 'minecraft:any_of') {
    return arrayValue(value.terms).flatMap(describeCondition)
  }
  if (id === 'minecraft:inverted') {
    return [{
      kind: 'uncertainty',
      text: 'Есть дополнительное игровое условие.'
    }]
  }
  if (id) {
    return [{
      kind: 'uncertainty',
      text: 'Есть дополнительное игровое условие.'
    }]
  }
  return []
}

function isImpossibleCondition(
  value: unknown,
  rootKind: AcquisitionKind
): boolean {
  if (!isObject(value)) return false

  const id = normalizeResourceId(value.condition)
  if (
    id === 'minecraft:entity_properties'
    && hasFishingHookPredicate(value)
  ) {
    return true
  }
  if (id === 'minecraft:any_of') {
    const terms = arrayValue(value.terms)
    return terms.length > 0
      && terms.every(term => isImpossibleCondition(term, rootKind))
  }
  return false
}

function hasFishingHookPredicate(value: JsonObject): boolean {
  if (value.entity !== 'this' || !isObject(value.predicate)) {
    return false
  }
  return isObject(value.predicate['minecraft:type_specific/fishing_hook'])
}

function biomeNames(value: unknown): string[] {
  if (!isObject(value)) return []
  const rawBiomes = value.biomes
  const biomes = Array.isArray(rawBiomes) ? rawBiomes : [rawBiomes]
  return biomes.flatMap((biome) => {
    if (typeof biome !== 'string') return []
    const normalized = biome.replace(/^#?minecraft:/, '')
    return [biomeLabels[normalized] ?? normalized
      .replaceAll('_', ' ')
      .replace(/^./, letter => letter.toLocaleUpperCase('ru-RU'))]
  })
}

const biomeLabels: Record<string, string> = {
  deep_dark: 'глубинная тьма',
  dripstone_caves: 'карстовые пещеры',
  freshwater_cold: 'холодные пресные воды',
  freshwater_cool: 'прохладные пресные воды',
  freshwater_hot_dry: 'жаркие сухие пресные воды',
  freshwater_hot_wet: 'жаркие влажные пресные воды',
  freshwater_temperate: 'умеренные пресные воды',
  lush_caves: 'пышные пещеры',
  mangrove_swamp: 'мангровые болота',
  pale_garden: 'бледный сад',
  saltwater_cold: 'холодный океан',
  saltwater_cool: 'прохладный океан',
  saltwater_hot: 'жаркий океан',
  saltwater_temperate: 'умеренный океан',
  saltwater_warm: 'тёплый океан',
  sulfur_caves: 'серные пещеры',
  swamp: 'болота',
  swamps: 'болота'
}

function numberRange(value: unknown): AcquisitionQuantity {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const count = Math.max(0, Math.floor(value))
    return { min: count, max: count }
  }
  if (!isObject(value)) {
    return { min: 1, max: 1 }
  }

  const min = finiteNumber(value.min) ?? finiteNumber(value.value) ?? 1
  const max = finiteNumber(value.max) ?? min
  return {
    min: Math.max(0, Math.floor(Math.min(min, max))),
    max: Math.max(0, Math.floor(Math.max(min, max)))
  }
}

function multiplyRanges(
  left: AcquisitionQuantity,
  right: AcquisitionQuantity
): AcquisitionQuantity {
  return {
    min: left.min * right.min,
    max: left.max * right.max
  }
}

function lootChannel(
  rootTableId: string,
  visitedTableIds: string[]
): LootOutput['channel'] {
  const usesFishingTable = visitedTableIds.some(tableId => (
    isFishingTableId(tableId)
  ))
  if (!usesFishingTable) return undefined

  return isFishingTableId(rootTableId)
    ? 'fishing'
    : 'fishing_table'
}

function isFishingTableId(tableId: string): boolean {
  return tableId === 'minecraft:gameplay/fishing'
    || tableId.startsWith('minecraft:gameplay/fishing/')
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined
}

function dedupeNotes(notes: AcquisitionNote[]): AcquisitionNote[] {
  return [...new Map(notes.map(note => [`${note.kind}:${note.text}`, note])).values()]
}

function formatList(values: string[]): string {
  if (values.length < 2) return values[0] ?? ''
  return `${values.slice(0, -1).join(', ')} и ${values.at(-1)}`
}

function normalizeResourceId(value: unknown): string {
  if (typeof value !== 'string' || !value) return ''
  return value.includes(':') ? value : `minecraft:${value}`
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function walkJsonFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap(entry => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return walkJsonFiles(path)
      return extname(path) === '.json' ? [path] : []
    })
}

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/')
}
