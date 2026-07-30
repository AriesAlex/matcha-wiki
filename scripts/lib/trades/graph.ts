import { existsSync } from 'node:fs'
import {
  relative,
  resolve
} from 'node:path'
import {
  asFiniteNumber,
  asObjectArray,
  isObject,
  namespaceDirectories,
  normalizePath,
  normalizeResource,
  readJson,
  splitResource,
  walkJsonFiles
} from './json'
import type {
  ActiveTradeDefinition,
  ActiveTradeGraph,
  ActiveTradeSet,
  LoadActiveTradeGraphOptions
} from './types'

export function loadActiveTradeGraph({
  dataDir,
  rootDir
}: LoadActiveTradeGraphOptions): ActiveTradeGraph {
  const definitions = loadTradeDefinitions(dataDir, rootDir)
  const referencedTradeIds = new Set<string>()
  const sets: ActiveTradeSet[] = []

  for (const namespaceDir of namespaceDirectories(dataDir)) {
    const namespace = namespaceDir.name
    const setDir = resolve(namespaceDir.path, 'trade_set')
    for (const path of walkJsonFiles(setDir)) {
      const sourcePath = normalizePath(relative(rootDir, path))
      const relativePath = normalizePath(relative(setDir, path)).replace(/\.json$/, '')
      const [profession, ...keyParts] = relativePath.split('/')
      const key = keyParts.join('/')
      const data = readJson(path)
      const amount = asFiniteNumber(data.amount)
      const tradeReference = typeof data.trades === 'string' ? data.trades : undefined
      if (!profession || !key || amount === undefined || !tradeReference) {
        throw new Error(`Некорректный набор торговли: ${sourcePath}`)
      }

      const resolved = resolveTradeReference(
        dataDir,
        rootDir,
        tradeReference,
        namespace
      )
      assertUniqueTrades(sourcePath, resolved.ids)

      const entries = resolved.ids.map((id) => {
        const definition = definitions.get(id)
        if (!definition) {
          throw new Error(`${sourcePath} ссылается на отсутствующую сделку ${id}`)
        }
        referencedTradeIds.add(id)
        return definition
      })
      const levelMatch = key.match(/^level_(\d+)$/)

      sets.push({
        id: `${namespace}:${relativePath}`,
        profession,
        key,
        level: levelMatch ? Number(levelMatch[1]) : undefined,
        amount,
        sourcePath,
        tagSourcePath: resolved.sourcePath,
        entries
      })
    }
  }

  sets.sort(compareTradeSets)
  const referenced = [...referencedTradeIds].sort()
  const orphanTradeIds = [...definitions.keys()]
    .filter(id => !referencedTradeIds.has(id))
    .sort()

  return {
    sets,
    definitionCount: definitions.size,
    referencedTradeIds: referenced,
    orphanTradeIds
  }
}

function loadTradeDefinitions(
  dataDir: string,
  rootDir: string
): Map<string, ActiveTradeDefinition> {
  const definitions = new Map<string, ActiveTradeDefinition>()

  for (const namespaceDir of namespaceDirectories(dataDir)) {
    const tradeDir = resolve(namespaceDir.path, 'villager_trade')
    for (const path of walkJsonFiles(tradeDir)) {
      const relativePath = normalizePath(relative(tradeDir, path)).replace(/\.json$/, '')
      const id = `${namespaceDir.name}:${relativePath}`
      if (definitions.has(id)) {
        throw new Error(`Повторное определение сделки ${id}`)
      }
      const data = readJson(path)
      definitions.set(id, {
        id,
        sourcePath: normalizePath(relative(rootDir, path)),
        data,
        discarded: hasDirectDiscardModifier(data)
      })
    }
  }

  return definitions
}

function resolveTradeReference(
  dataDir: string,
  rootDir: string,
  reference: string,
  defaultNamespace: string
): { ids: string[], sourcePath: string } {
  if (!reference.startsWith('#')) {
    return {
      ids: [normalizeResource(reference, defaultNamespace)],
      sourcePath: ''
    }
  }

  const visited = new Set<string>()
  const sourcePaths = new Set<string>()
  const visit = (tagReference: string): string[] => {
    const tagId = normalizeResource(tagReference.replace(/^#/, ''), defaultNamespace)
    if (visited.has(tagId)) {
      throw new Error(`Циклический тег торговли: ${tagId}`)
    }
    visited.add(tagId)

    const [namespace, tagPath] = splitResource(tagId)
    const path = resolve(dataDir, namespace, 'tags/villager_trade', `${tagPath}.json`)
    if (!existsSync(path)) {
      throw new Error(`Не найден тег торговли ${tagId}`)
    }
    sourcePaths.add(normalizePath(relative(rootDir, path)))
    const data = readJson(path)
    if (!Array.isArray(data.values)) {
      throw new Error(`Тег торговли ${tagId} не содержит values`)
    }

    const ids: string[] = []
    for (const rawValue of data.values) {
      const value = typeof rawValue === 'string'
        ? rawValue
        : isObject(rawValue) && typeof rawValue.id === 'string'
          ? rawValue.id
          : undefined
      const required = !isObject(rawValue) || rawValue.required !== false
      if (!value) {
        if (required) throw new Error(`Некорректное значение в теге ${tagId}`)
        continue
      }
      if (value.startsWith('#')) {
        ids.push(...visit(value))
      } else {
        ids.push(normalizeResource(value, namespace))
      }
    }

    visited.delete(tagId)
    return ids
  }

  return {
    ids: visit(reference),
    sourcePath: [...sourcePaths].sort().join(', ')
  }
}

function assertUniqueTrades(sourcePath: string, ids: string[]): void {
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
  if (duplicates.length) {
    throw new Error(
      `${sourcePath} повторяет сделки: ${[...new Set(duplicates)].join(', ')}`
    )
  }
}

function hasDirectDiscardModifier(data: ActiveTradeDefinition['data']): boolean {
  return asObjectArray(data.given_item_modifiers)
    .some(modifier => modifier.function === 'minecraft:discard')
}

function compareTradeSets(left: ActiveTradeSet, right: ActiveTradeSet): number {
  const professionOrder = left.profession.localeCompare(right.profession)
  if (professionOrder) return professionOrder
  if (left.level !== undefined || right.level !== undefined) {
    return (left.level ?? Number.MAX_SAFE_INTEGER)
      - (right.level ?? Number.MAX_SAFE_INTEGER)
  }
  return left.key.localeCompare(right.key)
}
