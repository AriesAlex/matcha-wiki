import type {
  AcquisitionCatalog,
  AcquisitionLocation,
  AcquisitionMethod,
  AcquisitionMob,
  AcquisitionTarget
} from '../types/acquisition'
import type { StackView } from '../types/wiki'

export interface ResolvedAcquisitionMethod {
  method: AcquisitionMethod
  target: AcquisitionTarget
  source: AcquisitionLocation | AcquisitionMob
  sourcePath: string
}

export function acquisitionMethodsForItemSlug(
  acquisition: AcquisitionCatalog,
  itemSlug: string
): ResolvedAcquisitionMethod[] {
  const targetIds = new Set(acquisition.targets
    .filter(target => target.itemSlug === itemSlug)
    .map(target => target.id))

  return acquisition.methods.flatMap((method) => {
    if (!targetIds.has(method.targetId)) return []
    const target = acquisition.targets.find(entry => entry.id === method.targetId)
    const resolved = acquisitionSourceForMethod(acquisition, method)
    if (!target || !resolved) return []

    return [{
      method,
      target,
      ...resolved
    }]
  })
}

export function acquisitionMethodsForTarget(
  acquisition: AcquisitionCatalog,
  targetId: string
): ResolvedAcquisitionMethod[] {
  const target = acquisition.targets.find(entry => entry.id === targetId)
  if (!target) return []

  return acquisition.methods.flatMap((method) => {
    if (method.targetId !== targetId) return []
    const resolved = acquisitionSourceForMethod(acquisition, method)
    if (!resolved) return []

    return [{
      method,
      target,
      ...resolved
    }]
  })
}

export function acquisitionTargetForSlug(
  acquisition: AcquisitionCatalog,
  slug: string
): AcquisitionTarget | undefined {
  return acquisition.targets.find(target => (
    !target.itemSlug && target.slug === slug
  ))
}

export function acquisitionTargetPath(target: AcquisitionTarget): string {
  return `/items/${target.slug}`
}

export function resolveAcquisitionTargetForStack(
  acquisition: AcquisitionCatalog,
  stack: StackView
): AcquisitionTarget | undefined {
  const candidates = acquisition.targets.filter(target => (
    target.stack.carrier === stack.carrier
    && target.stack.model === stack.model
    && canonicalString(target.stack.components ?? {})
      === canonicalString(stack.components ?? {})
  ))
  if (candidates.length === 1) return candidates[0]

  const normalizedName = normalizeName(stack.name)
  const named = candidates.filter(target => (
    normalizeName(target.stack.name) === normalizedName
  ))
  return named.length === 1 ? named[0] : undefined
}

export function acquisitionSourceForMethod(
  acquisition: AcquisitionCatalog,
  method: AcquisitionMethod
): {
    source: AcquisitionLocation | AcquisitionMob
    sourcePath: string
  } | undefined {
  const mob = acquisition.mobs.find(source => source.id === method.sourceId)
  if (mob) {
    return {
      source: mob,
      sourcePath: `/mobs/${mob.slug}`
    }
  }

  const location = acquisition.locations.find(source => (
    source.id === method.sourceId
  ))
  return location
    ? {
        source: location,
        sourcePath: `/locations/${location.slug}`
      }
    : undefined
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
