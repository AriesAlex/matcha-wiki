import { readFileSync } from 'node:fs'
import type {
  AcquisitionGuideRegistry,
  AcquisitionRoot
} from './types'

export function readAcquisitionGuides(path: string): AcquisitionGuideRegistry {
  const value = JSON.parse(readFileSync(path, 'utf8')) as AcquisitionGuideRegistry
  if (value.schemaVersion !== 1) {
    throw new Error(`Неподдерживаемая схема справочника источников: ${value.schemaVersion}`)
  }
  return value
}

export function acquisitionRoots(
  guides: AcquisitionGuideRegistry
): AcquisitionRoot[] {
  const locationRoots = guides.locations.flatMap(location => (
    Object.entries(location.lootTables).map(([tableId, context]) => ({
      sourceId: location.id,
      kind: tableId.includes(':archaeology/') ? 'archaeology' as const : 'chest' as const,
      tableId,
      context
    }))
  ))
  const mobRoots = Object.entries(guides.mobs).map(([entityId]) => {
    const [namespace, path] = splitResource(entityId)
    return {
      sourceId: entityId,
      kind: 'mob' as const,
      tableId: `${namespace}:entities/${path}`,
      context: 'Добыча после победы'
    }
  })

  return [...locationRoots, ...mobRoots]
}

function splitResource(resource: string): [string, string] {
  const separator = resource.indexOf(':')
  return separator === -1
    ? ['minecraft', resource]
    : [resource.slice(0, separator), resource.slice(separator + 1)]
}
