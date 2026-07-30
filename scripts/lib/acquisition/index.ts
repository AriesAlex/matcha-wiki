import { createHash } from 'node:crypto'
import { relative } from 'node:path'
import type {
  AcquisitionCatalog,
  AcquisitionLocation,
  AcquisitionMethod,
  AcquisitionMob,
  AcquisitionNote,
  AcquisitionQuantity,
  AcquisitionTarget
} from '../../../app/types/acquisition'
import {
  collectLootOutputs,
  loadLootTables
} from './lootTraversal'
import { acquisitionTargetFor } from './stackIdentity'
import {
  acquisitionRoots,
  readAcquisitionGuides
} from './sourceGuides'
import { assignAcquisitionTargetSlugs } from './targetRoutes'
import type { AcquisitionBuildOptions } from './types'

export function buildAcquisitionCatalog(
  options: AcquisitionBuildOptions
): AcquisitionCatalog {
  const guides = readAcquisitionGuides(options.sourceGuidesPath)
  const roots = acquisitionRoots(guides)
  const loaded = loadLootTables(options.dataDir)
  const targets = new Map<string, AcquisitionTarget>()
  const methods = new Map<string, AcquisitionMethod>()

  for (const root of roots) {
    if (!loaded.tables.has(root.tableId)) {
      throw new Error(`Не найдена подтверждённая таблица добычи: ${root.tableId}`)
    }

    const sourceGuide = root.kind === 'mob'
      ? guides.mobs[root.sourceId]
      : guides.locations.find(location => location.id === root.sourceId)
    if (!sourceGuide) {
      throw new Error(`Не найдено описание источника добычи: ${root.sourceId}`)
    }

    for (const output of collectLootOutputs(loaded.tables, root.tableId, root.kind)) {
      const target = acquisitionTargetFor(output, options)
      if (!target || output.quantity.max < 1) continue

      targets.set(target.id, target)
      const quantity = visibleQuantity(output.quantity)
      const rolls = visibleRolls(output.rolls)
      const notes = visibleNotes(output.notes, output.quantity)
      const sourcePath = loaded.sourcePaths.get(root.tableId)
      const methodSeed = {
        sourceId: root.sourceId,
        targetId: target.id,
        kind: root.kind,
        channel: output.channel,
        context: root.context,
        quantity,
        rolls,
        notes
      }
      const methodId = `method:${shortHash(JSON.stringify(methodSeed))}`
      methods.set(methodId, {
        id: methodId,
        sourceId: root.sourceId,
        targetId: target.id,
        kind: root.kind,
        channel: methodSeed.channel,
        context: root.context,
        action: sourceGuide.action,
        quantity,
        rolls,
        notes,
        sourcePath: sourcePath
          ? `pack/data/${normalizePath(relative(options.dataDir, sourcePath))}`
          : `pack/data/${tablePath(root.tableId)}`
      })
    }
  }

  const methodList = [...methods.values()].sort(compareMethods)
  const usedTargetIds = new Set(methodList.map(method => method.targetId))
  const targetList = [...targets.values()]
    .filter(target => usedTargetIds.has(target.id))
    .sort((left, right) => left.stack.name.localeCompare(right.stack.name, 'ru'))
  return {
    targets: assignAcquisitionTargetSlugs(
      targetList,
      options.items.map(item => item.slug)
    ),
    methods: methodList,
    locations: buildLocations(guides.locations, methodList),
    mobs: buildMobs(guides.mobs, methodList)
  }
}

function buildLocations(
  guides: ReturnType<typeof readAcquisitionGuides>['locations'],
  methods: AcquisitionMethod[]
): AcquisitionLocation[] {
  return guides.flatMap((guide) => {
    const methodIds = methods
      .filter(method => method.sourceId === guide.id)
      .map(method => method.id)
    if (!methodIds.length) return []

    return [{
      id: guide.id,
      slug: guide.slug,
      name: guide.name,
      kind: guide.kind,
      summary: guide.summary,
      where: guide.where,
      action: guide.action,
      aliases: guide.aliases ?? [],
      methodIds
    }]
  }).sort((left, right) => left.name.localeCompare(right.name, 'ru'))
}

function buildMobs(
  guides: ReturnType<typeof readAcquisitionGuides>['mobs'],
  methods: AcquisitionMethod[]
): AcquisitionMob[] {
  return Object.entries(guides).flatMap(([id, guide]) => {
    const methodIds = methods
      .filter(method => method.sourceId === id)
      .map(method => method.id)
    if (!methodIds.length) return []

    return [{
      id,
      slug: guide.slug,
      name: guide.name,
      summary: guide.summary,
      where: guide.where,
      action: guide.action,
      aliases: guide.aliases ?? [],
      methodIds
    }]
  }).sort((left, right) => left.name.localeCompare(right.name, 'ru'))
}

function visibleQuantity(quantity: AcquisitionQuantity): AcquisitionQuantity {
  return {
    min: Math.max(1, quantity.min),
    max: Math.max(1, quantity.max)
  }
}

function visibleRolls(
  rolls: AcquisitionQuantity
): AcquisitionQuantity | undefined {
  return rolls.min === 1 && rolls.max === 1
    ? undefined
    : rolls
}

function visibleNotes(
  notes: AcquisitionNote[],
  quantity: AcquisitionQuantity
): AcquisitionNote[] {
  const visible = quantity.min === 0
    ? [...notes, {
        kind: 'uncertainty' as const,
        text: 'Выпадает не каждый раз.'
      }]
    : notes
  return [...new Map(visible.map(note => [`${note.kind}:${note.text}`, note])).values()]
}

function compareMethods(
  left: AcquisitionMethod,
  right: AcquisitionMethod
): number {
  return left.sourceId.localeCompare(right.sourceId, 'en')
    || left.context.localeCompare(right.context, 'ru')
    || left.targetId.localeCompare(right.targetId, 'en')
}

function shortHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

function tablePath(tableId: string): string {
  const [namespace, path] = tableId.split(':', 2)
  return `${namespace}/loot_table/${path}.json`
}

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/')
}
