import {
  existsSync,
  readFileSync,
  readdirSync
} from 'node:fs'
import {
  extname,
  resolve
} from 'node:path'
import type { JsonObject } from './types'

export function normalizeResource(
  value: string,
  defaultNamespace: string
): string {
  return value.includes(':') ? value : `${defaultNamespace}:${value}`
}

export function splitResource(value: string): [string, string] {
  const [namespace, path] = value.split(':', 2)
  if (!namespace || !path) {
    throw new Error(`Некорректный resource ID: ${value}`)
  }
  return [namespace, path]
}

export function namespaceDirectories(
  dataDir: string
): Array<{ name: string, path: string }> {
  if (!existsSync(dataDir)) return []
  return readdirSync(dataDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => ({
      name: entry.name,
      path: resolve(dataDir, entry.name)
    }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

export function walkJsonFiles(directory: string): string[] {
  if (!existsSync(directory)) return []
  const result: string[] = []
  const visit = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))) {
      const path = resolve(current, entry.name)
      if (entry.isDirectory()) visit(path)
      else if (entry.isFile() && extname(entry.name) === '.json') result.push(path)
    }
  }
  visit(directory)
  return result
}

export function readJson(path: string): JsonObject {
  return JSON.parse(readFileSync(path, 'utf8')) as JsonObject
}

export function normalizePath(path: string): string {
  return path.replaceAll('\\', '/')
}

export function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined
}

export function asArray(value: unknown): unknown[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

export function asObjectArray(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.filter(isObject) : []
}

export function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
